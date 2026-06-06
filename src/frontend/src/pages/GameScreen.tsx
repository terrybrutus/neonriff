import { GameHUD } from "@/components/GameHUD";
import { Highway3D } from "@/components/Highway3D";
import { getSong } from "@/data/songs";
import { useGameEngine } from "@/hooks/useGameEngine";
import { useKeyboardInput } from "@/hooks/useKeyboardInput";
import { useGameStore } from "@/store/gameStore";

export function GameScreen() {
  const selectedSongId = useGameStore((s) => s.selectedSongId);
  const difficulty = useGameStore((s) => s.difficulty);
  const pressedLanes = useGameStore((s) => s.pressedLanes);
  const endGame = useGameStore((s) => s.endGame);
  const health = useGameStore((s) => s.health);

  const song = getSong(selectedSongId);
  const chart = song.charts[difficulty];

  const { handleLanePress } = useGameEngine(song.duration, song.bpm);
  useKeyboardInput(handleLanePress);

  // Auto-end when health hits 0
  if (health <= 0) {
    endGame();
  }

  return (
    <div className="game-screen">
      {/* 3D highway takes full screen */}
      <div className="highway-canvas">
        <Highway3D pressedLanes={pressedLanes} bpm={song.bpm} />
      </div>

      {/* HUD overlaid on top */}
      <GameHUD />

      {/* Touch controls for mobile */}
      <div
        className="touch-controls pointer-events-auto"
        aria-label="Touch controls"
      >
        {[0, 1, 2, 3, 4].map((lane) => (
          <button
            key={lane}
            type="button"
            className="touch-lane"
            style={{
              background: pressedLanes[lane]
                ? `${["#00ff4144", "#ff174444", "#ffea0044", "#00b0ff44", "#ff6d0044"][lane]}`
                : "transparent",
            }}
            onPointerDown={() => handleLanePress(lane)}
          />
        ))}
      </div>

      {/* Song info overlay top-right */}
      <div className="song-info-overlay">
        <div className="song-name">{song.title}</div>
        <div className="song-artist">{song.artist}</div>
        <div className="song-diff">
          {difficulty.toUpperCase()} · {chart.length} NOTES
        </div>
      </div>

      {/* ESC hint */}
      <div className="esc-hint">ESC to quit</div>
    </div>
  );
}
