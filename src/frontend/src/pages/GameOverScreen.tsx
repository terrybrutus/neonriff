import { useGameStore } from "@/store/gameStore";
import { useCallback, useMemo } from "react";

function calculateGrade(accuracyPercent: number): {
  letter: string;
  colorClass: string;
} {
  if (accuracyPercent >= 95)
    return { letter: "S", colorClass: "text-yellow-400 glow-grade-s" };
  if (accuracyPercent >= 85)
    return { letter: "A", colorClass: "text-cyan-400 glow-grade-a" };
  if (accuracyPercent >= 75)
    return { letter: "B", colorClass: "text-lime-400 glow-grade-b" };
  if (accuracyPercent >= 65)
    return { letter: "C", colorClass: "text-yellow-300 glow-grade-c" };
  if (accuracyPercent >= 50)
    return { letter: "D", colorClass: "text-orange-400 glow-grade-d" };
  return { letter: "F", colorClass: "text-red-500 glow-grade-f" };
}

export function GameOverScreen() {
  const { score, maxCombo, accuracy, difficulty, startGame, endGame } =
    useGameStore((s) => ({
      score: s.score,
      maxCombo: s.maxCombo,
      accuracy: s.accuracy,
      difficulty: s.difficulty,
      startGame: s.startGame,
      endGame: s.endGame,
    }));

  const accuracyPercent = useMemo(() => {
    if (accuracy.total === 0) return 0;
    const weighted =
      accuracy.perfect * 1.0 + accuracy.great * 0.8 + accuracy.good * 0.6;
    return Math.round((weighted / accuracy.total) * 100);
  }, [accuracy]);

  const grade = useMemo(
    () => calculateGrade(accuracyPercent),
    [accuracyPercent],
  );

  const handlePlayAgain = useCallback(() => {
    endGame();
    setTimeout(() => startGame(difficulty), 50);
  }, [endGame, startGame, difficulty]);

  const handleChangeDifficulty = useCallback(() => {
    endGame();
  }, [endGame]);

  return (
    <div className="relative flex h-screen w-screen flex-col items-center justify-center overflow-hidden bg-black">
      {/* Red vignette fog */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,transparent_40%,rgba(80,0,0,0.6)_100%)]" />

      <div className="relative z-10 flex flex-col items-center gap-6 px-4">
        <h1 className="gameover-title text-center text-6xl font-black tracking-tighter sm:text-7xl md:text-8xl">
          GAME OVER
        </h1>

        {/* Grade */}
        <div
          className={`grade-letter text-8xl font-black sm:text-9xl md:text-[10rem] ${grade.colorClass}`}
        >
          {grade.letter}
        </div>

        {/* Score breakdown card */}
        <div className="score-card flex w-80 flex-col gap-3 rounded-xl border border-red-500/30 bg-black/70 p-5 backdrop-blur-sm sm:w-96 sm:p-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold tracking-widest text-white/70">
              FINAL SCORE
            </span>
            <span className="neon-score text-xl font-black sm:text-2xl">
              {score.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold tracking-widest text-white/70">
              MAX COMBO
            </span>
            <span className="neon-combo text-xl font-black sm:text-2xl">
              {maxCombo}x
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold tracking-widest text-white/70">
              ACCURACY
            </span>
            <span className="neon-accuracy text-xl font-black sm:text-2xl">
              {accuracyPercent}%
            </span>
          </div>
          <div className="mt-1 border-t border-white/10 pt-3">
            <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs tracking-wide text-white/60">
              <span className="text-emerald-400">
                Perfect: {accuracy.perfect}
              </span>
              <span className="text-cyan-400">Great: {accuracy.great}</span>
              <span className="text-yellow-400">Good: {accuracy.good}</span>
              <span className="text-red-400">Miss: {accuracy.miss}</span>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="mt-2 flex flex-col items-center gap-3">
          <button
            type="button"
            data-ocid="gameover.play_again_button"
            onClick={handlePlayAgain}
            className="play-again-btn w-64 rounded-lg border-2 border-lime-400/60 bg-black/60 px-6 py-3 text-xl font-black tracking-widest text-lime-400 backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:border-lime-400 hover:shadow-[0_0_24px_rgba(132,204,22,0.5)] active:scale-95 sm:w-72 sm:py-4 sm:text-2xl"
          >
            PLAY AGAIN
          </button>
          <button
            type="button"
            data-ocid="gameover.change_difficulty_button"
            onClick={handleChangeDifficulty}
            className="w-56 rounded-lg border border-white/20 bg-black/40 px-4 py-2 text-sm font-bold tracking-widest text-white/70 backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:border-white/40 hover:text-white active:scale-95 sm:w-64 sm:py-3 sm:text-base"
          >
            CHANGE DIFFICULTY
          </button>
        </div>
      </div>
    </div>
  );
}
