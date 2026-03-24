# Shared パッケージ設計

`@uuid-raid/shared` — Web/CLI/Worker 共通のプロトコル型定義とビット一致計算ロジック。

## エクスポート

```typescript
// index.ts
export * from "./protocol.js";
export * from "./damage.js";
```

---

## プロトコル型 (`protocol.ts`)

→ 詳細は [01-protocol.md](./01-protocol.md) を参照。

### Client → Server

```typescript
type ClientMessage =
  | { type: "join"; playerName: string }
  | { type: "attack_v7"; count: number }
  | { type: "attack_v4" };
```

### Server → Client

```typescript
type ServerMessage =
  | RoomState
  | PlayerJoined
  | PlayerLeft
  | V7Result
  | V4Registered
  | V4Collision
  | NewRecord
  | RaidStats
  | RaidError;
```

### 共通インターフェース

```typescript
interface PlayerInfo {
  name: string;
  id: string;
}
```

---

## ビット一致・演出レベル (`damage.ts`)

### `getHitLevel(matchedBits: number): HitLevel`

一致ビット数から演出レベルを判定。

```typescript
type HitLevel = "normal" | "good" | "great" | "amazing" | "legendary";
```

| ビット数 | レベル | Web色 | CLI色 |
|---|---|---|---|
| 0-9 | normal | `#00ff41` (緑) | green |
| 10-13 | good | `#00ffff` (シアン) | cyan |
| 14-17 | great | `#ffff00` (黄) | yellow |
| 18-23 | amazing | `#ff8800` (オレンジ) | brightYellow |
| 24+ | legendary | `#ff0040` (赤) | brightRed |

### `countMatchingBits(a: Uint8Array, b: Uint8Array): number`

2つのバイト配列の先頭一致ビット数を計算。

**アルゴリズム:**

```
for each byte pair (a[i], b[i]):
  xor = a[i] ^ b[i]
  if xor === 0:
    bits += 8          // 全ビット一致、次のバイトへ
  else:
    bits += clz(xor)   // XORの先頭ゼロ数 = 一致ビット数
    break               // 不一致が見つかったので終了
```

`Math.clz32(xor) - 24` で8bit値のleading zerosを計算（clz32は32bit用なので24を引く）。

---

## パッケージ設定

```json
{
  "name": "@uuid-raid/shared",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  }
}
```

- ビルド: `tsc` → `dist/` に `.js` + `.d.ts` + `.d.ts.map` 出力
- worker/web/cli から `references` で参照
