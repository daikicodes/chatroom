# Backend

HTTP + WebSocket server for `chatroom`. Express only serves the health check;
all chat traffic is JSON over a `ws` connection on the same port.

## Scripts

| Command             | Description                                 |
| ------------------- | ------------------------------------------- |
| `npm run dev`       | Start with `tsx watch` (reloads on change). |
| `npm start`         | Start once, without watching.               |
| `npm run typecheck` | Type-check with `tsc --noEmit`.             |

## Environment

| Variable      | Default                 | Description                                      |
| ------------- | ----------------------- | ------------------------------------------------ |
| `PORT`        | `3001`                  | HTTP and WebSocket port.                         |
| `CORS_ORIGIN` | `http://localhost:3000` | Comma-separated list of allowed browser origins. |

## Source layout

```
src/
├── server.ts   # Express app, HTTP server, ws upgrade, heartbeat, shutdown
├── chat.ts     # join/message handlers, validation, history, presence
└── types.ts    # wire contract
```

- `server.ts` creates the `http.Server`, attaches `WebSocketServer` to it, and
  runs the 30-second ping/pong heartbeat.
- `chat.ts` receives the `WebSocketServer` through `attachChat()` and owns the
  application state: the last 100 messages and the socket → user map.
- `types.ts` defines every client and server frame as a discriminated union.

## Quick check

```bash
npm run dev
curl http://localhost:3001/health
# {"ok":true,"clients":0}
```

Talk to it from a browser console or Node.js 22+:

```js
const ws = new WebSocket("ws://localhost:3001")
ws.onmessage = (event) => console.log(JSON.parse(event.data))
ws.onopen = () => ws.send(JSON.stringify({ type: "join", nickname: "ana" }))
ws.send(JSON.stringify({ type: "message", text: "hello" }))
```

## Behavior notes

- Nicknames are unique case-insensitively and limited to 20 characters.
- Messages are trimmed and limited to 500 characters.
- History lives in memory and is lost on restart.
- Browsers are accepted only if their `Origin` is in `CORS_ORIGIN`. CLI
  clients that send no `Origin` are allowed.
- Invalid frames produce an `error` response; they do not close the connection.

## Deployment

`npm start` runs TypeScript through `tsx`, which lives in `devDependencies`.
Production hosts must install dev dependencies (`npm ci --include=dev`) or move
`tsx` to `dependencies`. See [`../docs/deployment.md`](../docs/deployment.md)
for a step-by-step Vercel + Render guide.

Full frame reference: [`../docs/protocol.md`](../docs/protocol.md). Code map:
[`../docs/architecture.md`](../docs/architecture.md).
