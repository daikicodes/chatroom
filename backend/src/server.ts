import { createServer } from "node:http"
import cors from "cors"
import express from "express"
import { WebSocket, WebSocketServer } from "ws"
import { attachChat } from "./chat"

const PORT = Number(process.env.PORT ?? 3001)

// Origins allowed to open a WebSocket from a browser.
// With HTTP the browser enforces CORS; during the WebSocket handshake it only
// sends the `Origin` header, so the check is up to us.
const allowedOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean)

const app = express()
app.use(cors({ origin: allowedOrigins }))

const server = createServer(app)

// Passing `server` makes the HTTP -> WebSocket upgrade happen on the same
// port: the handshake starts as a GET with `Upgrade: websocket` and `ws`
// intercepts it. `maxPayload` stops a client from sending a huge frame and
// taking the process down.
const wss = new WebSocketServer({ server, maxPayload: 16 * 1024 })

attachChat(wss, { allowedOrigins })

app.get("/health", (_req, res) => {
  res.json({ ok: true, clients: wss.clients.size })
})

// Heartbeat: if a client does not answer a ping, the connection is dead even
// though TCP does not know yet (silently dropped network, suspended laptop).
// Without this, zombie sockets pile up.
const alive = new WeakMap<WebSocket, boolean>()

wss.on("connection", (ws) => {
  alive.set(ws, true)
  ws.on("pong", () => alive.set(ws, true))
})

const heartbeat = setInterval(() => {
  for (const ws of wss.clients) {
    if (alive.get(ws) === false) {
      ws.terminate()
      continue
    }
    alive.set(ws, false)
    ws.ping()
  }
}, 30_000)
heartbeat.unref()

let shuttingDown = false

function shutdown() {
  if (shuttingDown) return
  shuttingDown = true

  clearInterval(heartbeat)
  for (const ws of wss.clients) ws.close(1001, "Server shutting down")
  wss.close()
  server.close(() => process.exit(0))

  // Do not hang if some client refuses to close in time.
  setTimeout(() => process.exit(0), 1_000).unref()
}

process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)

server.listen(PORT, () => {
  console.log(`[ws] backend listening on http://localhost:${PORT}`)
  console.log(`[ws] health check at http://localhost:${PORT}/health`)
  console.log(`[ws] allowed origins: ${allowedOrigins.join(", ")}`)
})
