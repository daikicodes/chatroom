"use client"

import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import type { TimelineItem } from "@/lib/chat-types"

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
})

type MessageListProps = {
  timeline: TimelineItem[]
  me: string
}

export function MessageList({ timeline, me }: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null)

  // A sentinel at the end handles autoscroll without reaching into the
  // ScrollArea viewport: scrollIntoView finds the nearest scroll container.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" })
  }, [timeline.length])

  if (timeline.length === 0) {
    return (
      <p className="py-12 text-center text-xs text-muted-foreground">
        No messages yet. Say hi.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {timeline.map((item) => {
        if (item.kind === "system") {
          return (
            <p
              key={item.id}
              className="text-center text-xs text-muted-foreground"
            >
              {item.text}
            </p>
          )
        }

        const { message } = item
        const own = message.nickname === me

        return (
          <div
            key={item.id}
            className={cn(
              "flex flex-col gap-1",
              own ? "items-end" : "items-start"
            )}
          >
            {!own ? (
              <span className="px-1 text-[0.625rem] font-medium text-muted-foreground">
                {message.nickname}
              </span>
            ) : null}
            <div
              className={cn(
                "max-w-[75%] rounded-2xl px-3 py-1.5 text-sm break-words whitespace-pre-wrap",
                own
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              )}
            >
              {message.text}
            </div>
            <span className="px-1 text-[0.625rem] text-muted-foreground">
              {timeFormatter.format(message.at)}
            </span>
          </div>
        )
      })}
      <div ref={endRef} />
    </div>
  )
}
