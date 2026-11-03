import { randomUUID } from "node:crypto"
import { WebSocket, type RawData, type WebSocketServer } from "ws"
import type { ChatMessage, ErrorCode, ServerMessage } from "./types"

const MAX_HISTORY = 100
const MAX_NICKNAME_LENGTH = 20
const MAX_TEXT_LENGTH = 500

type ClientState = {
  nickname: string | null
}

// Data coming from the client is not trusted yet: every field is validated
// when handled. That is why it is typed as `unknown` and not `ClientMessage`.
type Incoming = {
  type?: unknown
  nickname?: unknown
  text?: unknown
}

type ChatOptions = {
  allowedOrigins: string[]
}

/**
 * Registers the chat domain on top of an existing WebSocketServer.
 *
 * Owns the in-memory history, the socket -> user map, and the join/message/
 * presence handlers. Transport concerns (heartbeat, shutdown) live in
 * server.ts so this module stays focused on application behavior.
 */
export function attachChat(
  wss: WebSocketServer,
  { allowedOrigins }: ChatOptions
) {
  const history: ChatMessage[] = []
  // Socket -> application state (nickname, etc.). `wss.clients` knows about
  // sockets; this Map knows about users.
  const clients = new Map<WebSocket, ClientState>()

  function send(ws: WebSocket, payload: ServerMessage) {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload))
  }

  function broadcast(payload: ServerMessage) {
    // Serialize once and reuse the same string for every recipient.
    const frame = JSON.stringify(payload)
    for (const ws of wss.clients) {
      if (ws.readyState === WebSocket.OPEN) ws.send(frame)
    }
  }

  // Only sockets that completed `join` count as users.
  function users(): string[] {
    const names: string[] = []
    for (const state of clients.values()) {
      if (state.nickname) names.push(state.nickname)
    }
    return names
  }

  function broadcastUsers() {
    broadcast({ type: "users", users: users() })
  }

  function fail(ws: WebSocket, code: ErrorCode, message: string) {
    send(ws, { type: "error", code, message })
  }

  // Nicknames are unique case-insensitively: "Ana" and "ana" collide.
  function nicknameTaken(nickname: string): boolean {
    const wanted = nickname.toLowerCase()
    return users().some((user) => user.toLowerCase() === wanted)
  }

  function handleJoin(ws: WebSocket, state: ClientState, incoming: Incoming) {
    if (state.nickname) {
      return fail(ws, "ALREADY_JOINED", "You are already in the chat")
    }

    const nickname =
      typeof incoming.nickname === "string" ? incoming.nickname.trim() : ""
    if (
      nickname.length === 0 ||
      nickname.length > MAX_NICKNAME_LENGTH ||
      /\p{Cc}/u.test(nickname)
    ) {
      return fail(
        ws,
        "INVALID_NICKNAME",
        `Nickname must be between 1 and ${MAX_NICKNAME_LENGTH} characters`
      )
    }

    if (nicknameTaken(nickname)) {
      return fail(ws, "NICKNAME_TAKEN", "That nickname is already taken")
    }

    state.nickname = nickname

    // `welcome` is the resync point: on (re)join the client receives the
    // current state instead of having to ask for it separately.
    send(ws, {
      type: "welcome",
      you: nickname,
      history: [...history],
      users: users(),
    })
    broadcast({ type: "system", text: `${nickname} joined`, at: Date.now() })
    broadcastUsers()
  }

  function handleMessage(ws: WebSocket, state: ClientState, incoming: Incoming) {
    const nickname = state.nickname
    if (!nickname) {
      return fail(ws, "NOT_JOINED", "Join with a nickname first")
    }

    const text = typeof incoming.text === "string" ? incoming.text.trim() : ""
    if (text.length === 0 || text.length > MAX_TEXT_LENGTH) {
      return fail(
        ws,
        "INVALID_MESSAGE",
        `Message must be between 1 and ${MAX_TEXT_LENGTH} characters`
      )
    }

    const message: ChatMessage = {
      id: randomUUID(),
      nickname,
      text,
      at: Date.now(),
    }

    history.push(message)
    if (history.length > MAX_HISTORY) history.shift()

    broadcast({ type: "message", message })
  }

  function parse(data: RawData, isBinary: boolean): Incoming | null {
    // Binary frames are not part of the protocol (we use text/JSON).
    if (isBinary) return null

    let parsed: unknown
    try {
      parsed = JSON.parse(data.toString())
    } catch {
      return null
    }

    if (typeof parsed !== "object" || parsed === null) return null
    return parsed as Incoming
  }

  wss.on("connection", (ws, req) => {
    // WebSocket has no CORS: the browser sends `Origin` during the handshake
    // and we decide whether to accept it here. Non-browser clients (CLI,
    // tests) send no Origin and are allowed through.
    const origin = req.headers.origin
    if (origin && !allowedOrigins.includes(origin)) {
      ws.close(1008, "Origin not allowed")
      return
    }

    const state: ClientState = { nickname: null }
    clients.set(ws, state)

    ws.on("message", (data, isBinary) => {
      const incoming = parse(data, isBinary)
      if (!incoming) {
        return fail(ws, "INVALID_PAYLOAD", "Message must be JSON text")
      }

      switch (incoming.type) {
        case "join":
          return handleJoin(ws, state, incoming)
        case "message":
          return handleMessage(ws, state, incoming)
        default:
          return fail(ws, "INVALID_PAYLOAD", "Unknown message type")
      }
    })

    ws.on("close", () => {
      clients.delete(ws)
      if (!state.nickname) return

      broadcast({
        type: "system",
        text: `${state.nickname} left`,
        at: Date.now(),
      })
      broadcastUsers()
    })

    ws.on("error", (error) => {
      console.error("[ws] connection error:", error)
    })
  })
}
