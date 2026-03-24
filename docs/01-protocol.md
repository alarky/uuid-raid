# WebSocket Protocol

## Client → Server

| Type | Payload | Description |
|---|---|---|
| `join` | - | Join the raid room |
| `attack_v7` | `{ count: number }` | Generate count UUIDs (max 100) |
| `claim_record` | `{ playerName: string }` | Claim pending record with name (1-16 alphanumeric) |
| `get_high_scores` | - | Request top 10 high scores |

## Server → Client

| Type | Payload | Description |
|---|---|---|
| `room_state` | playerId, playerCount, v7AllTimeBest, v7AllTimeBestPlayer, createdAt, clearedAt | Initial state on join |
| `player_joined` | playerCount | Player count update |
| `player_left` | playerCount | Player count update |
| `v7_result` | matchedBits, uuid1, uuid2, randHex1, randHex2, player1Id, player2Id, poolSize | Best match from last round |
| `v7_fired` | entries: `{ randHex, matchedBits }[]` | Generated UUIDs with pool-compared scores |
| `new_record` | matchedBits, player, playerId | New all-time record |
| `record_claimed` | matchedBits, player | Record name confirmed |
| `stats` | v7TotalChecked, playerCount | Periodic stats broadcast |
| `high_scores` | scores: `{ matchedBits, player, timestamp }[]` | Top 10 high scores |
| `error` | message, code | Error |

## Error Codes

| Code | Description |
|---|---|
| PARSE_ERROR | Invalid JSON |
| UNKNOWN_TYPE | Unknown message type |
| INVALID_NAME | Name validation failed |
| RATE_LIMITED | Too many messages per second |
| NO_RECORD | No pending record to claim |

## Flow

1. Client connects via WebSocket to `/ws`
2. Client sends `join`
3. Server responds with `room_state`
4. Client sends `attack_v7` every 200ms (count: 10/50/100)
5. Server responds with `v7_fired` (generated UUIDs + matchedBits per UUID)
6. Server broadcasts `v7_result` every second (best match from round)
7. On new record: server broadcasts `new_record`, client shows name input
8. Client sends `claim_record` with name
