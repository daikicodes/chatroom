"use client"

import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import type { ChatStatus } from "@/hooks/use-chat"
import { ChatStatusIndicator } from "./chat-status"

type JoinFormProps = {
  status: ChatStatus
  error: string | null
  join: (nickname: string) => void
  clearError: () => void
}

export function JoinForm({ status, error, join, clearError }: JoinFormProps) {
  const [nickname, setNickname] = useState("")
  const canJoin = status === "open" && nickname.trim().length > 0

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canJoin) return
    join(nickname)
  }

  return (
    <main className="grid h-svh place-items-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>chatroom</CardTitle>
          <CardDescription>A minimalist chat over WebSockets.</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <Input
              value={nickname}
              onChange={(event) => {
                setNickname(event.target.value)
                if (error) clearError()
              }}
              placeholder="Your nickname"
              maxLength={20}
              autoComplete="off"
              autoFocus
              aria-label="Nickname"
              aria-invalid={error ? true : undefined}
            />

            {error ? <p className="text-xs text-destructive">{error}</p> : null}

            <Button type="submit" disabled={!canJoin}>
              Join
            </Button>
          </form>
        </CardContent>

        <CardFooter>
          <ChatStatusIndicator status={status} />
        </CardFooter>
      </Card>
    </main>
  )
}
