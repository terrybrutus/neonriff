import { GameHUD } from "@/components/GameHUD";
import { GameHighway } from "@/components/GameHighway";
import { LaneGlowEffects } from "@/components/LaneGlowEffects";
import { ParticleSystem } from "@/components/ParticleSystem";
import { StageLighting } from "@/components/StageLighting";
import { useGameEngine } from "@/hooks/useGameEngine";
import { useKeyboardInput } from "@/hooks/useKeyboardInput";
import { GameOverScreen } from "@/pages/GameOverScreen";
import { StartScreen } from "@/pages/StartScreen";
import { useGameStore } from "@/store/gameStore";
import TouchControls from "./components/TouchControls";

export default function App() {
  const gameState = useGameStore((s) => s.gameState);
  const screenShake = useGameStore((s) => s.screenShake);

  const { attemptHit } = useGameEngine();
  useKeyboardInput(attemptHit);

  return (
    <div
      className={`relative w-screen h-screen bg-black overflow-hidden ${screenShake.active ? "animate-screen-shake" : ""}`}
      data-ocid="game.container"
    >
      {gameState === "idle" && <StartScreen />}
      {gameState === "playing" && (
        <>
          <StageLighting />
          <GameHighway />
          <LaneGlowEffects />
          <ParticleSystem />
          <GameHUD />
          <TouchControls />
        </>
      )}
      {gameState === "gameover" && <GameOverScreen />}
    </div>
  );
}
