import { useState, useCallback, useRef, useEffect } from "react";
import type { ServerMessage, HitLevel, V7FiredEntry, HighScoreEntry } from "@uuid-raid/shared";
import { getHitLevel, LEVEL_COLORS } from "@uuid-raid/shared";
import { useWebSocket } from "./useWebSocket.js";

export interface ActiveHit {
  id: number;
  matchedBits: number;
  randHex1: string;
  randHex2: string;
  player1Id: string;
  player2Id: string;
  poolSize: number;
  level: HitLevel;
}

export interface RaidState {
  playerId: string;
  playerCount: number;
  v7AllTimeBest: number;
  v7AllTimeBestPlayer: string;
  v7TotalChecked: number;
  createdAt: number;
  clearedAt: number | null;
  activeHit: ActiveHit | null;
  /** Non-null when this player just set a new record and needs to enter name */
  pendingRecord: { matchedBits: number } | null;
  lastRecord: { matchedBits: number; player: string } | null;
}

const V7_ATTACK_INTERVAL = 200;
const V7_BATCH_SIZE = 10;
const V7_BOOST_BATCH_SIZE = 50;
const V7_TURBO_BATCH_SIZE = 100;

export function useRaidRoom() {
  const [state, setState] = useState<RaidState>({
    playerId: "",
    playerCount: 0,
    v7AllTimeBest: 0,
    v7AllTimeBestPlayer: "",
    v7TotalChecked: 0,
    createdAt: 0,
    clearedAt: null,
    activeHit: null,
    pendingRecord: null,
    lastRecord: null,
  });

  const [highScores, setHighScores] = useState<HighScoreEntry[] | null>(null);
  const [boosted, setBoosted] = useState(false);
  const [turbo, setTurbo] = useState(false);
  const [myStats, setMyStats] = useState({ bestBits: 0, totalSent: 0 });
  const attackTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playerIdRef = useRef("");
  const hitIdRef = useRef(0);
  const hitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bulletContainerRef = useRef<HTMLDivElement>(null);
  const playerNameRef = useRef<string | null>(null);

  // Bullet colors: override normal to darker green so dim bullets stand out less
  const BULLET_COLORS = { ...LEVEL_COLORS, normal: "#1a6b2a" };

  // Spawn bullet DOM elements from real UUIDs with hit-level coloring
  const spawnBullets = (entries: V7FiredEntry[]) => {
    // Track personal stats
    let batchBest = 0;
    for (const e of entries) {
      if (e.matchedBits > batchBest) batchBest = e.matchedBits;
    }
    setMyStats((s) => ({
      bestBits: Math.max(s.bestBits, batchBest),
      totalSent: s.totalSent + entries.length,
    }));

    const container = bulletContainerRef.current;
    if (!container) return;
    for (let i = 0; i < entries.length; i++) {
      const { randHex, matchedBits } = entries[i];
      const level = getHitLevel(matchedBits);
      const span = document.createElement("span");
      span.className = "bullet";
      span.style.color = BULLET_COLORS[level];
      const size = level === "legendary" ? 64 : level === "amazing" ? 28 : Math.min(6 + matchedBits * 0.5, 20);
      span.style.fontSize = `${size}px`;
      span.style.zIndex = String(matchedBits);
      if (level === "amazing" || level === "legendary") {
        span.classList.add("bullet-glow-pulse");
        const c = BULLET_COLORS[level];
        const g = Math.min(8 + matchedBits * 2, 40);
        span.style.setProperty("--glow-color", c);
        span.style.setProperty("--glow-size", `${g}px`);
      } else if (level === "great") {
        const c = BULLET_COLORS[level];
        const g = Math.min(8 + matchedBits * 2, 40);
        span.style.textShadow = `0 0 ${g}px ${c}, 0 0 ${g * 2}px ${c}`;
      }
      const duration = level === "legendary" ? 3.0 : level === "amazing" ? 2.0 : level === "great" ? 1.2 : 0.6;
      span.style.animationDuration = `${duration}s`;
      span.textContent = randHex.slice(0, 4);
      span.style.left = `${Math.random() * 85 + 5}%`;
      if (i > 0) span.style.animationDelay = `${i * 0.02}s`;
      container.appendChild(span);
      span.addEventListener("animationend", () => span.remove());
    }
  };

  const handleMessage = useCallback((msg: ServerMessage) => {
    switch (msg.type) {
      case "room_state":
        playerIdRef.current = msg.playerId;
        setState((s) => ({
          ...s,
          playerId: msg.playerId,
          playerCount: msg.playerCount,
          v7AllTimeBest: msg.v7AllTimeBest,
          v7AllTimeBestPlayer: msg.v7AllTimeBestPlayer,
          createdAt: msg.createdAt,
          clearedAt: msg.clearedAt,
        }));
        break;
      case "player_joined":
        setState((s) => ({ ...s, playerCount: msg.playerCount }));
        break;
      case "player_left":
        setState((s) => ({ ...s, playerCount: msg.playerCount }));
        break;
      case "v7_result": {
        const id = ++hitIdRef.current;
        const level = getHitLevel(msg.matchedBits);
        const hit: ActiveHit = {
          id,
          matchedBits: msg.matchedBits,
          randHex1: msg.randHex1,
          randHex2: msg.randHex2,
          player1Id: msg.player1Id,
          player2Id: msg.player2Id,
          poolSize: msg.poolSize,
          level,
        };
        setState((s) => ({ ...s, activeHit: hit }));

        // Clear previous timer and set new 800ms auto-clear
        if (hitTimerRef.current) clearTimeout(hitTimerRef.current);
        hitTimerRef.current = setTimeout(() => {
          setState((s) => (s.activeHit?.id === id ? { ...s, activeHit: null } : s));
        }, 800);
        break;
      }
      case "new_record": {
        const isMe = msg.playerId === playerIdRef.current;
        if (isMe) setHighScores(null);
        setState((s) => ({
          ...s,
          lastRecord: {
            matchedBits: msg.matchedBits,
            player: msg.player,
          },
          v7AllTimeBest: msg.matchedBits,
          clearedAt: msg.matchedBits >= 74 ? Date.now() : s.clearedAt,
          pendingRecord: isMe
            ? { matchedBits: msg.matchedBits }
            : s.pendingRecord,
        }));
        break;
      }
      case "record_claimed":
        setState((s) => ({
          ...s,
          v7AllTimeBestPlayer: msg.player,
          lastRecord: {
            matchedBits: msg.matchedBits,
            player: msg.player,
          },
        }));
        break;
      case "stats":
        setState((s) => ({
          ...s,
          v7TotalChecked: msg.v7TotalChecked,
          playerCount: msg.playerCount,
        }));
        break;
      case "v7_fired":
        spawnBullets(msg.entries);
        break;
      case "high_scores":
        setHighScores(msg.scores);
        break;
      case "error":
        console.warn(`[RAID ERROR] ${msg.code}: ${msg.message}`);
        break;
    }
  }, []);

  const { send, connected } = useWebSocket(handleMessage);

  // Join on connect
  useEffect(() => {
    if (connected) {
      send({ type: "join" });
    }
  }, [connected, send]);

  // Auto-fire attacks (stop if cleared)
  useEffect(() => {
    if (!connected || state.clearedAt) return;

    const batchSize = turbo ? V7_TURBO_BATCH_SIZE : boosted ? V7_BOOST_BATCH_SIZE : V7_BATCH_SIZE;
    attackTimerRef.current = setInterval(() => {
      send({ type: "attack_v7", count: batchSize });
    }, V7_ATTACK_INTERVAL);

    return () => {
      if (attackTimerRef.current) clearInterval(attackTimerRef.current);
    };
  }, [connected, boosted, turbo, send, state.clearedAt]);

  // Cleanup hit timer on unmount
  useEffect(() => {
    return () => {
      if (hitTimerRef.current) clearTimeout(hitTimerRef.current);
    };
  }, []);

  const toggleBoost = useCallback(() => setBoosted((b) => !b), []);

  const claimRecord = useCallback(
    (name: string) => {
      playerNameRef.current = name;
      send({ type: "claim_record", playerName: name });
      setState((s) => ({ ...s, pendingRecord: null }));
    },
    [send]
  );

  const dismissRecord = useCallback(() => {
    setState((s) => ({ ...s, pendingRecord: null }));
  }, []);

  return {
    state,
    boosted,
    connected,
    turbo,
    toggleBoost,
    startTurbo: useCallback(() => setTurbo(true), []),
    stopTurbo: useCallback(() => setTurbo(false), []),
    claimRecord,
    dismissRecord,
    bulletContainerRef,
    savedName: playerNameRef.current,
    myStats,
    highScores,
    requestHighScores: useCallback(() => {
      send({ type: "get_high_scores" });
    }, [send]),
    closeHighScores: useCallback(() => {
      setHighScores(null);
    }, []),
  };
}
