# ゲームメカニクス

## ボス: ENTROPY

- HP: ∞（倒せない）
- 全プレイヤーの攻撃結果を蓄積・表示
- 歴代最高一致ビット数がハイスコア

---

## v7 リアルタイムレイド

### 流れ

```
Player → attack_v7 {count: 10}
  ↓
Server: crypto.getRandomValues() で 74bit × 10 を生成
  ↓
Pool に蓄積 (全プレイヤー分)
  ↓
Alarm (1秒) → ソート → 隣接比較 → 最長一致を検出
  ↓
v7_result broadcast → Pool クリア
```

### Birthday Paradox

74bitランダム値のBirthday Bound: 2^37 ≈ 1,370億個

→ 完全一致には膨大な量が必要だが、部分一致は十分起こる。
→ プレイヤーが増えるほどpoolが大きくなり、より良い一致が出やすい = **レイドの意味**。

### プレイヤー数と期待値

1ラウンド(1秒)のpool内ペア数 = N × (N-1) / 2

| 同時プレイヤー | 1秒あたりUUID数 | ペア数 | 8bit一致の確率 |
|---|---|---|---|
| 1人 | 50 | 1,225 | ~0.5% |
| 10人 | 500 | 124,750 | ~39% |
| 100人 | 5,000 | 12,497,500 | ~99.9% |

(1ペアあたりの8bit一致確率 = 1/256 ≈ 0.39%)

---

## v4 耐久チャレンジ

### 流れ

```
Player → attack_v4
  ↓
Server: crypto.randomUUID() で UUID v4 生成
  ↓
D1: SELECT で衝突チェック → INSERT
  ↓
v4_registered (or v4_collision) 返信
```

### Birthday Paradox

122bitランダム値のBirthday Bound: 2^61 ≈ 2.3 × 10^18 (230京)

→ 月300万UUIDでは文字通り天文学的に衝突しない。

### Quota

- 基本: 300万UUID/月 (D1 Workers Free) → $0
- Donate $5 → Workers Paid → 5000万/月
- さらにdonate → quota追加
- 月初リセット（月キーが変わるため自動）

---

## 演出レベル

一致ビット数に応じて演出が変化。

| レベル | ビット数 | 演出 |
|---|---|---|
| normal | 0-9 | 通常表示 |
| good | 10-13 | シアン + "GOOD!" |
| great | 14-17 | 黄色 + "GREAT!" |
| amazing | 18-23 | オレンジ + "AMAZING!" |
| legendary | 24+ | 赤 + "LEGENDARY!" |

### レコード

- v7の歴代最高一致ビット数をDO Storageに永続化
- 更新時に `new_record` を全プレイヤーにbroadcast

---

## プレイヤー操作

### 共通

- **接続 = 自動攻撃開始**（オートファイア）
- ブースト: バッチサイズ 10→50 (v7)
- モード切替: v7 ↔ v4

### Web

| 操作 | UIコンポーネント |
|---|---|
| モード切替 | v7/v4 ボタン |
| ブースト | BOOST ボタン |

### CLI

| キー | 操作 |
|---|---|
| Enter / Space | ブーストトグル |
| V | モード切替 |
| Q | 終了 |

---

## Anti-cheat

- UUID生成は**サーバー側のみ** → データ捏造不可能
- Rate limiting: 20 msg/sec/player (DO内カウンタ)
- v4はquotaで自然制限
- クライアントは「何個生成してくれ」とリクエストするだけ
