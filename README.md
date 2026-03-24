# UUID Raid

"Can UUIDs collide?" - Multiplayer UUID v7 collision raid game.

## Concept

Boss "ENTROPY UUIDv7" has infinite HP. Players fire UUID v7s and find the longest matching random bit prefix. Retro arcade style, browser-based.

Server generates all UUIDs with `crypto.getRandomValues()` (cheat-proof). Pool of up to 10,000 UUIDs is maintained for comparison. Birthday paradox makes matches more likely with more players.

## Architecture

```
                    +---------------+
  Browser --ws-->   | Cloudflare    |
                    | Workers       |
                    | +----------+  |
                    | | RaidRoom |  | --> DO Storage (records, high scores)
                    | |   (DO)   |  |
                    | +----------+  |
                    +---------------+
```

## Package Structure

| Package | Name | Tech |
|---|---|---|
| `packages/shared` | `@uuid-raid/shared` | TypeScript (protocol types + damage calc) |
| `apps/worker` | `@uuid-raid/worker` | Cloudflare Workers + Durable Objects |
| `apps/web` | `@uuid-raid/web` | React 19 + Vite 6 |

## Directory Structure

```
uuid-raid/
├── packages/
│   └── shared/
│       └── src/
│           ├── index.ts
│           ├── protocol.ts    # WebSocket message types
│           └── damage.ts      # Hit levels + bit matching
├── apps/
│   ├── worker/
│   │   ├── wrangler.jsonc
│   │   └── src/
│   │       ├── index.ts       # HTTP router + DO binding
│   │       └── raid-room.ts   # RaidRoom Durable Object
│   └── web/
│       ├── index.html
│       ├── vite.config.ts
│       └── src/
│           ├── main.tsx
│           ├── App.tsx
│           ├── styles.css
│           ├── hooks/
│           │   ├── useWebSocket.ts
│           │   └── useRaidRoom.ts
│           └── components/
│               ├── TitleScreen.tsx
│               ├── NameInput.tsx
│               ├── RaidRoom.tsx
│               ├── Wall.tsx
│               ├── HitOverlay.tsx
│               ├── BulletRain.tsx
│               └── AttackStats.tsx
└── docs/
```

## Game Mechanics

- Server generates UUID v7 random parts (74 bits = rand_a 12 + rand_b 62)
- UUIDs are pooled (up to 10,000) and compared on insert against existing pool
- Each second, the best match from newly inserted UUIDs is broadcast
- Hit levels: dim (<10), normal (10+), good (14+), great (20+), amazing (25+), legendary (30+)
- Bullets are colored and sized by hit level; rare hits glow and move slower
- 74-bit full match = game clear (timer stops, attacks cease)

## Quick Start

```bash
pnpm install
pnpm --filter @uuid-raid/shared build

# Terminal 1: Worker
pnpm dev:worker

# Terminal 2: Web
pnpm dev:web
```

## Dev Tools

```bash
# Clear local storage
pnpm --filter @uuid-raid/worker clean

# Seed pool with UUIDs (dev only)
COUNT=10000 pnpm --filter @uuid-raid/worker seed
```

## License

MIT
