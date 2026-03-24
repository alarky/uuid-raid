# Web フロントエンド設計

React 19 + Vite 6。Cloudflare Pagesにデプロイ想定。

## 画面フロー

```
TitleScreen → NameInput → RaidRoom
"PRESS START"   3文字アーケード式   オートファイア開始
```

接続中は `RaidRoom` に留まる。離脱=ブラウザを閉じる。

---

## Hooks

### `useWebSocket(onMessage)` — `src/hooks/useWebSocket.ts`

WebSocket接続の管理。

```typescript
function useWebSocket(onMessage: (msg: ServerMessage) => void): {
  send: (msg: ClientMessage) => void;
  connected: boolean;
}
```

- 接続先: `ws(s)://${location.host}/ws` (プロトコル自動判定)
- `onMessage` は `useRef` で保持（再レンダリングで再接続しない）
- close時: 2秒後に再接続トリガー（※現状はリマウント依存）

### `useRaidRoom(playerName)` — `src/hooks/useRaidRoom.ts`

ゲーム全体の状態管理。

```typescript
interface RaidState {
  players: PlayerInfo[];
  playerCount: number;
  v7AllTimeBest: number;
  v7TotalChecked: number;
  v4TotalRegistered: number;
  v4QuotaRemaining: number;
  damageFeed: V7Result[];      // 直近50件
  lastRecord: { mode: string; matchedBits: number; player: string } | null;
}

function useRaidRoom(playerName: string): {
  state: RaidState;
  mode: "v7" | "v4";
  boosted: boolean;
  connected: boolean;
  toggleBoost: () => void;
  switchMode: (m: "v7" | "v4") => void;
}
```

**オートファイア:**

| モード | 間隔 | バッチサイズ | ブースト時 |
|---|---|---|---|
| v7 | 200ms | 10 | 50 |
| v4 | 1000ms | 1 | 1 |

- 接続時に自動で `join` 送信
- `mode` / `boosted` 変更時にタイマー再作成
- `damageFeed`: `FEED_MAX = 50` 件で先頭キープ

**メッセージハンドラ:**

| msg.type | state更新 |
|---|---|
| `room_state` | players, playerCount, v7AllTimeBest, v4TotalRegistered, v4QuotaRemaining |
| `player_joined` | playerCount |
| `player_left` | playerCount |
| `v7_result` | damageFeed先頭に追加 (50件上限) |
| `v4_registered` | v4TotalRegistered, v4QuotaRemaining |
| `new_record` | lastRecord, v7AllTimeBest (v7の場合) |
| `stats` | v7TotalChecked, v4TotalRegistered, playerCount |
| `error` | console.warn |

---

## コンポーネント

### `TitleScreen` — `src/components/TitleScreen.tsx`

```typescript
Props: { onStart: () => void }
```

- "UUID RAID" タイトル（24px、グロウ + フリッカーアニメーション）
- "CAN UUIDs COLLIDE?" サブタイトル
- "PRESS START" ボタン（ブリンクアニメーション）

### `NameInput` — `src/components/NameInput.tsx`

```typescript
Props: { onSubmit: (name: string) => void }
```

- 文字グリッド: A-Z + 0-9（13列レイアウト）
- 名前表示: 24px、未入力部分は `_` 表示
- DEL ボタン（赤）、OK ボタン（name.length > 0 で活性化）
- 最大3文字

### `RaidRoom` — `src/components/RaidRoom.tsx`

```typescript
Props: { playerName: string }
```

メインゲーム画面。`useRaidRoom` hookを使用。
子コンポーネント: BossDisplay, DamageFeed, AttackStats, QuotaBar (v4時のみ)。
未接続時は "CONNECTING..." をブリンク表示。

### `BossDisplay` — `src/components/BossDisplay.tsx`

```typescript
Props: { allTimeBest: number; lastRecord: { mode, matchedBits, player } | null }
```

