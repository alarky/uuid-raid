# CLI フロントエンド設計

Node.js + ws ライブラリ。ターミナルで動くレトロUI。

## 起動

```bash
npx uuid-raid                                     # デフォルト (v7モード)
npx uuid-raid --v4                                 # v4モードで開始
npx uuid-raid --server=ws://localhost:8787/ws      # ローカル接続
```

デフォルト接続先: `wss://uuid-raid.workers.dev/ws`

---

## フロー

1. ASCIIアートタイトル表示
2. 名前入力 (readline、3文字英数字、大文字化)
3. WebSocket接続
4. `join` メッセージ送信
5. オートファイア開始
6. キーボード入力受付 (raw mode)
7. Ctrl+C or Q で終了

---

## キーボード操作

TTY raw mode で1キーずつ処理。

| キー | 動作 |
|---|---|
| `Enter` / `Space` | ブースト ON/OFF トグル |
| `V` | v7 ↔ v4 モード切替 |
| `Q` | 終了 |
| `Ctrl+C` | 強制終了 |

ブースト/モード切替時にオートファイアタイマーを再作成。

---

## オートファイア

| モード | 間隔 | バッチサイズ | ブースト時 |
|---|---|---|---|
| v7 | 200ms | 10 | 50 |
| v4 | 1000ms | 1 | 1 |

Web版と同一パラメータ。

---

## ターミナルUI (`src/ui.ts`)

### ANSIカラー

```
green (#32)     brightGreen (#92)
red (#31)       brightRed (#91)
yellow (#33)    brightYellow (#93)
cyan (#36)      brightCyan (#96)
magenta (#35)   dim (#2)   bold (#1)
```

### 表示メソッド

**`showTitle()`**
- `console.clear()` + ASCIIアートロゴ
```
██╗   ██╗██╗   ██╗██╗██████╗     ██████╗  █████╗ ██╗██████╗
██║   ██║██║   ██║██║██╔══██╗    ██╔══██╗██╔══██╗██║██╔══██╗
...
```

**`askName()`**
- readline.question で入力
- 英数字以外除去、3文字に切り詰め、大文字化
- デフォルト: "AAA"

**`showConnected(mode)`**
- `[Enter/Space] Boost | [V] Toggle v7/v4 | [Q] Quit`

**`showBoost(active)`**
- `>>> BOOST ACTIVE <<<` or `    boost off    ` (`\r` で行上書き)

### メッセージ表示

| msg.type | 表示 |
|---|---|
| `room_state` | `Room: N players \| Best: N bits` (dim) |
| `player_joined` | `+ NAME joined (N online)` (dim) |
| `player_left` | (表示なし、内部カウンタ更新) |
| `v7_result` | `[Nbit] P1 x P2 LEVEL!` (レベル別色) |
| `v4_registered` | `v4 uuid-uuid... registered (N total, M left)` (cyan) |
| `v4_collision` | `!!! COLLISION DETECTED !!! uuid P1 = P2 !!!` (brightRed bold) |
| `new_record` | `★ NEW RECORD! Player - N BITS (mode) ★` (brightYellow bold) |
| `stats` | `[NP] v7:X.XM v4:X.XK best:Nbit` (dim, `\r`で上書き) |
| `error` | `[!] message` (red) |

### 数値フォーマット

- 10億+ → `X.XB`
- 100万+ → `X.XM`
- 1000+ → `X.XK`
- それ以下 → そのまま

---

## WebSocket管理 (`src/ws.ts`)

```typescript
function connectWebSocket(
  url: string,
  playerName: string,
  v4Mode: boolean,
  ui: TerminalUI
): WebSocket
```

- `ws` ライブラリ使用
- open → join送信 + オートファイア開始 + keyboard listener
- message → JSON parse → `ui.handleMessage()`
- close → タイマー停止 + `ui.showDisconnected()`
- error → `ui.showError()`

---

## ビルド設定

### package.json

```json
{
  "name": "uuid-raid",
  "bin": { "uuid-raid": "./dist/index.js" },
  "dependencies": {
    "@uuid-raid/shared": "workspace:*",
    "ws": "^8.18.0"
  }
}
```

- 開発: `tsx src/index.ts`
- ビルド: `tsc` → `dist/index.js` (shebang付き)
- 公開: `npm publish` → `npx uuid-raid` で実行可能
