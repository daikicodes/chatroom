"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type {
  ClientMessage,
  ServerMessage,
  TimelineItem,
} from "@/lib/chat-types"

/**
 * Transport state only, independent from chat membership: `open` means the
 * socket is connected, not that the user has joined (check `joined` for that).
 */
export type ChatStatus = "connecting" | "open" | "reconnecting"

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:3001"
const MAX_RETRY_DELAY = 30_000

// Exponential backoff with jitter: 0.5 s, 1 s, 2 s... up to 30 s.
// Jitter keeps many clients from retrying at the same instant after an outage.
function retryDelay(attempt: number) {
  const base = Math.min(MAX_RETRY_DELAY, 500 * 2 ** attempt)
  return base * (0.5 + Math.random() * 0.5)
}

/**
 * Minimal chat client built on a single WebSocket connection.
 *
 * Opens the socket on mount, reconnects with exponential backoff, and joins
 * again automatically with the last nickname. `welcome` is the source of
 * truth: it rebuilds the timeline and user list on every (re)join, so a
 * reconnection never leaves duplicate messages behind.
 */
export function useChat() {
  const [status, setStatus] = useState<ChatStatus>("connecting")
  const [me, setMe] = useState<string | null>(null)
  const [joined, setJoined] = useState(false)
  const [users, setUsers] = useState<string[]>([])
  const [timeline, setTimeline] = useState<TimelineItem[]>([])
  const [error, setError] = useState<string | null>(null)

  const socketRef = useRef<WebSocket | null>(null)
  // Survives reconnections: this is what lets us rejoin automatically.
  const nicknameRef = useRef<string | null>(null)
  const systemIdRef = useRef(0)

  const sendRaw = useCallback((message: ClientMessage) => {
    const socket = socketRef.current
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message))
    }
  }, [])

  const handleMessage = useCallback((message: ServerMessage) => {
    switch (message.type) {
      case "welcome":
        nicknameRef.current = message.you
        setMe(message.you)
        setJoined(true)
        setError(null)
        setUsers(message.users)
        // The server sends the full history: rebuild the timeline instead of
        // merging it, so a reconnection cannot duplicate messages.
        setTimeline(
          message.history.map<TimelineItem>((chat) => ({
            kind: "message",
            id: chat.id,
            message: chat,
          }))
        )
        break

      case "message":
        setTimeline((current) => [
          ...current,
          { kind: "message", id: message.message.id, message: message.message },
        ])
        break

      case "system": {
        const id = `system-${systemIdRef.current++}`
        setTimeline((current) => [
          ...current,
          { kind: "system", id, text: message.text, at: message.at },
        ])
        break
      }

      case "users":
        setUsers(message.users)
        break

      case "error":
        setError(message.message)
        // If a join (manual or automatic) is rejected, go back to the login
        // form instead of staying in an inconsistent state.
        if (
          message.code === "NICKNAME_TAKEN" ||
          message.code === "INVALID_NICKNAME"
        ) {
          nicknameRef.current = null
          setMe(null)
          setJoined(false)
        }
        break
    }
  }, [])

  const join = useCallback(
    (nickname: string) => {
      const trimmed = nickname.trim()
      if (!trimmed) return
      setError(null)
      nicknameRef.current = trimmed
      sendRaw({ type: "join", nickname: trimmed })
    },
    [sendRaw]
  )

  const send = useCallback(
    (text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return
      sendRaw({ type: "message", text: trimmed })
    },
    [sendRaw]
  )

  const clearError = useCallback(() => setError(null), [])

  useEffect(() => {
    let disposed = false
    let retryTimer: ReturnType<typeof setTimeout> | null = null
    let attempt = 0

    function connect() {
      if (disposed) return
      setStatus(attempt === 0 ? "connecting" : "reconnecting")

      const socket = new WebSocket(WS_URL)
      socketRef.current = socket

      socket.addEventListener("open", () => {
        if (disposed) return
        attempt = 0
        setStatus("open")
        // If we were already in the chat before the drop, send `join` again.
        // The `welcome` that follows resyncs history and users.
        const nickname = nicknameRef.current
        if (nickname) sendRaw({ type: "join", nickname })
      })

      socket.addEventListener("message", (event) => {
        if (typeof event.data !== "string") return
        let parsed: unknown
        try {
          parsed = JSON.parse(event.data)
        } catch {
          return
        }
        handleMessage(parsed as ServerMessage)
      })

      socket.addEventListener("close", () => {
        if (socketRef.current === socket) socketRef.current = null
        if (disposed) return
        setJoined(false)
        setStatus("reconnecting")
        retryTimer = setTimeout(connect, retryDelay(attempt++))
      })

      socket.addEventListener("error", () => {
        // `error` is always followed by `close`, which schedules the retry.
        socket.close()
      })
    }

    connect()

    return () => {
      disposed = true
      if (retryTimer) clearTimeout(retryTimer)
      const socket = socketRef.current
      socketRef.current = null
      socket?.close()
    }
  }, [handleMessage, sendRaw])

  return { status, me, joined, users, timeline, error, join, send, clearError }
}
