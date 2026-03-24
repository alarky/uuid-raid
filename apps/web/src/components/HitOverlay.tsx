import { LEVEL_COLORS } from "@uuid-raid/shared";
import type { ActiveHit } from "../hooks/useRaidRoom.js";

interface Props {
  activeHit: ActiveHit;
}

const HEX_DIGITS = 19; // ceil(74 / 4)

export function HitOverlay({ activeHit }: Props) {
  const matchedDigits = Math.floor(activeHit.matchedBits / 4);
  const color = LEVEL_COLORS[activeHit.level];
  const hex1 = activeHit.randHex1.slice(0, HEX_DIGITS);
  const hex2 = activeHit.randHex2.slice(0, HEX_DIGITS);

  return (
    <div key={activeHit.id} className="hit-overlay">
      <div className="hit-uuids">
        <span className="hit-matched" style={{ color }}>{hex1.slice(0, matchedDigits)}</span>
        <span className="hit-unmatched">{hex1.slice(matchedDigits)}</span>
      </div>
      <div className="hit-uuids">
        <span className="hit-matched" style={{ color }}>{hex2.slice(0, matchedDigits)}</span>
        <span className="hit-unmatched">{hex2.slice(matchedDigits)}</span>
      </div>
      <div className="hit-label" style={{ color }}>
        {activeHit.matchedBits} bits match!
        {activeHit.level !== "normal" && activeHit.level !== "dim" && ` ${activeHit.level.toUpperCase()}!`}
      </div>
    </div>
  );
}
