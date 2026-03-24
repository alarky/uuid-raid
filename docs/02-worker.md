# Worker (Backend)

## HTTP Routes

| Method | Path | Description |
|---|---|---|
| GET | `/` | Health check |
| GET | `/ws` | WebSocket upgrade → RaidRoom DO |
| GET | `/stats` | Room stats JSON |
| POST | `/seed?count=N` | Dev only: seed pool with N UUIDs |

## RaidRoom Durable Object

Single instance (`raid-main`) managing all players.

### State

- `sessions`: Map<WebSocket, PlayerSession> — connected players
- `v7Pool`: V7PoolEntry[] — UUID pool (max 10,000 entries)
- `roundBest` — best match from current round's insertions
- `v7TotalChecked` — cumulative UUID count
- `v7AllTimeBest` / `v7AllTimeBestPlayer` — all-time record
- `highScores` — top 10 records with timestamps
- `createdAt` / `clearedAt` — boss uptime / game clear timestamp

### Persisted Storage (DO Storage)

- `createdAt`, `clearedAt`, `v7AllTimeBest`, `v7AllTimeBestPlayer`, `v7TotalChecked`, `highScores`

### v7 Attack Flow

1. `handleAttackV7`: Generate N random 10-byte values (74 useful bits, masked with `0xc0`)
2. Each UUID compared against entire pool → best matchedBits tracked
3. Insert into pool, track round best (entry + pair)
4. Return `v7_fired` with per-UUID randHex + matchedBits

### Round Processing (every 1s via alarm)

1. Trim pool to MAX_POOL_SIZE (10,000) if needed
2. If `roundBest` exists: broadcast `v7_result`, check for new record
3. On new record: add to high scores (placeholder "???"), broadcast `new_record`
4. On 74-bit match: set `clearedAt`, game stops
5. Always broadcast `stats`

### Rate Limiting

- 20 messages/second per player
- Max 100 UUIDs per `attack_v7` batch

### Game Clear

When `matchedBits >= 74`: `clearedAt` is persisted, `handleAttackV7` rejects all further attacks.
