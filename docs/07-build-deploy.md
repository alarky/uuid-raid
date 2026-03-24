# ビルド・デプロイ

## 開発環境

### 前提

- Node.js 20+
- pnpm 10+
- Wrangler CLI (`pnpm dlx wrangler` or グローバルインストール)

### セットアップ

```bash
pnpm install
pnpm --filter @uuid-raid/shared build   # shared を先にビルド
```

### ローカル開発

```bash
# ターミナル1: Worker
pnpm dev:worker    # wrangler dev → localhost:8787

# ターミナル2: Web
pnpm dev:web       # vite → localhost:3000 (/wsはworkerにプロキシ)

# ターミナル3 (オプション): CLI
pnpm --filter uuid-raid dev -- --server=ws://localhost:8787/ws
```

---

## TypeScript設定

### ベース (`tsconfig.base.json`)

```json
{
  "target": "ES2022",
  "module": "ES2022",
  "moduleResolution": "bundler",
  "strict": true,
  "composite": true
}
```

### パッケージごとの差分

| パッケージ | jsx | lib | declaration | composite |
|---|---|---|---|---|
| shared | — | — | true | true |
| worker | — | ES2022 + @cloudflare/workers-types | false | false |
| web | react-jsx | ES2022, DOM, DOM.Iterable | false | false |
| cli | — | ES2022 | false | false |

---

## ビルド

```bash
pnpm build       # 全パッケージビルド (pnpm -r build)
pnpm typecheck   # 全パッケージ型チェック (pnpm -r typecheck)
```

ビルド順序は pnpm が references から自動解決 (shared → worker/web/cli)。

---

## デプロイ

### Worker (Cloudflare Workers)

```bash
# D1 データベース作成 (初回のみ)
wrangler d1 create uuid-raid-db
# → 出力された database_id を wrangler.jsonc に反映

# D1 マイグレーション実行
wrangler d1 migrations apply uuid-raid-db

# デプロイ
pnpm --filter @uuid-raid/worker deploy
```

### Web (Cloudflare Pages)

```bash
pnpm --filter @uuid-raid/web build
# → dist/ を Cloudflare Pages にデプロイ
# Pages の環境変数 or _routes.json で /ws をWorkerにルーティング
```

### CLI (npm)

```bash
pnpm --filter uuid-raid build
cd apps/cli
npm publish
# → npx uuid-raid で実行可能
```

---

## Wrangler設定要点

```jsonc
{
  "name": "uuid-raid",
  "main": "src/index.ts",
  "compatibility_date": "2025-03-21",

  "durable_objects": {
    "bindings": [{ "name": "RAID_ROOM", "class_name": "RaidRoom" }]
  },
  "migrations": [{ "tag": "v1", "new_classes": ["RaidRoom"] }],

  "d1_databases": [{
    "binding": "DB",
    "database_name": "uuid-raid-db",
    "database_id": "要差し替え"
  }]
}
```

**注意:**
- `database_id` はデプロイ前に `wrangler d1 create` の出力で差し替え必須
- DO migration tagは破壊的変更時にインクリメント

---

## 検証チェックリスト

1. `wrangler dev` → ブラウザ2タブで接続 → プレイヤー一覧表示確認
2. v7 attack → ラウンド結果broadcast確認
3. CLI → 同じサーバーに接続 → Web/CLIのプレイヤーが混在確認
4. v4 → D1登録 + quota減少確認
5. 同一UUID手動INSERT → 衝突検出フロー確認
6. quota上限 → 拒否動作確認