- "ENTROPY" （赤グロウ）
- "HP: INFINITY"
- "BEST HIT: N BITS" （黄グロウ）
- レコード更新時: "NEW RECORD! PLAYER - N BITS (MODE)" （シアングロウ）

### `DamageFeed` — `src/components/DamageFeed.tsx`

```typescript
Props: { feed: V7Result[] }
```

ダメージログのリアルタイムフィード。
フォーマット: `[Nbit] PLAYER1 x PLAYER2 | pool:SIZE LEVEL!`

ヒットレベル別カラー:

| レベル | ビット数 | 色 |
|---|---|---|
| normal | 0-9 | `#00ff41` (緑) |
| good | 10-13 | `#00ffff` (シアン) |
| great | 14-17 | `#ffff00` (黄) |
| amazing | 18-23 | `#ff8800` (オレンジ) |
| legendary | 24+ | `#ff0040` (赤) |

### `AttackStats` — `src/components/AttackStats.tsx`

```typescript
Props: {
  mode: "v7" | "v4";
  boosted: boolean;
  playerCount: number;
  v7TotalChecked: number;
  v4TotalRegistered: number;
  onToggleBoost: () => void;
  onSwitchMode: (mode: "v7" | "v4") => void;
}
```

- 統計表示: `PLAYERS: N | v7: X.XM | v4: X.XK`
- 数値フォーマット: B (10億+), M (100万+), K (1000+)
- モードボタン: v7, v4, BOOST（active状態で色反転）

### `QuotaBar` — `src/components/QuotaBar.tsx`

```typescript
Props: { remaining: number; total: number }
```

- ラベル: `v4 QUOTA N / 3,000,000`
- プログレスバー（色変化: 緑 >30%, 黄 10-30%, 赤 <10%）

### `PlayerList` — `src/components/PlayerList.tsx` (未接続)

```typescript
Props: { players: PlayerInfo[] }
```

接続プレイヤー名をflex表示。

### `HighScores` — `src/components/HighScores.tsx` (未接続)

```typescript
Props: { scores: ScoreEntry[] }
```

ランキングテーブル表示。

---

## ビジュアルデザイン (`src/styles.css`)

### テーマ

- **背景**: `#0a0a0a` (ほぼ黒)
- **プライマリ**: `#00ff41` (マトリックスグリーン)
- **フォント**: Press Start 2P (Google Fonts、ピクセルフォント)
- **ベースフォントサイズ**: 10px

### エフェクト

**CRT (`.crt`)**
- `::before` — スキャンライン: 1pxの黒い横線を2px間隔で繰り返し
- `::after` — ビネット: 中心から外周に向けて暗くなるradial-gradient

**グロウ (`.glow`, `.glow-red`, `.glow-yellow`, `.glow-cyan`)**
- `text-shadow` 3段階 (5px / 10px / 20px)

**フリッカー (`@keyframes flicker`)**
- 3秒周期で92-97%の間に微妙なopacity低下

**ブリンク (`@keyframes blink`)**
- 1秒step-endで0%/50%切替

### レイアウト

- `.app`: 100vw × 100vh、flexbox中央配置
- `.raid-container`: max-width 800px、flex column、gap 12px
- `.damage-feed`: flex 1、overflow-y auto
- `.name-input-grid`: 13列grid、4px gap

### ボタン (`.btn`)

- デフォルト: 透明背景、2px緑ボーダー
- hover: 緑背景、黒文字
- active: scale(0.95)
- `.active`: 緑背景、黒文字（モード/ブースト選択時）
- `.btn-red`: 赤系バリアント

---

## ビルド設定

### Vite (`apps/web/vite.config.ts`)

```typescript
{
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      "/ws": { target: "ws://localhost:8787", ws: true }
    }
  }
}
```

開発時: `pnpm dev:web` → localhost:3000 → /ws は localhost:8787 にプロキシ。

### TypeScript (`apps/web/tsconfig.json`)

- jsx: `react-jsx`
- lib: `ES2022`, `DOM`, `DOM.Iterable`
- shared パッケージを reference
