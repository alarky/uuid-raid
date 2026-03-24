# UUID Raid - 概要

## コンセプト

「UUIDは衝突するのか？」を体感するマルチプレイヤーWebゲーム。
レトロアーケード風。Web/CLIどちらからでもプレイ可能。

ボス「ENTROPY」(HP: ∞) をみんなで殴り続ける。UUID生成はサーバー側（チート不可）。

## アーキテクチャ

```
                    ┌─────────────┐
                    │  Cloudflare  │
  Browser ──ws──→  │   Workers    │ ──→ D1 (v4 UUIDs + quota)
  CLI ─────ws──→   │  ┌────────┐ │
                    │  │RaidRoom│ │ ──→ DO Storage (歴代記録)
                    │  │  (DO)  │ │
                    │  └────────┘ │
                    └─────────────┘
```

## パッケージ構成

| コンポーネント | パッケージ名 | 技術 |
|---|---|---|
| `packages/shared` | `@uuid-raid/shared` | TypeScript (プロトコル型 + ダメージ計算) |
| `apps/worker` | `@uuid-raid/worker` | Cloudflare Workers + Durable Objects + D1 |
| `apps/web` | `@uuid-raid/web` | React 19 + Vite 6 |
| `apps/cli` | `uuid-raid` | Node.js + ws + readline |

## ディレクトリ構造

```
uuid-raid/
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.base.json
├── packages/
│   └── shared/                # @uuid-raid/shared
│       └── src/
│           ├── index.ts
│           ├── protocol.ts    # WebSocket message types
│           └── damage.ts      # ダメージ計算
├── apps/
│   ├── worker/                # Cloudflare Workers
│   │   ├── wrangler.jsonc
│   │   ├── migrations/
│   │   │   └── 0001_init.sql
│   │   └── src/
│   │       ├── index.ts       # HTTP router + DO/D1 binding
│   │       ├── raid-room.ts   # RaidRoom DO
│   │       ├── v4-store.ts    # D1操作
│   │       ├── quota.ts       # quota管理
│   │       └── verify.ts      # UUID検証
│   ├── web/                   # ブラウザ版
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── src/
│   │       ├── main.tsx
│   │       ├── App.tsx
│   │       ├── styles.css
│   │       ├── hooks/
│   │       │   ├── useWebSocket.ts
│   │       │   └── useRaidRoom.ts
│   │       └── components/
│   │           ├── TitleScreen.tsx
│   │           ├── NameInput.tsx
│   │           ├── RaidRoom.tsx
│   │           ├── BossDisplay.tsx
│   │           ├── DamageFeed.tsx
│   │           ├── AttackStats.tsx
│   │           ├── QuotaBar.tsx
│   │           ├── PlayerList.tsx
│   │           └── HighScores.tsx
│   └── cli/                   # CLI版
│       └── src/
│           ├── index.ts
│           ├── ws.ts
│           └── ui.ts
└── docs/                      # ← このドキュメント群
```

## 2つのゲームモード

### v7 リアルタイムレイド（無料、メモリのみ）

- サーバーが `crypto.getRandomValues()` で UUID v7 のランダム部分 (74bit) を生成
- poolに蓄積 → 1秒ごとにソート → 隣接比較で最長一致検出 → broadcast → poolクリア
- Birthday Attack: 2^37 (≈1370億) → 倒せないが部分一致は出る
- 同時接続人数 = pool大 = Birthday Paradox = レイドの意味
- メモリのみ、ストレージ不要 → コスト $0

### v4 耐久チャレンジ（donate課金）

- サーバーが `crypto.randomUUID()` で生成 → D1にINSERT → 衝突チェック
- 全UUID永続保存 → グローバルで衝突しない証明
- Birthday Attack: 2^61 → 究極の壁
- 月間quota制（全プレイヤー共有）→ donateで拡張
