import { GameOverScreen } from "@/pages/GameOverScreen";
import { GameScreen } from "@/pages/GameScreen";
import { StartScreen } from "@/pages/StartScreen";
import { useGameStore } from "@/store/gameStore";
import { useEffect } from "react";

export default function App() {
  const screen = useGameStore((s) => s.screen);
  const returnToStart = useGameStore((s) => s.returnToStart);

  // ESC key to return to menu from game
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && screen === "game") {
        returnToStart();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [screen, returnToStart]);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "#000008",
      }}
    >
      {screen === "start" && <StartScreen />}
      {screen === "game" && <GameScreen />}
      {screen === "gameover" && <GameOverScreen />}
    </div>
  );
}
