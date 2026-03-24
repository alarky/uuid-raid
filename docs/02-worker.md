# Worker (バックエンド) 設計

## HTTPルーティング (`apps/worker/src/index.ts`)

| メソッド | パス | 動作 |
|---|---|---|
| `OPTIONS` | `*` | CORS preflight (`Access-Control-Allow-Origin: *`) |
| `GET` | `/` | ヘルスチェック `{ status: "ok", game: "UUID Raid" }` |
| `GET` | `/ws` | WebSocket upgrade → RaidRoom DOにルーティング |
| `GET` | `/stats` | RaidRoom DOから統計取得 |

### Env バインディング

```typescript
interface Env {
  RAID_ROOM: DurableObjectNamespace;
  DB: D1Database;
}
```

---

## RaidRoom Durable Object (`apps/worker/src/raid-room.ts`)

単一インスタンス `idFromName("raid-main")` で全プレイヤーを管理。
WebSocket Hibernation APIを使用。

### メモリ上の状態

```typescript
private sessions: Map<WebSocket, PlayerSession>  // 接続中プレイヤー
private v7Pool: V7PoolEntry[]                     // ラウンド中のUUID蓄積
private v7TotalChecked: number                    // 累計チェック数
private v7AllTimeBest: number                     // 歴代最高ビット数
private v7AllTimeBestPlayer: string               // その達成者
private v4TotalRegistered: number                 // v4登録総数
```

```typescript
interface PlayerSession {
  name: string;
  id: string;         // crypto.randomUUID() で生成
  ws: WebSocket;
  lastAttack: number;  // レート制限用タイムスタンプ
  attackCount: number; // レート制限用カウンタ
}

interface V7PoolEntry {
  randomBytes: Uint8Array;  // 74bit (10バイト)
  playerId: string;
  playerName: string;
  uuid: string;             // 表示用UUID文字列
}
```

### 永続化 (DO Storage)

| key | 型 | 更新タイミング |
|---|---|---|
| `v7AllTimeBest` | `number` | レコード更新時 |
| `v7AllTimeBestPlayer` | `string` | レコード更新時 |
| `v7TotalChecked` | `number` | 毎Alarm (1秒ごと) |

constructor内の `blockConcurrencyWhile` で起動時に復元。

---

## レート制限

```
定数: MAX_ATTACK_RATE = 20 msg/sec/player

ロジック:
  if (now - lastAttack > 1000ms) → カウンタリセット
  attackCount++
  if (attackCount > 20) → error "RATE_LIMITED"
```

---

## v7照合アルゴリズム (Alarm: 1秒間隔)

```
1. v7Poolのエントリを取り出し、poolをクリア
2. pool.length < 2 なら終了
3. v7TotalChecked += pool.length

4. randomBytes でレキシコグラフィックソート: O(N log N)
   for i in 0..10:
     if a[i] !== b[i]: return a[i] - b[i]

5. 隣接要素の先頭一致ビット数を比較: O(N)
   for i in 0..pool.length-1:
     bits = countMatchingBits(pool[i], pool[i+1])
     bestBits = max(bestBits, bits)

6. bestBits > 0 なら v7_result をbroadcast
7. bestBits > allTimeBest なら new_record をbroadcast + DO Storage保存
8. stats をbroadcast
9. sessions.size > 0 なら次のAlarmをセット (1秒後)
```

ソート済み配列では「最も似ている2つ」は必ず隣り合うため、全ペア比較 O(N²) → O(N log N) に削減。

### UUID v7 フォーマット (表示用)

```
tttttttt-tttt-7rrr-Vrrr-rrrrrrrrrrrr
│            │ │    │
│            │ │    └ variant bits (0b10xx)
│            │ └ version 7
│            └ timestamp lower
└ timestamp upper (Date.now() hex)
```

---

## v4 フロー

```
1. checkRate() → RATE_LIMITED
2. checkQuota(db) → QUOTA_EXHAUSTED
3. uuid = crypto.randomUUID()
4. insertV4Uuid(db, uuid, playerId)
   ├→ collision: broadcast v4_collision (理論上起きない)
   └→ success: consumeQuota(db), v4TotalRegistered++, send v4_registered
```

---

## D1 操作 (`apps/worker/src/v4-store.ts`)

### `insertV4Uuid(db, uuid, playerId): Promise<InsertResult>`

```typescript
interface InsertResult {
  collision: boolean;
  existingPlayerId?: string;
}
```

1. `SELECT player_id FROM uuids WHERE uuid = ?` で衝突チェック
2. 存在すれば `{ collision: true, existingPlayerId }`
3. なければ `INSERT INTO uuids (uuid, player_id, created_at) VALUES (?, ?, ?)`

### `getV4Stats(db): Promise<{ totalRegistered: number }>`

`SELECT COUNT(*) as count FROM uuids`

---

## Quota管理 (`apps/worker/src/quota.ts`)

月キー: `YYYY-MM` 形式（`getCurrentMonth()`）

| 関数 | SQL | 動作 |
|---|---|---|
| `checkQuota(db)` | `SELECT used, limit_amount FROM quota WHERE month = ?` | 残量確認。初回は行作成 |
| `consumeQuota(db)` | `UPDATE quota SET used = used + 1 WHERE month = ?` | 消費 |
| `getQuotaRemaining(db)` | 同上SELECT | `max(0, limit_amount - used)` |

デフォルト上限: **3,000,000 UUID/月**

---

## D1 スキーマ (`apps/worker/migrations/0001_init.sql`)

```sql
CREATE TABLE IF NOT EXISTS uuids (
  uuid TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS quota (
  month TEXT PRIMARY KEY,
  used INTEGER DEFAULT 0,
  limit_amount INTEGER DEFAULT 3000000
);

CREATE TABLE IF NOT EXISTS stats (
  key TEXT PRIMARY KEY,
  value TEXT
);
```

---

## UUID検証 (`apps/worker/src/verify.ts`)

```typescript
function isValidUuidV4(uuid: string): boolean
// /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isValidUuidV7(uuid: string): boolean
// /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
```

---

## Wrangler設定 (`apps/worker/wrangler.jsonc`)

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
    "database_id": "placeholder-replace-after-d1-create"
  }]
}
```

デプロイ前に `wrangler d1 create uuid-raid-db` で作成し、`database_id` を差し替える。
