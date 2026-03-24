import { useState } from "react";
import { TitleScreen } from "./components/TitleScreen.js";
import { RaidRoom } from "./components/RaidRoom.js";

type Screen = "title" | "raid";

export function App() {
  const [screen, setScreen] = useState<Screen>("title");

  return (
    <div className="app crt">
      {screen === "title" && (
        <TitleScreen onStart={() => setScreen("raid")} />
      )}
      {screen === "raid" && <RaidRoom />}
    </div>
  );
}
