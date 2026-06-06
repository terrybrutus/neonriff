import { useGameStatus } from "@/store/gameStore";
import { LANE_COLORS } from "@/types/game";
import { useEffect, useRef, useState } from "react";

const RATING_COLORS = {
  perfect: "#ffffff",
  great: "#00ff88",
  good: "#ffcc00",
  miss: "#ff2244",
};

const RATING_LABELS = {
  perfect: "PERFECT",
  great: "GREAT",
  good: "GOOD",
  miss: "MISS",
};

export function GameHUD() {
  const { score, combo, maxCombo, health, lastRating, accuracy } =
    useGameStatus();
  const [showRating, setShowRating] = useState(false);
  const [ratingOpacity, setRatingOpacity] = useState(1);
  const ratingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const opacityRef = useRef(1);

  useEffect(() => {
    if (!lastRating) return;
    if (ratingTimer.current) clearTimeout(ratingTimer.current);
    if (fadeTimer.current) clearInterval(fadeTimer.current);
    opacityRef.current = 1;
    setRatingOpacity(1);
    setShowRating(true);

    ratingTimer.current = setTimeout(() => {
      // Fade out
      fadeTimer.current = setInterval(() => {
        opacityRef.current -= 0.08;
        setRatingOpacity(opacityRef.current);
        if (opacityRef.current <= 0) {
          clearInterval(fadeTimer.current!);
          setShowRating(false);
        }
      }, 30);
    }, 350);

    return () => {
      if (ratingTimer.current) clearTimeout(ratingTimer.current);
      if (fadeTimer.current) clearInterval(fadeTimer.current);
    };
  }, [lastRating]);

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

  const multiplier = combo >= 30 ? 4 : combo >= 20 ? 3 : combo >= 10 ? 2 : 1;

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex justify-between items-start p-4">
        {/* Score */}
        <div className="text-left">
          <div className="hud-label">SCORE</div>
          <div className="hud-value">{score.toLocaleString()}</div>
        </div>

        {/* Accuracy */}
        <div className="text-center">
          <div className="hud-label">ACCURACY</div>
          <div className="hud-value text-2xl">{pctAccuracy}%</div>
        </div>

        {/* Max combo */}
        <div className="text-right">
          <div className="hud-label">BEST COMBO</div>
          <div className="hud-value">{maxCombo}x</div>
        </div>
      </div>

      {/* Combo display — center */}
      {combo >= 4 && (
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 text-center">
          <div
            className="hud-combo"
            style={{
              color:
                combo >= 30
                  ? "#ff6d00"
                  : combo >= 20
                    ? "#ffea00"
                    : combo >= 10
                      ? "#00b0ff"
                      : "#00ff41",
              textShadow: "0 0 20px currentColor, 0 0 40px currentColor",
            }}
          >
            {combo}
          </div>
          <div className="hud-label tracking-[0.3em]">COMBO</div>
          {multiplier > 1 && (
            <div className="hud-multiplier" style={{ color: "#ff6d00" }}>
              {multiplier}x
            </div>
          )}
        </div>
      )}

      {/* Hit rating popup */}
      {showRating && lastRating && (
        <div
          className="absolute left-1/2 -translate-x-1/2 text-center"
          style={{
            top: "58%",
            opacity: ratingOpacity,
            color: RATING_COLORS[lastRating],
            textShadow: `0 0 16px ${RATING_COLORS[lastRating]}, 0 0 32px ${RATING_COLORS[lastRating]}`,
            fontSize: "2rem",
            fontFamily: "Orbitron, monospace",
            fontWeight: 700,
            letterSpacing: "0.15em",
            transform: `translateX(-50%) scale(${0.9 + ratingOpacity * 0.1})`,
            transition: "transform 0.1s",
          }}
        >
          {RATING_LABELS[lastRating]}
        </div>
      )}

      {/* Health bar — bottom center */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-64">
        <div className="hud-label text-center mb-1">HEALTH</div>
        <div className="health-bar-bg">
          <div
            className="health-bar-fill"
            style={{
              width: `${health}%`,
              background:
                health > 60
                  ? "linear-gradient(90deg, #00cc44, #00ff66)"
                  : health > 30
                    ? "linear-gradient(90deg, #cc8800, #ffaa00)"
                    : "linear-gradient(90deg, #cc0022, #ff2244)",
              boxShadow:
                health > 60
                  ? "0 0 12px #00ff66"
                  : health > 30
                    ? "0 0 12px #ffaa00"
                    : "0 0 12px #ff2244",
            }}
          />
        </div>
        {health <= 0 && (
          <div className="text-center mt-2 text-red-400 font-bold tracking-widest animate-pulse">
            GAME OVER
          </div>
        )}
      </div>

      {/* Lane key hints — bottom row */}
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="lane-key"
            style={{
              borderColor: LANE_COLORS[i as 0],
              color: LANE_COLORS[i as 0],
              boxShadow: `0 0 8px ${LANE_COLORS[i as 0]}44`,
            }}
          >
            {i === 4 ? "SPC" : ["A", "S", "D", "F"][i]}
          </div>
        ))}
      </div>

      {/* Note accuracy breakdown — top-left tiny */}
      <div className="absolute top-20 left-4 text-xs font-mono opacity-60">
        <div style={{ color: "#ffffff" }}>P {accuracy.perfect}</div>
        <div style={{ color: "#00ff88" }}>G {accuracy.great}</div>
        <div style={{ color: "#ffcc00" }}>O {accuracy.good}</div>
        <div style={{ color: "#ff2244" }}>M {accuracy.miss}</div>
      </div>
    </div>
  );
}
