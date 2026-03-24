import { useRaidRoom } from "../hooks/useRaidRoom.js";
import { Wall } from "./Wall.js";
import { HitOverlay } from "./HitOverlay.js";
import { BulletRain } from "./BulletRain.js";
import { AttackStats } from "./AttackStats.js";
import { NameInput } from "./NameInput.js";

export function RaidRoom() {
  const {
    state,
    boosted,
    turbo,
    connected,
    toggleBoost,
    startTurbo,
    stopTurbo,
    claimRecord,
    dismissRecord,
    bulletContainerRef,
    savedName,
    myStats,
    highScores,
    requestHighScores,
    closeHighScores,
  } = useRaidRoom();

  if (!connected) {
    return (
      <div style={{ textAlign: "center" }}>
        <div className="glow blink">CONNECTING...</div>
      </div>
    );
  }

  return (
    <div className="raid-container">
      {/* Bullets fly across entire container */}
      <BulletRain ref={bulletContainerRef} />

      {/* The Wall */}
      <Wall
        v7AllTimeBest={state.v7AllTimeBest}
        v7AllTimeBestPlayer={state.v7AllTimeBestPlayer}
        createdAt={state.createdAt}
        clearedAt={state.clearedAt}
        v7TotalChecked={state.v7TotalChecked}
        activeHit={state.activeHit}
        onShowHighScores={requestHighScores}
      />

      {/* Battle area with hit overlay */}
      <div className="battle-area">
        {state.activeHit && <HitOverlay activeHit={state.activeHit} />}
      </div>

      {/* Stats Bar */}
      <AttackStats
        boosted={boosted}
        turbo={turbo}
        playerCount={state.playerCount}
        myBestBits={myStats.bestBits}
        myTotalSent={myStats.totalSent}
        onToggleBoost={toggleBoost}
        onStartTurbo={startTurbo}
        onStopTurbo={stopTurbo}
      />

      {state.pendingRecord && (
        <div className="record-modal">
          <div className="record-modal-inner">
            <div
              style={{ fontSize: "12px", marginBottom: "8px" }}
              className="glow-yellow"
            >
              NEW RECORD! {state.pendingRecord.matchedBits} BITS
            </div>
            <div
              style={{ fontSize: "8px", marginBottom: "16px", color: "#888" }}
            >
              ENTER YOUR NAME FOR THE HIGH SCORE
            </div>
            <NameInput onSubmit={claimRecord} defaultName={savedName ?? undefined} />
            <button
              className="btn"
              style={{ marginTop: "12px", fontSize: "7px", opacity: 0.5 }}
              onClick={dismissRecord}
            >
              SKIP
            </button>
          </div>
        </div>
      )}

      {highScores && (
        <div className="record-modal" onClick={closeHighScores}>
          <div className="record-modal-inner" onClick={(e) => e.stopPropagation()}>
            <div
              style={{ fontSize: "12px", marginBottom: "16px" }}
              className="glow-yellow"
            >
              HIGH SCORES
            </div>
            {highScores.length === 0 ? (
              <div style={{ color: "#666", fontSize: "8px" }}>NO RECORDS YET</div>
            ) : (
              <table className="high-scores-table">
                <tbody>
                  {highScores.map((s, i) => (
                    <tr key={i}>
                      <td style={{ color: "#666" }}>{i + 1}.</td>
                      <td className="glow">{s.player}</td>
                      <td className="glow-red">{s.matchedBits} bits</td>
                      <td style={{ color: "#444", fontSize: "7px" }}>
                        {new Date(s.timestamp).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <button
              className="btn"
              style={{ marginTop: "16px", fontSize: "8px" }}
              onClick={closeHighScores}
            >
              CLOSE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
