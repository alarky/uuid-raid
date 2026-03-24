# Build & Deploy

## Prerequisites

- Node.js 20+
- pnpm 10+
- Wrangler CLI (for worker)

## Development

```bash
pnpm install
pnpm --filter @uuid-raid/shared build

# Terminal 1: Worker (port 8787)
pnpm dev:worker

# Terminal 2: Web (port 3000, proxies /ws to 8787)
pnpm dev:web
```

## Dev Scripts (Worker)

```bash
# Clear Durable Object storage
pnpm --filter @uuid-raid/worker clean

# Seed pool with UUIDs (requires running worker)
COUNT=10000 pnpm --filter @uuid-raid/worker seed

# Direct curl
curl -s -X POST 'http://localhost:8787/seed?count=10000'
```

The `/seed` endpoint is gated by `DEV_MODE` env var, which is only set during `pnpm dev:worker` (via `--var DEV_MODE:true`).

## TypeScript

```bash
# Type check all packages
pnpm typecheck
```

Separate tsconfig per package, extending `tsconfig.base.json` (ES2022 target, strict mode).

## Build

```bash
pnpm build
```

## Deploy

### Worker (Cloudflare Workers)

```bash
pnpm --filter @uuid-raid/worker deploy
```

Uses `wrangler.jsonc` config with Durable Object binding.

### Web (Cloudflare Pages)

Build `apps/web/dist/` and deploy to Pages. Configure `/ws` route to proxy to the Worker.

## Verification Checklist

1. `pnpm typecheck` passes
2. Worker starts, health check at `/` returns OK
3. Web connects, bullets fly, hit overlay shows
4. Multiple tabs: player count updates, shared pool improves matches
5. High score record → name input → HI button shows entry
6. Boost/Turbo increase bullet density
7. Mobile layout works (responsive)
