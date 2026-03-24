import { useState, useEffect } from "react";
import { LEVEL_COLORS } from "@uuid-raid/shared";
import type { ActiveHit } from "../hooks/useRaidRoom.js";

const TOTAL_BITS = 74; // rand_a(12) + rand_b(62)

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  return `${m}m ${sec}s`;
}

interface Props {
  v7AllTimeBest: number;
  v7AllTimeBestPlayer: string;
  createdAt: number;
  clearedAt: number | null;
  v7TotalChecked: number;
  activeHit: ActiveHit | null;
  onShowHighScores: () => void;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

export function Wall({ v7AllTimeBest, v7AllTimeBestPlayer, createdAt, clearedAt, v7TotalChecked, activeHit, onShowHighScores }: Props) {
  const hitPercent = activeHit ? (activeHit.matchedBits / TOTAL_BITS) * 100 : 0;
  const hitColor = activeHit ? LEVEL_COLORS[activeHit.level] : undefined;

  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    if (!createdAt) return;
    if (clearedAt) {
      setElapsed(formatElapsed(clearedAt - createdAt));
      return;
    }
    const update = () => setElapsed(formatElapsed(Date.now() - createdAt));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [createdAt, clearedAt]);

  return (
    <div className="wall-container">
      <div className="wall-label">
        <div>
          <span className="glow-red">ENTROPY UUIDv7</span>
        </div>
        <div className="wall-record">
          <div className="wall-progress">
            <div className="wall-alive">attacked {v7TotalChecked > 0 ? formatNumber(v7TotalChecked) : "-"}</div>
            {elapsed && <div className="wall-alive">uptime {elapsed}</div>}
            {v7AllTimeBest}/{TOTAL_BITS} bits cracked
            {v7AllTimeBestPlayer && v7AllTimeBestPlayer !== "???" && (
              <div>by {v7AllTimeBestPlayer}</div>
            )}
          </div>
          <button
            className="btn"
            style={{ padding: "2px 6px", fontSize: "7px" }}
            onClick={onShowHighScores}
          >
            HI
          </button>
        </div>
      </div>

      <div className="wall-gauge-track">
        <div
          className="wall-gauge-fill"
          style={{ width: `${(v7AllTimeBest / TOTAL_BITS) * 100}%` }}
        />
        {activeHit && (
          <div
            key={activeHit.id}
            className="wall-gauge-hit"
            style={{ width: `${hitPercent}%`, backgroundColor: hitColor }}
          />
        )}
      </div>
    </div>
  );
}