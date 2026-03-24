# WebSocket プロトコル

接続先: `/ws` エンドポイント（HTTP → WebSocket upgrade）

テキストフレーム、1メッセージ = 1 JSONオブジェクト。

## Client → Server

### `join`

参加リクエスト。接続後最初に送る。

```json
{ "type": "join", "playerName": "ABC" }
```

- `playerName`: 1-3文字、英数字のみ。サーバー側で大文字化・サニタイズ。

### `attack_v7`

v7モード攻撃。サーバーが `count` 個の74bitランダム値を生成してpoolに追加。

```json
{ "type": "attack_v7", "count": 10 }
```

- `count`: 1-100 (上限クランプ)

### `attack_v4`

v4モード攻撃。サーバーが1個のUUID v4を生成してD1に登録。

```json
{ "type": "attack_v4" }
```

---

## Server → Client

### `room_state`

join時およびquota更新時に送信。現在のルーム状態。

```json
{
  "type": "room_state",
  "players": [{ "name": "ABC", "id": "uuid-..." }],
  "v7AllTimeBest": 12,
  "v4TotalRegistered": 50000,
  "v4QuotaRemaining": 2950000
}
```

### `player_joined`

プレイヤー参加時にbroadcast。

```json
{
  "type": "player_joined",
  "name": "XYZ",
  "playerCount": 5
}
```

### `player_left`

プレイヤー離脱時にbroadcast。

```json
{
  "type": "player_left",
  "playerCount": 4
}
```

### `v7_result`

毎ラウンド（1秒ごと）のv7照合結果。poolの中で最も似ていたペアを報告。

```json
{
  "type": "v7_result",
  "matchedBits": 8,
  "uuid1": "01902f3a-4b5c-7d8e-9f0a-1b2c3d4e5f6a",
  "uuid2": "01902f3a-4b5c-7d8f-a012-3b4c5d6e7f8a",
  "player1": "ABC",
  "player2": "XYZ",
  "poolSize": 250
}
```

### `v4_registered`

v4 UUID登録成功時に送信元プレイヤーに返信。

```json
{
  "type": "v4_registered",
  "uuid": "550e8400-e29b-41d4-a716-446655440000",
  "totalRegistered": 50001,
  "quotaRemaining": 2949999
}
```

### `v4_collision`

UUID v4衝突検出時にbroadcast。**理論上起きない。**

```json
{
  "type": "v4_collision",
  "uuid": "550e8400-e29b-41d4-a716-446655440000",
  "player1": "ABC",
  "player2": "XYZ"
}
```

### `new_record`

歴代最高一致ビット数更新時にbroadcast。

```json
{
  "type": "new_record",
  "mode": "v7",
  "matchedBits": 18,
  "player": "ABC"
}
```

### `stats`

毎ラウンドbroadcast。全体統計。

```json
{
  "type": "stats",
  "v7TotalChecked": 1500000,
  "v4TotalRegistered": 50001,
  "playerCount": 5
}
```

### `error`

エラー通知。送信元プレイヤーにのみ返信。

```json
{
  "type": "error",
  "message": "Too fast! Slow down.",
  "code": "RATE_LIMITED"
}
```

**エラーコード一覧:**

| code | 原因 |
|---|---|
| `PARSE_ERROR` | JSONパース失敗 |
| `UNKNOWN_TYPE` | 未知のメッセージtype |
| `INVALID_NAME` | 名前が空 or 不正文字 |
| `RATE_LIMITED` | 20 msg/sec超過 |
| `QUOTA_EXHAUSTED` | 月間v4 quota上限到達 |
| `DB_ERROR` | D1接続/操作エラー |
