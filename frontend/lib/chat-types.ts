// Mirror of backend/src/types.ts. If the protocol changes, update both files.
// A `shared/` package would be the next step if the project grows.

/** A message as stored by the server and broadcast to every client. */
export type ChatMessage = {
  id: string
  nickname: string
  text: string
  at: number
}

export type ClientMessage =
  { type: "join"; nickname: string } | { type: "message"; text: string }

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

/**
 * The timeline mixes chat messages with system notices ("ana joined") in the
 * order they arrive. System notices are local only: the server does not
 * persist them, so they disappear when `welcome` resets the timeline.
 */
export type TimelineItem =
  | { kind: "message"; id: string; message: ChatMessage }
  | { kind: "system"; id: string; text: string; at: number }
