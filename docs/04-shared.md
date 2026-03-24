# Shared Package

`@uuid-raid/shared` — Common types and utilities.

## Exports

### Protocol Types (protocol.ts)

- `ClientMessage` — union of join, attack_v7, claim_record, get_high_scores
- `ServerMessage` — union of room_state, player_joined, player_left, v7_result, v7_fired, new_record, record_claimed, stats, high_scores, error
- Individual message interfaces (RoomState, V7Result, V7Fired, V7FiredEntry, NewRecord, etc.)
- `HighScoreEntry` — { matchedBits, player, timestamp }

### Damage (damage.ts)

- `HitLevel` — `"dim" | "normal" | "good" | "great" | "amazing" | "legendary"`
- `LEVEL_COLORS` — Record<HitLevel, string> mapping levels to hex colors
- `getHitLevel(matchedBits)` — Returns hit level based on thresholds:
  - legendary: >= 30
  - amazing: >= 25
  - great: >= 20
  - good: >= 14
  - normal: >= 10
  - dim: < 10
- `countMatchingBits(a, b)` — Counts leading matching bits between two Uint8Array buffers using XOR + clz32

## LEVEL_COLORS

| Level | Color | Hex |
|---|---|---|
| dim | Dark gray | #333 |
| normal | Green | #00ff41 |
| good | Cyan | #00ffff |
| great | Yellow | #ffff00 |
| amazing | Orange | #ff8800 |
| legendary | Red | #ff0040 |

Note: Bullet rendering overrides normal to `#1a6b2a` (dark green) for visual contrast.
