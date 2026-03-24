import { getHitLevel, LEVEL_COLORS } from "@uuid-raid/shared";

interface Props {
  boosted: boolean;
  turbo: boolean;
  playerCount: number;
  myBestBits: number;
  myTotalSent: number;
  onToggleBoost: () => void;
  onStartTurbo: () => void;
  onStopTurbo: () => void;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}


export function AttackStats({
  boosted,
  turbo,
  playerCount,
  myBestBits,
  myTotalSent,
  onToggleBoost,
  onStartTurbo,
  onStopTurbo,
}: Props) {
  const level = getHitLevel(myBestBits);
  const levelColor = LEVEL_COLORS[level];

  return (
    <div className="stats-panel">
      <div className="stats-row">
        <span>{playerCount}P online</span>
        <span>fired {formatNumber(myTotalSent)}</span>
      </div>
      <div className="stats-row">
        <span>
          best{" "}
          <span style={{ color: levelColor }}>
            {myBestBits > 0 ? `${myBestBits} bits` : "-"}
            {level !== "dim" && level !== "normal" && ` ${level.toUpperCase()}`}
          </span>
        </span>
        <div style={{ display: "flex", gap: "4px" }}>
          <button
            className={`btn ${boosted ? "active" : ""}`}
            style={{ padding: "4px 8px", fontSize: "8px" }}
            onClick={onToggleBoost}
          >
            BOOST
          </button>
          <button
            className={`btn btn-red ${turbo ? "active" : ""}`}
            style={{ padding: "4px 8px", fontSize: "8px" }}
            onMouseDown={onStartTurbo}
            onMouseUp={onStopTurbo}
            onMouseLeave={onStopTurbo}
            onTouchStart={onStartTurbo}
            onTouchEnd={onStopTurbo}
          >
            TURBO
          </button>
        </div>
      </div>
    </div>
  );
}
