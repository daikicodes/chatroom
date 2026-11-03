# Frontend

Next.js 16 client for `chatroom`. The UI is a single screen: a join form and,
once you are in, a full-height chat room.

## Scripts

| Command             | Description                      |
| ------------------- | -------------------------------- |
| `npm run dev`       | Next.js dev server on port 3000. |
| `npm run build`     | Production build.                |
| `npm start`         | Serve the production build.      |
| `npm run lint`      | ESLint.                          |
| `npm run format`    | Prettier over `**/*.{ts,tsx}`.   |
| `npm run typecheck` | Type-check with `tsc --noEmit`.  |

## Layout

```
app/
├── layout.tsx              # fonts, metadata, ThemeProvider
└── page.tsx                # Server Component → <ChatScreen />
components/
├── chat/
│   ├── chat-screen.tsx     # join form vs chat room
│   ├── join-form.tsx       # nickname form
│   ├── chat-room.tsx       # header, messages, composer
│   ├── message-list.tsx    # timeline + autoscroll
│   └── chat-status.tsx     # shared connection indicator
└── ui/                     # shadcn/ui primitives
hooks/use-chat.ts           # socket, state, reconnection
lib/chat-types.ts           # mirror of the backend wire types
```

`app/page.tsx` stays a Server Component; `components/chat/chat-screen.tsx` is
the client boundary and owns all interactivity.

## How it connects

`useChat()` opens a WebSocket on mount, sends `join`, and exposes the chat
state (`status`, `me`, `joined`, `users`, `timeline`, `error`) plus `join` and
`send`. On a dropped connection it retries with exponential backoff and joins
again automatically with the last nickname. `welcome` rebuilds the timeline, so
reconnections do not duplicate messages.

The URL comes from `NEXT_PUBLIC_WS_URL`, defaulting to `ws://localhost:3001`.
The variable is inlined at build time, so restart the dev server (or rebuild)
after changing it.

## Styling

- Tailwind CSS 4 with the shadcn/ui `base-mira` style.
- All colors, radii, and borders come from the tokens in
  `app/globals.css` (`bg-card`, `bg-muted`, `text-muted-foreground`,
  `bg-primary`, …), so light and dark mode work automatically.
- Press `d` outside an input to toggle the theme.
- Add more primitives with:

  ```bash
  npx shadcn@latest add <component>
  ```

## Documentation

- [`../README.md`](../README.md) — project overview and quick start.
- [`../docs/architecture.md`](../docs/architecture.md) — code map and flows.
- [`../docs/protocol.md`](../docs/protocol.md) — WebSocket frame reference.
