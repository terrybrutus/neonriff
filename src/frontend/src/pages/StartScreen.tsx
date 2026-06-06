import { SONGS } from "@/data/songs";
import { useGameStore } from "@/store/gameStore";
import type { Difficulty } from "@/types/game";
const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "EASY",
  medium: "MEDIUM",
  hard: "HARD",
  expert: "EXPERT",
};

const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  easy: "#00ff88",
  medium: "#00b0ff",
  hard: "#ff6d00",
  expert: "#ff0055",
};

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard", "expert"];

export function StartScreen() {
  const selectedSongId = useGameStore((s) => s.selectedSongId);
  const difficulty = useGameStore((s) => s.difficulty);
  const selectSong = useGameStore((s) => s.selectSong);
  const selectDifficulty = useGameStore((s) => s.selectDifficulty);
  const startGame = useGameStore((s) => s.startGame);
  const highScores = useGameStore((s) => s.highScores);
  const hiKey = `${selectedSongId}:${difficulty}`;
  const hiScore = highScores[hiKey] ?? 0;

  return (
    <div className="start-screen">
      {/* Animated background lines */}
      <div className="bg-lines" aria-hidden="true">
        {Array.from({ length: 20 }, (_, i) => (
          <div
            key={i}
            className="bg-line"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>

      <div className="start-content">
        {/* Title */}
        <div className="title-area">
          <h1 className="game-title">NEON RIFF</h1>
          <p className="game-subtitle">RHYTHM · ROCK · GLORY</p>
        </div>

        {/* Song selection */}
        <div className="section-card">
          <h2 className="section-label">SELECT TRACK</h2>
          <div className="song-list">
            {SONGS.map((song) => (
              <button
                key={song.id}
                type="button"
                className={`song-item ${song.id === selectedSongId ? "selected" : ""}`}
                onClick={() => selectSong(song.id)}
              >
                <div className="song-info">
                  <div className="song-title">{song.title}</div>
                  <div className="song-meta">
                    {song.artist} · {song.bpm} BPM
                  </div>
                </div>
                {song.id === selectedSongId && (
                  <div className="song-selected-indicator">▶</div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty selection */}
        <div className="section-card">
          <h2 className="section-label">DIFFICULTY</h2>
          <div className="diff-grid">
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                type="button"
                className={`diff-btn ${d === difficulty ? "active" : ""}`}
                style={
                  d === difficulty
                    ? {
                        borderColor: DIFFICULTY_COLORS[d],
                        color: DIFFICULTY_COLORS[d],
                        boxShadow: `0 0 18px ${DIFFICULTY_COLORS[d]}88, inset 0 0 10px ${DIFFICULTY_COLORS[d]}22`,
                      }
                    : {}
                }
                onClick={() => selectDifficulty(d)}
              >
                {DIFFICULTY_LABELS[d]}
              </button>
            ))}
          </div>
        </div>

        {/* High score */}
        {hiScore > 0 && (
          <div className="hi-score">
            BEST:{" "}
            <span style={{ color: "#ffea00" }}>{hiScore.toLocaleString()}</span>
          </div>
        )}

        {/* Controls reference */}
        <div className="controls-hint">
          <span className="key-badge">A</span>
          <span
            className="key-badge"
            style={{ color: "#ff1744", borderColor: "#ff1744" }}
          >
            S
          </span>
          <span
            className="key-badge"
            style={{ color: "#ffea00", borderColor: "#ffea00" }}
          >
            D
          </span>
          <span
            className="key-badge"
            style={{ color: "#00b0ff", borderColor: "#00b0ff" }}
          >
            F
          </span>
          <span
            className="key-badge"
            style={{
              color: "#ff6d00",
              borderColor: "#ff6d00",
              minWidth: "3.5rem",
            }}
          >
            SPC
          </span>
        </div>

        {/* Start button */}
        <button type="button" className="start-btn" onClick={startGame}>
          PRESS TO ROCK
        </button>

        <p className="footer-note">
          Audio synthesized in-browser · Free-asset inspired visuals · No
          installs needed
        </p>
      </div>
    </div>
  );
}
