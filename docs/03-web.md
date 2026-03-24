# Web Frontend

React 19 + Vite 6, deployed to Cloudflare Pages.

## Screen Flow

TitleScreen → RaidRoom (auto-connect, auto-fire)

## Hooks

### useWebSocket

- Connects to `/ws`, auto-reconnects on disconnect (2s delay)
- Parses JSON messages, forwards to handler
- Exposes `send()` and `connected` state

### useRaidRoom

- Manages game state (RaidState), personal stats, high scores
- Auto-fires `attack_v7` every 200ms
- Spawns bullet DOM elements on `v7_fired` (bypasses React render cycle)
- Tracks session best bits and total fired count
- Remembers player name for auto-fill on subsequent records

## Components

| Component | Description |
|---|---|
| TitleScreen | ASCII art title, PRESS START button |
| RaidRoom | Main game layout: Wall + BulletRain + AttackStats + modals |
| Wall | Boss info (ENTROPY UUIDv7), damage gauge (74-bit), uptime, attack count, high score button |
| BulletRain | Container for DOM-injected bullet elements (forwardRef) |
| HitOverlay | Displays matched randHex pair with level-colored highlight, 800ms fade |
| AttackStats | Personal stats (best bits, fired count), player count, BOOST/TURBO buttons |
| NameInput | Text input for high score name (max 16 chars, alphanumeric) |

## Bullet Rendering (DOM Direct)

Bullets are created as `<span>` elements directly in the DOM (not React state):
- Text: first 4 hex chars of randHex
- Color: based on hit level (dim → legendary)
- Size: scales with matchedBits (6px to 64px for legendary)
- Speed: dim/normal/good at 0.6s, great 1.2s, amazing 2.0s, legendary 3.0s
- Glow: great gets static glow, amazing/legendary get pulsing glow (0.06s)
- z-index: matchedBits value (higher = in front)
- Vertical writing mode, fly bottom-to-top via CSS animation
- Removed on `animationend`

## Visual Design

- Font: Press Start 2P (monospace pixel font)
- Theme: Matrix green (#00ff41) on black (#0a0a0a)
- CRT effect: scanline overlay + vignette
- Wall gauge: red fill (#ff0040) with glow
- Hit overlay: text shadow for readability over bullets
- Responsive: 100dvh, max-width 500px, mobile media query at 600px
