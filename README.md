# chatroom

A deliberately small, single-room chat built to learn how WebSockets work end
to end. It uses plain [`ws`](https://github.com/websockets/ws) instead of
Socket.IO, so the HTTP upgrade, JSON frames, broadcast, heartbeat, and
reconnection logic are all visible in the code.

Two browser tabs are enough to try it: join with different nicknames and watch
messages, presence, and reconnections happen live.

## Stack

| Layer    | Technology                                                           |
| -------- | -------------------------------------------------------------------- |
| Backend  | Node.js, TypeScript, Express 5, `ws`                                 |
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS 4, shadcn/ui, lucide |
| Tooling  | `tsx` (run TypeScript directly), Prettier, ESLint                    |

## Repository layout

```
chatroom/
├── backend/
│   └── src/
│       ├── server.ts      # HTTP + WebSocket upgrade, heartbeat, shutdown
│       ├── chat.ts        # protocol handlers, history, presence
│       └── types.ts       # wire contract (server side)
├── frontend/
│   ├── app/               # Next.js App Router entry points
│   ├── components/
│   │   ├── chat/          # join form, chat room, message list
│   │   └── ui/            # shadcn/ui primitives
│   ├── hooks/use-chat.ts  # WebSocket client, reconnection, chat state
│   └── lib/chat-types.ts  # mirror of the wire contract (client side)
└── docs/
    ├── architecture.md    # how the code fits together
    └── protocol.md        # complete WebSocket protocol reference
```

## Quick start

Requirements: Node.js 20 or newer (tested on Node 24) and npm.

```bash
# terminal 1 — backend on http://localhost:3001
cd backend
npm install
npm run dev

# terminal 2 — frontend on http://localhost:3000
cd frontend
npm install
npm run dev
```

Open <http://localhost:3000>, join with a nickname, and repeat in an incognito
window or a second browser to chat with yourself.

Sanity check the backend:

```bash
curl http://localhost:3001/health
# {"ok":true,"clients":0}
```

## Environment variables

No `.env` file is required; the defaults match the local setup.

| App      | Variable             | Default                 | Notes                                                        |
| -------- | -------------------- | ----------------------- | ------------------------------------------------------------ |
| Backend  | `PORT`               | `3001`                  | HTTP and WebSocket share this port.                          |
| Backend  | `CORS_ORIGIN`        | `http://localhost:3000` | Comma-separated list of allowed `Origin` values.             |
| Frontend | `NEXT_PUBLIC_WS_URL` | `ws://localhost:3001`   | Inlined at build time; restart `next dev` after changing it. |

## How it works

1. The browser opens a WebSocket to the backend. The HTTP handshake carries an
   `Origin` header, which the server checks manually (WebSockets have no CORS).
2. The client sends `join` with a nickname. The server replies with `welcome`,
   containing the current history and the list of connected users.
3. Messages are JSON text frames. The server validates them, appends them to an
   in-memory history, and broadcasts the result to every connected client,
   including the sender.
4. If the connection drops, the client retries with exponential backoff and
   joins again automatically. `welcome` rebuilds the timeline, so there are no
   duplicates.

The protocol in detail: [`docs/protocol.md`](docs/protocol.md). How the pieces
fit together: [`docs/architecture.md`](docs/architecture.md).

### Protocol at a glance

| Direction       | Message   | Purpose                                          |
| --------------- | --------- | ------------------------------------------------ |
| Client → server | `join`    | Claim a nickname and enter the room.             |
| Client → server | `message` | Send a chat message.                             |
| Server → client | `welcome` | History + users after a successful join.         |
| Server → client | `message` | A chat message, echoed to everyone.              |
| Server → client | `system`  | "ana joined" / "ana left" notices.               |
| Server → client | `users`   | Updated presence list.                           |
| Server → client | `error`   | Validation failure with a machine-readable code. |

```json
// client -> server
{ "type": "join", "nickname": "ana" }

// server -> client
{
  "type": "welcome",
  "you": "ana",
  "history": [],
  "users": ["ana"]
}
```

## Scripts

| App      | Command             | What it does                         |
| -------- | ------------------- | ------------------------------------ |
| Backend  | `npm run dev`       | Start with `tsx watch` on port 3001. |
| Backend  | `npm start`         | Start once, without watching.        |
| Backend  | `npm run typecheck` | `tsc --noEmit`.                      |
| Frontend | `npm run dev`       | Next.js dev server on port 3000.     |
| Frontend | `npm run build`     | Production build.                    |
| Frontend | `npm start`         | Serve the production build.          |
| Frontend | `npm run lint`      | ESLint.                              |
| Frontend | `npm run format`    | Prettier.                            |
| Frontend | `npm run typecheck` | `tsc --noEmit`.                      |

## Manual testing

1. Join as `ana` in one tab and `beto` in another. Send messages in both
   directions and watch the "joined" notice and the online counter.
2. Reload a tab, join again, and confirm the history comes back through
   `welcome`.
3. Stop the backend (`Ctrl+C`). The UI switches to "Reconnecting…" and the
   composer is disabled. Start it again: the client rejoins automatically.
4. Try joining with a nickname that is already in use. The server rejects it
   with `NICKNAME_TAKEN`.
5. Press `d` outside an input to toggle dark mode.

There is no automated test suite in the repository yet; the flows above were
verified with a headless-browser smoke test during development.

## Limitations and next steps

This is a learning project, not a production chat:

- History lives in memory and is lost when the backend restarts.
- There is a single room and no message persistence.
- Identity is just a nickname: no authentication, accounts, or rate limiting.
- The wire types are duplicated between `backend/src/types.ts` and
  `frontend/lib/chat-types.ts`.
- Reconnection recovers transport, not messages typed while offline.

Natural next steps: persist messages in SQLite, add rooms, extract a `shared/`
types package, add authentication and rate limiting, or commit the smoke tests
as a Playwright suite.

## Documentation

- [`docs/architecture.md`](docs/architecture.md) — code map, message and
  reconnection journeys, design decisions.
- [`docs/protocol.md`](docs/protocol.md) — every frame, limit, error code, and
  close code.
- [`docs/deployment.md`](docs/deployment.md) — deploy to Vercel + Render (or
  Railway/Fly), environment variables, and troubleshooting.
- [`backend/README.md`](backend/README.md) — backend-specific notes.
- [`frontend/README.md`](frontend/README.md) — frontend-specific notes.
