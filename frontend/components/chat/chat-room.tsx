"use client"

import { Send } from "lucide-react"
import { useState, type FormEvent } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { ChatStatus } from "@/hooks/use-chat"
import type { TimelineItem } from "@/lib/chat-types"
import { ChatStatusIndicator, STATUS_LABELS } from "./chat-status"
import { MessageList } from "./message-list"

type ChatRoomProps = {
  status: ChatStatus
  me: string
  joined: boolean
  users: string[]
  timeline: TimelineItem[]
  send: (text: string) => void
}

export function ChatRoom({
  status,
  me,
  joined,
  users,
  timeline,
  send,
}: ChatRoomProps) {
  const [text, setText] = useState("")
  const canSend = status === "open" && joined && text.trim().length > 0

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSend) return
    send(text)
    setText("")
  }

  return (
    <div className="flex h-svh flex-col">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-2 px-4 py-3">
          <h1 className="text-sm font-medium">chatroom</h1>
          <Badge variant="secondary">{users.length} online</Badge>
          <ChatStatusIndicator status={status} className="ml-auto" />
        </div>
      </header>

      <main className="min-h-0 flex-1">
        <ScrollArea className="h-full">
          <div className="mx-auto w-full max-w-3xl px-4 py-6">
            <MessageList timeline={timeline} me={me} />
          </div>
        </ScrollArea>
      </main>

      <footer className="border-t">
        {status !== "open" ? (
          <p className="border-b px-4 py-1.5 text-center text-xs text-muted-foreground">
            {STATUS_LABELS[status]}
          </p>
        ) : null}

        <form
          onSubmit={handleSubmit}
          className="mx-auto flex w-full max-w-3xl items-center gap-2 px-4 py-3"
        >
          <Input
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={joined ? "Type a message…" : "Waiting for the server…"}
            maxLength={500}
            autoComplete="off"
            aria-label="Message"
            className="h-9 flex-1"
            disabled={status !== "open" || !joined}
          />
          <Button
            type="submit"
            size="icon"
            className="size-9"
            disabled={!canSend}
            aria-label="Send message"
          >
            <Send />
          </Button>
        </form>
      </footer>
    </div>
  )
}
