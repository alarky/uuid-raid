import { countMatchingBits } from "@uuid-raid/shared";
import type {
  ClientMessage,
  ServerMessage,
} from "@uuid-raid/shared";

interface PlayerSession {
  id: string;
  name: string; // "???" until claimed
  ws: WebSocket;
  lastAttack: number;
  attackCount: number;
  /** ID of the pending record this player can claim */
  pendingRecordId: string | null;
}

interface V7PoolEntry {
  randomBytes: Uint8Array;
  randHex: string;
  playerId: string;
  uuid: string;
}

const MAX_ATTACK_RATE = 20; // max messages per second per player
const V7_ROUND_INTERVAL_MS = 1000;
const MAX_V7_BATCH = 100;
const MAX_POOL_SIZE = 10_000;

export class RaidRoom implements DurableObject {
  private sessions = new Map<WebSocket, PlayerSession>();
  private v7Pool: V7PoolEntry[] = [];
  private createdAt = 0;
  private clearedAt: number | null = null;
  private v7TotalChecked = 0;
  private v7AllTimeBest = 0;
  private v7AllTimeBestPlayer = "";
  private highScores: { matchedBits: number; player: string; timestamp: number }[] = [];
  private roundBest: {
    matchedBits: number;
    entry: V7PoolEntry;
    pairEntry: V7PoolEntry;
  } | null = null;

