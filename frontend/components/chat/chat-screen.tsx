"use client"

import { useChat } from "@/hooks/use-chat"
import { ChatRoom } from "./chat-room"
import { JoinForm } from "./join-form"

export function ChatScreen() {
  const chat = useChat()

  if (chat.me) {
    return (
      <ChatRoom
        status={chat.status}
        me={chat.me}
        joined={chat.joined}
        users={chat.users}
        timeline={chat.timeline}
        send={chat.send}
      />
    )
  }

  return (
    <JoinForm
      status={chat.status}
      error={chat.error}
      join={chat.join}
      clearError={chat.clearError}
    />
  )
}
