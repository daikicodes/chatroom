import { cn } from "@/lib/utils"
import type { ChatStatus } from "@/hooks/use-chat"

export const STATUS_LABELS: Record<ChatStatus, string> = {
  connecting: "Connecting…",
  open: "Online",
  reconnecting: "Reconnecting…",
}

type ChatStatusIndicatorProps = {
  status: ChatStatus
  className?: string
}

export function ChatStatusIndicator({
  status,
  className,
}: ChatStatusIndicatorProps) {
  return (
    <span
      className={cn(
        "flex items-center gap-1.5 text-xs text-muted-foreground",
        className
      )}
      aria-live="polite"
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          status === "open"
            ? "bg-primary"
            : "animate-pulse bg-muted-foreground/50"
        )}
      />
      {STATUS_LABELS[status]}
    </span>
  )
}
