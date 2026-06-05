import { SONG_ARTIST, SONG_TITLE } from "@/data/songChart";
import { useGameStore } from "@/store/gameStore";
import type { Difficulty } from "@/types/game";
import { useCallback } from "react";

const DIFFICULTIES: {
  key: Difficulty;
  label: string;
  colorClass: string;
  glowClass: string;
}[] = [
  {
    key: "Easy",
    label: "EASY",
    colorClass: "text-lime-400",
    glowClass: "glow-easy",
  },
  {
    key: "Medium",
    label: "MEDIUM",
    colorClass: "text-yellow-400",
    glowClass: "glow-medium",
  },
  {
    key: "Hard",
    label: "HARD",
    colorClass: "text-red-500",
    glowClass: "glow-hard",
  },
];

export function StartScreen() {
  const startGame = useGameStore((s) => s.startGame);

  const handleStart = useCallback(
    (difficulty: Difficulty) => {
      startGame(difficulty);
    },
    [startGame],
  );

  return (
    <div className="relative flex h-screen w-screen flex-col items-center justify-center overflow-hidden bg-black">
      {/* Animated spotlight beams */}
      <div className="pointer-events-none absolute inset-0">
        <div className="spotlight-beam beam-purple" />
        <div className="spotlight-beam beam-cyan" />
        <div className="spotlight-beam beam-red" />
        <div className="spotlight-beam beam-pink" />
      </div>

      {/* Stars/sparks background */}
      <div className="pointer-events-none absolute inset-0 stars-layer" />

      {/* Center content */}
      <div className="relative z-10 flex flex-col items-center gap-6 px-4">
        <h1 className="neon-logo text-center text-7xl font-black tracking-tighter sm:text-8xl md:text-9xl">
          NEON RIFF
        </h1>
        <p className="neon-subtitle text-center text-sm font-bold tracking-[0.3em] sm:text-base md:text-lg">
          GUITAR HERO RHYTHM GAME
        </p>

        <div className="mt-2 flex flex-col items-center gap-3">
          {DIFFICULTIES.map((d) => (
            <button
              type="button"
              key={d.key}
              data-ocid={`start.difficulty_${d.key.toLowerCase()}_button`}
              onClick={() => handleStart(d.key)}
              className={`difficulty-btn ${d.glowClass} w-56 rounded-lg border-2 bg-black/60 px-6 py-3 text-xl font-black tracking-widest backdrop-blur-sm transition-all duration-200 hover:scale-105 active:scale-95 sm:w-64 sm:py-4 sm:text-2xl ${d.colorClass}`}
            >
              {d.label}
              {d.key === "Hard" && (
                <span className="ml-2 inline-block text-lg">🔥</span>
              )}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-col items-center gap-1">
          <p className="controls-text text-center text-xs tracking-widest">
            A S D F SPACE — Hit the lanes
          </p>
          <p className="controls-text text-center text-xs tracking-widest opacity-70">
            Tap buttons below — Mobile
          </p>
        </div>

        <div className="mt-2 text-center">
          <p className="now-playing text-xs tracking-widest opacity-80">
            NOW PLAYING: <span className="font-bold">{SONG_TITLE}</span> BY{" "}
            <span className="font-bold">{SONG_ARTIST}</span>
          </p>
        </div>
      </div>

      {/* Crowd silhouettes */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0">
        <svg
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
          className="h-16 w-full sm:h-20 md:h-24"
          role="img"
          aria-label="Crowd silhouettes"
        >
          <path
            className="crowd-sway-1"
            d="M0,120 L0,80 Q30,50 60,80 Q90,40 120,75 Q150,45 180,80 Q210,50 240,80 Q270,35 300,75 Q330,50 360,80 Q390,40 420,75 Q450,55 480,80 Q510,35 540,70 Q570,50 600,80 Q630,40 660,75 Q690,50 720,80 Q750,35 780,70 Q810,50 840,80 Q870,40 900,75 Q930,55 960,80 Q990,35 1020,70 Q1050,50 1080,80 Q1110,40 1140,75 Q1170,50 1200,80 L1200,120 Z"
            fill="#1a1a1a"
          />
          <path
            className="crowd-sway-2"
            d="M0,120 L0,95 Q40,65 80,95 Q120,55 160,90 Q200,60 240,95 Q280,50 320,90 Q360,65 400,95 Q440,55 480,90 Q520,60 560,95 Q600,50 640,90 Q680,65 720,95 Q760,55 800,90 Q840,60 880,95 Q920,50 960,90 Q1000,65 1040,95 Q1080,55 1120,90 Q1160,60 1200,95 L1200,120 Z"
            fill="#0f0f0f"
          />
        </svg>
      </div>
    </div>
  );
}
