import { getSong } from "@/data/songs";
import { useGameStore } from "@/store/gameStore";
import { useGameActions, useGameStatus } from "@/store/gameStore";

function grade(accuracy: number): { letter: string; color: string } {
  if (accuracy >= 95) return { letter: "S", color: "#ffea00" };
  if (accuracy >= 85) return { letter: "A", color: "#00ff88" };
  if (accuracy >= 70) return { letter: "B", color: "#00b0ff" };
  if (accuracy >= 55) return { letter: "C", color: "#ff6d00" };
  return { letter: "F", color: "#ff2244" };
}

export function GameOverScreen() {
  const { score, maxCombo, accuracy } = useGameStatus();
  const { returnToStart, startGame } = useGameActions();
  const selectedSongId = useGameStore((s) => s.selectedSongId);
  const difficulty = useGameStore((s) => s.difficulty);
  const highScores = useGameStore((s) => s.highScores);
  const song = getSong(selectedSongId);

  const totalNotes =
    accuracy.perfect + accuracy.great + accuracy.good + accuracy.miss;
  const pctAccuracy =
    totalNotes === 0
      ? 100
      : Math.round(
          ((accuracy.perfect + accuracy.great * 0.8 + accuracy.good * 0.5) /
            totalNotes) *
            100,
        );

  const { letter, color } = grade(pctAccuracy);
  const hiKey = `${selectedSongId}:${difficulty}`;
  const hiScore = highScores[hiKey] ?? 0;
  const isNewRecord = score >= hiScore && score > 0;

  return (
    <div className="gameover-screen">
      <div className="bg-lines" aria-hidden="true">
        {Array.from({ length: 20 }, (_, i) => (
          <div
            key={i}
            className="bg-line"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>

      <div className="gameover-content">
        <div className="go-song-title">{song.title}</div>
        <div className="go-song-meta">
          {song.artist} · {difficulty.toUpperCase()}
        </div>

        {/* Grade */}
        <div
          className="go-grade"
          style={{ color, textShadow: `0 0 40px ${color}, 0 0 80px ${color}` }}
        >
          {letter}
        </div>

        {/* New record banner */}
        {isNewRecord && <div className="new-record">★ NEW RECORD ★</div>}

        {/* Stats grid */}
        <div className="go-stats">
          <div className="go-stat">
            <div className="go-stat-label">SCORE</div>
            <div className="go-stat-value">{score.toLocaleString()}</div>
          </div>
          <div className="go-stat">
            <div className="go-stat-label">ACCURACY</div>
            <div className="go-stat-value">{pctAccuracy}%</div>
          </div>
          <div className="go-stat">
            <div className="go-stat-label">MAX COMBO</div>
            <div className="go-stat-value">{maxCombo}x</div>
          </div>
          <div className="go-stat">
            <div className="go-stat-label">BEST</div>
            <div className="go-stat-value">{hiScore.toLocaleString()}</div>
          </div>
        </div>

        {/* Note breakdown */}
        <div className="go-breakdown">
          <div className="go-note perfect">
            <span>PERFECT</span>
            <span>{accuracy.perfect}</span>
          </div>
          <div className="go-note great">
            <span>GREAT</span>
            <span>{accuracy.great}</span>
          </div>
          <div className="go-note good">
            <span>GOOD</span>
            <span>{accuracy.good}</span>
          </div>
          <div className="go-note miss">
            <span>MISS</span>
            <span>{accuracy.miss}</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="go-buttons">
          <button type="button" className="go-btn retry" onClick={startGame}>
            RETRY
          </button>
          <button type="button" className="go-btn back" onClick={returnToStart}>
            MENU
          </button>
        </div>
      </div>
    </div>
  );
}
