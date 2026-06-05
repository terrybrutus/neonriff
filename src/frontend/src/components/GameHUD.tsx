import { useGameStore } from "@/store/gameStore";
import { useEffect, useRef, useState } from "react";

const LANE_COLORS = ["#00ff41", "#ff0033", "#ffee00", "#00aaff", "#ff6600"];

const RESULT_COLORS: Record<string, string> = {
  Perfect: "#00ffff",
  Great: "#ffee00",
  Good: "#ffffff",
  Miss: "#ff0033",
};

function formatScore(n: number): string {
  return n.toLocaleString();
}

function getComboTierColor(combo: number): string {
  if (combo >= 50) return LANE_COLORS[4]; // orange
  if (combo >= 40) return LANE_COLORS[3]; // blue
  if (combo >= 30) return LANE_COLORS[2]; // yellow
  if (combo >= 20) return LANE_COLORS[1]; // red
  return LANE_COLORS[0]; // green
}

function getMultiplier(combo: number): string {
  const mult = Math.min(2.0, 1.0 + Math.floor(combo / 10) * 0.1);
  return `x${mult.toFixed(1)}`;
}

export function GameHUD() {
  const score = useGameStore((s) => s.score);
  const combo = useGameStore((s) => s.combo);
  const health = useGameStore((s) => s.health);
  const crowdEnergy = useGameStore((s) => s.crowdEnergy);
  const accuracy = useGameStore((s) => s.accuracy);
  const gameState = useGameStore((s) => s.gameState);

  const [hitFeedback, setHitFeedback] = useState<{
    result: string;
    id: number;
  } | null>(null);
  const prevAccuracyRef = useRef(accuracy);

  useEffect(() => {
    const prev = prevAccuracyRef.current;
    let result: string | null = null;
    if (accuracy.perfect > prev.perfect) result = "Perfect";
    else if (accuracy.great > prev.great) result = "Great";
    else if (accuracy.good > prev.good) result = "Good";
    else if (accuracy.miss > prev.miss) result = "Miss";

    if (result) {
      setHitFeedback({ result, id: Date.now() });
      const t = setTimeout(() => setHitFeedback(null), 500);
      return () => clearTimeout(t);
    }
    prevAccuracyRef.current = accuracy;
  }, [accuracy]);

  if (gameState !== "playing" && gameState !== "paused") return null;

  const comboColor = getComboTierColor(combo);
  const multiplier = getMultiplier(combo);
  const crowdWild = crowdEnergy >= 80;

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      data-ocid="game.hud.panel"
    >
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-start justify-between px-6 pt-4">
        {/* Combo left */}
        <div className="flex flex-col items-start">
          <div
            className="text-4xl font-black tracking-tighter"
            style={{
              color: comboColor,
              textShadow: `0 0 12px ${comboColor}, 0 0 24px ${comboColor}`,
            }}
            data-ocid="game.hud.combo"
          >
            {combo > 0 ? `x${combo} COMBO` : ""}
          </div>
          {combo > 0 && (
            <div
              className="text-sm font-bold mt-1"
              style={{
                color: comboColor,
                textShadow: `0 0 8px ${comboColor}`,
              }}
              data-ocid="game.hud.multiplier"
            >
              {multiplier}
            </div>
          )}
        </div>

        {/* Score center */}
        <div
          className="text-5xl font-black tracking-tight"
          style={{
            color: "#ffffff",
            textShadow:
              "0 0 12px rgba(255,255,255,0.9), 0 0 24px rgba(255,255,255,0.5)",
          }}
          data-ocid="game.hud.score"
        >
          {formatScore(score)}
        </div>

        {/* Spacer right */}
        <div className="w-32" />
      </div>

      {/* Hit feedback */}
      {hitFeedback && (
        <div
          key={hitFeedback.id}
          className="absolute left-1/2 top-[70%] -translate-x-1/2 -translate-y-1/2 text-5xl font-black animate-fade-out"
          style={{
            color: RESULT_COLORS[hitFeedback.result],
            textShadow: `0 0 16px ${RESULT_COLORS[hitFeedback.result]}, 0 0 32px ${RESULT_COLORS[hitFeedback.result]}`,
          }}
          data-ocid="game.hud.hit_feedback"
        >
          {hitFeedback.result}
        </div>
      )}

      {/* Bottom left: Health */}
      <div
        className="absolute bottom-6 left-6 flex flex-col gap-1"
        data-ocid="game.hud.health.panel"
      >
        <div className="text-xs font-bold tracking-widest text-white/70">
          HEALTH
        </div>
        <div className="w-52 h-4 bg-white/10 rounded-full overflow-hidden border border-white/10">
          <div
            className="h-full rounded-full transition-all duration-200"
            style={{
              width: `${health}%`,
              backgroundColor:
                health > 50 ? "#00ff41" : health > 25 ? "#ffee00" : "#ff0033",
              boxShadow:
                health > 50
                  ? "0 0 10px #00ff41, 0 0 20px #00ff41"
                  : health > 25
                    ? "0 0 10px #ffee00, 0 0 20px #ffee00"
                    : "0 0 10px #ff0033, 0 0 20px #ff0033",
            }}
            data-ocid="game.hud.health.bar"
          />
        </div>
      </div>

      {/* Bottom right: Crowd Energy */}
      <div
        className="absolute bottom-6 right-6 flex flex-col items-end gap-1"
        data-ocid="game.hud.crowd.panel"
      >
        <div className="text-xs font-bold tracking-widest text-white/70">
          CROWD ENERGY
        </div>
        <div className="w-52 h-4 bg-white/10 rounded-full overflow-hidden border border-white/10">
          <div
            className={`h-full rounded-full transition-all duration-200 ${crowdWild ? "animate-pulse-crowd" : ""}`}
            style={{
              width: `${crowdEnergy}%`,
              backgroundColor: crowdWild ? "#ff00ff" : "#00aaff",
              boxShadow: crowdWild
                ? "0 0 12px #ff00ff, 0 0 24px #ff00ff"
                : "0 0 8px #00aaff, 0 0 16px #00aaff",
            }}
            data-ocid="game.hud.crowd.bar"
          />
        </div>
        {crowdWild && (
          <div
            className="text-sm font-black tracking-wider animate-glow-pulse"
            style={{
              color: "#ff00ff",
              textShadow: "0 0 10px #ff00ff, 0 0 20px #ff00ff",
            }}
            data-ocid="game.hud.crowd.wild_text"
          >
            CROWD GOING WILD!
          </div>
        )}
      </div>
    </div>
  );
}