  constructor(
    private state: DurableObjectState,
  ) {
    this.state.blockConcurrencyWhile(async () => {
      let created = await this.state.storage.get<number>("createdAt");
      if (!created) {
        created = Date.now();
        await this.state.storage.put("createdAt", created);
      }
      this.createdAt = created;

      const cleared = await this.state.storage.get<number>("clearedAt");
      if (cleared) this.clearedAt = cleared;

      const best = await this.state.storage.get<number>("v7AllTimeBest");
      if (best !== undefined) this.v7AllTimeBest = best;

      const bestPlayer =
        await this.state.storage.get<string>("v7AllTimeBestPlayer");
      if (bestPlayer !== undefined) this.v7AllTimeBestPlayer = bestPlayer;

      const total = await this.state.storage.get<number>("v7TotalChecked");
      if (total !== undefined) this.v7TotalChecked = total;

      const scores = await this.state.storage.get<{ matchedBits: number; player: string; timestamp: number }[]>("highScores");
      if (scores) this.highScores = scores;
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.hostname === "internal" && url.pathname === "/seed") {
      const count = Math.min(parseInt(url.searchParams.get("count") ?? "1000", 10), 50_000);
      for (let i = 0; i < count; i++) {
        const randomBytes = new Uint8Array(10);
        crypto.getRandomValues(randomBytes);
        randomBytes[9] &= 0xc0;
        const randHex = Array.from(randomBytes)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        const uuid = this.formatUuidV7(randomBytes);
        this.v7Pool.push({ randomBytes, randHex, playerId: "seed", uuid });
      }
      if (this.v7Pool.length > MAX_POOL_SIZE) {
        this.v7Pool = this.v7Pool.slice(this.v7Pool.length - MAX_POOL_SIZE);
      }
      return new Response(
        JSON.stringify({ seeded: count, poolSize: this.v7Pool.length }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    if (url.hostname === "internal" && url.pathname === "/stats") {
      return new Response(
        JSON.stringify({
          v7TotalChecked: this.v7TotalChecked,
          v7AllTimeBest: this.v7AllTimeBest,
          v7AllTimeBestPlayer: this.v7AllTimeBestPlayer,
          playerCount: this.sessions.size,
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    const upgradeHeader = request.headers.get("Upgrade");
    if (!upgradeHeader || upgradeHeader !== "websocket") {
      return new Response("Expected WebSocket", { status: 426 });
    }

    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];

    this.state.acceptWebSocket(server);

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, rawMessage: string | ArrayBuffer) {
    if (typeof rawMessage !== "string") return;

    let msg: ClientMessage;
    try {
      msg = JSON.parse(rawMessage);
    } catch {
      this.sendTo(ws, { type: "error", message: "Invalid JSON", code: "PARSE_ERROR" });
      return;
    }

    switch (msg.type) {
      case "join":
        this.handleJoin(ws);
        break;
      case "attack_v7":
        this.handleAttackV7(ws, msg.count);
        break;
      case "claim_record":
        this.handleClaimRecord(ws, msg.playerName);
        break;
      case "get_high_scores":
        this.sendTo(ws, { type: "high_scores", scores: this.highScores });
        break;
      default:
        this.sendTo(ws, {
          type: "error",
          message: "Unknown message type",
          code: "UNKNOWN_TYPE",
        });
    }
  }

  async webSocketClose(ws: WebSocket) {
    this.handleDisconnect(ws);
  }

  async webSocketError(ws: WebSocket) {
    this.handleDisconnect(ws);
  }

  async alarm() {
    this.processV7Round();
    await this.state.storage.put("v7TotalChecked", this.v7TotalChecked);
    if (this.sessions.size > 0) {
      this.state.storage.setAlarm(Date.now() + V7_ROUND_INTERVAL_MS);
    }
  }

  // ---- Handlers ----

  private handleJoin(ws: WebSocket) {
    const id = crypto.randomUUID();
    const session: PlayerSession = {
      id,
      name: "???",
      ws,
      lastAttack: 0,
      attackCount: 0,
      pendingRecordId: null,
    };
    this.sessions.set(ws, session);

    this.sendTo(ws, {
      type: "room_state",
      playerId: id,
      playerCount: this.sessions.size,
      v7AllTimeBest: this.v7AllTimeBest,
      v7AllTimeBestPlayer: this.v7AllTimeBestPlayer,
      createdAt: this.createdAt,
      clearedAt: this.clearedAt,
    });

    this.broadcast({
      type: "player_joined",
      playerCount: this.sessions.size,
    });

    // Start alarm if this is the first player
    if (this.sessions.size === 1) {
      this.state.storage.setAlarm(Date.now() + V7_ROUND_INTERVAL_MS);
    }
  }

  private handleAttackV7(ws: WebSocket, rawCount: number) {
    const session = this.sessions.get(ws);
    if (!session) return;
    if (this.clearedAt) return;

    if (!this.checkRate(session)) {
      this.sendTo(ws, {
        type: "error",
        message: "Too fast! Slow down.",
        code: "RATE_LIMITED",
      });
      return;
    }

    const count = Math.min(Math.max(1, Math.floor(rawCount)), MAX_V7_BATCH);

    const entries: { randHex: string; matchedBits: number }[] = [];

    for (let i = 0; i < count; i++) {
      const randomBytes = new Uint8Array(10);
      crypto.getRandomValues(randomBytes);
      randomBytes[9] &= 0xc0; // 74 random bits: 9 bytes + 2 bits

      const randHex = Array.from(randomBytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      // Compare against all existing pool entries to find best match
      let best = 0;
      let bestPairIdx = -1;
      for (let j = 0; j < this.v7Pool.length; j++) {
        const mb = countMatchingBits(randomBytes, this.v7Pool[j].randomBytes);
        if (mb > best) { best = mb; bestPairIdx = j; }
      }

      best = Math.min(best, 74);
      const uuid = this.formatUuidV7(randomBytes);
      const poolEntry: V7PoolEntry = { randomBytes, randHex, playerId: session.id, uuid };
      this.v7Pool.push(poolEntry);
      entries.push({ randHex, matchedBits: best });

      // Track round best
      if (best > (this.roundBest?.matchedBits ?? 0) && bestPairIdx >= 0) {
        this.roundBest = {
          matchedBits: best,
          entry: poolEntry,
          pairEntry: this.v7Pool[bestPairIdx],
        };
      }
    }
    this.sendTo(ws, { type: "v7_fired", entries });
  }

  private handleClaimRecord(ws: WebSocket, rawName: string) {
    const session = this.sessions.get(ws);
    if (!session) return;

    if (!session.pendingRecordId) {
      this.sendTo(ws, {
        type: "error",
        message: "No record to claim",
        code: "NO_RECORD",
      });
      return;
    }

    const name = rawName.replace(/[^A-Za-z0-9]/g, "").slice(0, 16).toUpperCase();
    if (name.length === 0) {
      this.sendTo(ws, {
        type: "error",
        message: "Name must be 1-16 alphanumeric characters",
        code: "INVALID_NAME",
      });
      return;
    }

    session.name = name;
    session.pendingRecordId = null;

    // Update persisted record
    this.v7AllTimeBestPlayer = name;
    this.state.storage.put("v7AllTimeBestPlayer", name);

    // Update placeholder name in high scores
    const entry = this.highScores.find(
      (e) => e.matchedBits === this.v7AllTimeBest && e.player === "???"
    );
    if (entry) {
      entry.player = name;
      this.state.storage.put("highScores", this.highScores);
    }

    this.broadcast({
      type: "record_claimed",
      matchedBits: this.v7AllTimeBest,
      player: name,
    });
  }

  private handleDisconnect(ws: WebSocket) {
    this.sessions.delete(ws);
    this.broadcast({
      type: "player_left",
      playerCount: this.sessions.size,
    });
  }

  // ---- v7 Round Processing ----

  private processV7Round() {
    // Trim pool to max size, keeping newest entries
    if (this.v7Pool.length > MAX_POOL_SIZE) {
      this.v7Pool = this.v7Pool.slice(this.v7Pool.length - MAX_POOL_SIZE);
    }

    this.v7TotalChecked += this.v7Pool.length;

    // Broadcast round best (accumulated from v7_fired comparisons)
    if (this.roundBest) {
      const { matchedBits, entry, pairEntry } = this.roundBest;
      this.roundBest = null;

      this.broadcast({
        type: "v7_result",
        matchedBits,
        uuid1: entry.uuid,
        uuid2: pairEntry.uuid,
        randHex1: entry.randHex,
        randHex2: pairEntry.randHex,
        player1Id: entry.playerId,
        player2Id: pairEntry.playerId,
        poolSize: this.v7Pool.length,
      });

      if (matchedBits > this.v7AllTimeBest) {
        this.v7AllTimeBest = matchedBits;
        this.v7AllTimeBestPlayer = "";
        this.state.storage.put("v7AllTimeBest", matchedBits);
        this.state.storage.put("v7AllTimeBestPlayer", "");

        // Add to high scores with placeholder name
        this.highScores.push({ matchedBits, player: "???", timestamp: Date.now() });
        this.highScores.sort((a, b) => b.matchedBits - a.matchedBits);
        this.highScores = this.highScores.slice(0, 10);
        this.state.storage.put("highScores", this.highScores);

        // Mark the player as having a pending record to claim
        const recordId = crypto.randomUUID();
        for (const session of this.sessions.values()) {
          if (session.id === entry.playerId) {
            session.pendingRecordId = recordId;
            break;
          }
        }

        this.broadcast({
          type: "new_record",
          matchedBits,
          player: "",
          playerId: entry.playerId,
        });

        // Game cleared!
        if (matchedBits >= 74) {
          this.clearedAt = Date.now();
          this.state.storage.put("clearedAt", this.clearedAt);
        }
      }
    }

    this.broadcast({
      type: "stats",
      v7TotalChecked: this.v7TotalChecked,
      playerCount: this.sessions.size,
    });
  }

  // ---- Helpers ----

  private checkRate(session: PlayerSession): boolean {
    const now = Date.now();
    if (now - session.lastAttack > 1000) {
      session.attackCount = 0;
      session.lastAttack = now;
    }
    session.attackCount++;
    return session.attackCount <= MAX_ATTACK_RATE;
  }

  private sendTo(ws: WebSocket, msg: ServerMessage) {
    try {
      ws.send(JSON.stringify(msg));
    } catch {
      // Connection may be closed
    }
  }

  private broadcast(msg: ServerMessage) {
    const data = JSON.stringify(msg);
    for (const session of this.sessions.values()) {
      try {
        session.ws.send(data);
      } catch {
        // Will be cleaned up on close
      }
    }
  }

  private formatUuidV7(randomBytes: Uint8Array): string {
    const now = Date.now();
    const hex = (n: number, len: number) =>
      n.toString(16).padStart(len, "0");
    const timeHex = hex(now, 12);
    const randHex = Array.from(randomBytes)
      .map((b) => hex(b, 2))
      .join("");

    return [
      timeHex.slice(0, 8),
      timeHex.slice(8, 12),
      "7" + randHex.slice(0, 3),
      ((parseInt(randHex.slice(3, 5), 16) & 0x3f) | 0x80)
        .toString(16)
        .padStart(2, "0") + randHex.slice(5, 7),
      randHex.slice(7, 19),
    ].join("-");
  }
}
