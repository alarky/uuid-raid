# Game Mechanics

## Boss: ENTROPY UUIDv7

- HP: Infinity (cannot be killed... probably)
- Tracks all-time best matched bits and record holder
- Uptime timer from first creation
- Game clears if 74-bit full match is achieved (all random bits identical)

## UUID v7 Random Space

UUID v7 structure:
- 48 bits: millisecond timestamp
- 4 bits: version (0111)
- 12 bits: rand_a
- 2 bits: variant (10)
- 62 bits: rand_b

**Comparison target: 74 random bits** (rand_a + rand_b)

Server generates 10 random bytes, masks last byte with `0xc0` (keeping only top 2 bits = 74 total random bits). Comparison uses these raw bytes directly, not the formatted UUID string (avoids variant bit distortion).

## Pool System

- UUIDs persist in pool (up to 10,000 entries)
- Each new UUID is compared against entire pool on insert
- Best match per round (1 second) is broadcast as `v7_result`
- Pool is trimmed when exceeding MAX_POOL_SIZE (oldest entries removed)

## Attack Modes

| Mode | Batch Size | Interval | UUIDs/sec |
|---|---|---|---|
| Normal | 10 | 200ms | 50 |
| Boost (toggle) | 50 | 200ms | 250 |
| Turbo (hold) | 100 | 200ms | 500 |

## Hit Levels

| Level | Bits | Color | Bullet Size | Bullet Speed | Glow |
|---|---|---|---|---|---|
| dim | < 10 | #333 | 6px | 0.6s | none |
| normal | 10+ | #1a6b2a* | ~11px | 0.6s | none |
| good | 14+ | #00ffff | ~13px | 0.6s | none |
| great | 20+ | #ffff00 | ~16px | 1.2s | static double |
| amazing | 25+ | #ff8800 | 28px | 2.0s | pulsing 0.06s |
| legendary | 30+ | #ff0040 | 64px | 3.0s | pulsing 0.06s |

*Bullet normal color is darker than UI normal color (#00ff41)

## Multiplayer

- All players share one RaidRoom Durable Object instance
- More players = larger pool = better matches (birthday paradox)
- `v7_result` is broadcast to all players
- `v7_fired` is sent only to the attacking player

## High Scores

- Top 10 records persisted in DO storage
- Added with placeholder name "???" on record, updated on claim
- Accessible via HI button in wall panel

## Anti-Cheat

- All UUIDs generated server-side with `crypto.getRandomValues()`
- Clients only send attack count, never UUID values
- Rate limited: 20 messages/sec per player, max 100 UUIDs per batch
- matchedBits capped at 74

## Birthday Paradox

With pool size N, expected best leading-bit match ≈ log₂(N):
- 50 UUIDs (1 player, 1 sec): ~6 bits
- 10,000 UUIDs (full pool): ~13 bits
- Reaching 30+ bits (legendary): ~5 min with boost
- Reaching 74 bits (game clear): astronomically unlikely
