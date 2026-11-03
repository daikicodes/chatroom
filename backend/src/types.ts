// Wire contract between client and server.
// Everything travels as JSON inside WebSocket text frames.

/** A message as stored by the server and broadcast to every client. */
export type ChatMessage = {
  id: string
  nickname: string
  text: string
  at: number
}

// --- Client -> server -------------------------------------------------------

export type ClientMessage =
  | { type: "join"; nickname: string }
  | { type: "message"; text: string }

// --- Server -> client -------------------------------------------------------

/** Stable, machine-readable reasons carried by `type: "error"` frames. */
export type ErrorCode =
  | "INVALID_PAYLOAD"
  | "INVALID_NICKNAME"
  | "NICKNAME_TAKEN"
  | "ALREADY_JOINED"
  | "NOT_JOINED"
  | "INVALID_MESSAGE"

export type ServerMessage =
  | { type: "welcome"; you: string; history: ChatMessage[]; users: string[] }
  | { type: "message"; message: ChatMessage }
  | { type: "system"; text: string; at: number }
  | { type: "users"; users: string[] }
  | { type: "error"; code: ErrorCode; message: string }
