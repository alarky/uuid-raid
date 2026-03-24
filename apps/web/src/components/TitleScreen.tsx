interface Props {
  onStart: () => void;
}

export function TitleScreen({ onStart }: Props) {
  return (
    <div style={{ textAlign: "center" }}>
      <div className="title glow">UUID RAID</div>
      <div style={{ fontSize: "8px", marginBottom: "20px", color: "#666" }}>
        &quot;CAN UUIDs COLLIDE?&quot;
      </div>
      <div style={{ fontSize: "8px", marginBottom: "40px", color: "#888" }}>
        MULTIPLAYER UUID COLLISION RAID
      </div>
      <button className="btn blink" onClick={onStart}>
        PRESS START
      </button>
      <div
        style={{ fontSize: "7px", marginTop: "40px", color: "#444" }}
      >
        CHALLENGE ENTROPY WITH THE POWER OF RANDOMNESS
      </div>
    </div>
  );
}
