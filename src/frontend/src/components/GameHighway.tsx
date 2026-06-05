import { useGameStore } from "@/store/gameStore";
import type { Note } from "@/types/game";
import { useCallback, useEffect, useRef } from "react";

const LANE_COLORS = [
  "#00ff41", // green
  "#ff0033", // red
  "#ffee00", // yellow
  "#00aaff", // blue
  "#ff6600", // orange
];

const LANE_GLOW = [
  "rgba(0,255,65,0.35)",
  "rgba(255,0,51,0.35)",
  "rgba(255,238,0,0.35)",
  "rgba(0,170,255,0.35)",
  "rgba(255,102,0,0.35)",
];

const LOOKAHEAD_MS = 2000;

function getScrollSpeed(difficulty: string): number {
  switch (difficulty) {
    case "Easy":
      return 0.4;
    case "Hard":
      return 0.7;
    default:
      return 0.55;
  }
}

export function GameHighway() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const notes = useGameStore((s) => s.notes);
  const laneActive = useGameStore((s) => s.laneActive);
  const difficulty = useGameStore((s) => s.difficulty);
  const gameState = useGameStore((s) => s.gameState);
  const startTimeRef = useRef<number>(0);

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      const laneWidth = width / 5;
      const hitZoneY = height * 0.85;
      const _scrollSpeed = getScrollSpeed(difficulty);

      // Clear
      ctx.fillStyle = "#050505";
      ctx.fillRect(0, 0, width, height);

      // Draw lane backgrounds
      for (let i = 0; i < 5; i++) {
        const x = i * laneWidth;
        // Dark lane background with faint colored haze
        const gradient = ctx.createLinearGradient(x, 0, x + laneWidth, 0);
        gradient.addColorStop(0, "rgba(0,0,0,0.95)");
        gradient.addColorStop(0.5, LANE_GLOW[i]);
        gradient.addColorStop(1, "rgba(0,0,0,0.95)");
        ctx.fillStyle = gradient;
        ctx.fillRect(x, 0, laneWidth, height);

        // Lane dividers
        if (i > 0) {
          ctx.strokeStyle = "rgba(255,255,255,0.06)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }

        // Neon border glow on sides
        ctx.shadowColor = LANE_COLORS[i];
        ctx.shadowBlur = 8;
        ctx.strokeStyle = `rgba(${Number.parseInt(LANE_COLORS[i].slice(1, 3), 16)}, ${Number.parseInt(LANE_COLORS[i].slice(3, 5), 16)}, ${Number.parseInt(LANE_COLORS[i].slice(5, 7), 16)}, 0.3)`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 2, 0);
        ctx.lineTo(x + 2, height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + laneWidth - 2, 0);
        ctx.lineTo(x + laneWidth - 2, height);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Draw perspective grid lines (faint)
      ctx.strokeStyle = "rgba(255,255,255,0.03)";
      ctx.lineWidth = 1;
      for (let i = 1; i < 10; i++) {
        const y = (height * i) / 10;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw hit zone bar
      const hitZoneHeight = 12;
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.fillRect(0, hitZoneY - hitZoneHeight / 2, width, hitZoneHeight);

      // Draw hit zone circles
      for (let i = 0; i < 5; i++) {
        const cx = i * laneWidth + laneWidth / 2;
        const isActive = laneActive[i];
        const radius = isActive ? 28 : 22;

        // Outer glow
        ctx.shadowColor = LANE_COLORS[i];
        ctx.shadowBlur = isActive ? 30 : 15;

        // Circle fill
        const circleGrad = ctx.createRadialGradient(
          cx,
          hitZoneY,
          0,
          cx,
          hitZoneY,
          radius,
        );
        circleGrad.addColorStop(0, isActive ? "#ffffff" : LANE_COLORS[i]);
        circleGrad.addColorStop(0.6, LANE_COLORS[i]);
        circleGrad.addColorStop(1, "rgba(0,0,0,0.5)");
        ctx.fillStyle = circleGrad;
        ctx.beginPath();
        ctx.arc(cx, hitZoneY, radius, 0, Math.PI * 2);
        ctx.fill();

        // Ring
        ctx.strokeStyle = isActive
          ? "#ffffff"
          : `rgba(${Number.parseInt(LANE_COLORS[i].slice(1, 3), 16)}, ${Number.parseInt(LANE_COLORS[i].slice(3, 5), 16)}, ${Number.parseInt(LANE_COLORS[i].slice(5, 7), 16)}, 0.8)`;
        ctx.lineWidth = isActive ? 3 : 2;
        ctx.beginPath();
        ctx.arc(cx, hitZoneY, radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.shadowBlur = 0;
      }

      // Draw notes
      const now =
        gameState === "playing" ? performance.now() - startTimeRef.current : 0;

      for (const note of notes) {
        const timeUntilHit = note.time - now;
        if (timeUntilHit > LOOKAHEAD_MS || timeUntilHit < -200) continue;

        const progress = 1 - timeUntilHit / LOOKAHEAD_MS; // 0 at top, 1 at hit zone
        const noteY = height * 0.1 + (hitZoneY - height * 0.1) * progress;
        const cx = note.lane * laneWidth + laneWidth / 2;
        const noteRadius = 18;

        // Note glow halo
        ctx.shadowColor = LANE_COLORS[note.lane];
        ctx.shadowBlur = 20;

        // Radial gradient fill
        const noteGrad = ctx.createRadialGradient(
          cx,
          noteY - 4,
          2,
          cx,
          noteY,
          noteRadius,
        );
        noteGrad.addColorStop(0, "#ffffff");
        noteGrad.addColorStop(0.3, LANE_COLORS[note.lane]);
        noteGrad.addColorStop(1, "rgba(0,0,0,0.6)");
        ctx.fillStyle = noteGrad;
        ctx.beginPath();
        ctx.arc(cx, noteY, noteRadius, 0, Math.PI * 2);
        ctx.fill();

        // Highlight glint at top
        ctx.shadowBlur = 0;
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.beginPath();
        ctx.arc(cx - 4, noteY - 6, 4, 0, Math.PI * 2);
        ctx.fill();

        // Outer ring
        ctx.strokeStyle = LANE_COLORS[note.lane];
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, noteY, noteRadius + 2, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Draw particles
      const particles = useGameStore.getState().particles;
      const currentTime = Date.now();
      for (const p of particles) {
        const age = currentTime - p.createdAt;
        if (age > 600) continue;
        const alpha = 1 - age / 600;
        const cx = p.lane * laneWidth + laneWidth / 2;

        ctx.globalAlpha = alpha;
        ctx.shadowColor = LANE_COLORS[p.lane];
        ctx.shadowBlur = 15;

        if (p.type === "explosion") {
          const size = 10 + (age / 600) * 40;
          ctx.fillStyle = LANE_COLORS[p.lane];
          ctx.beginPath();
          ctx.arc(cx, hitZoneY, size, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.type === "hit") {
          const size = 5 + (age / 600) * 20;
          ctx.strokeStyle = LANE_COLORS[p.lane];
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(cx, hitZoneY, size, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          // miss
          ctx.strokeStyle = "#ff0033";
          ctx.lineWidth = 2;
          const offset = (age / 600) * 20;
          ctx.beginPath();
          ctx.moveTo(cx - offset, hitZoneY - offset);
          ctx.lineTo(cx + offset, hitZoneY + offset);
          ctx.moveTo(cx + offset, hitZoneY - offset);
          ctx.lineTo(cx - offset, hitZoneY + offset);
          ctx.stroke();
        }

        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
      }
    },
    [notes, laneActive, difficulty, gameState],
  );

  useEffect(() => {
    if (gameState === "playing" && startTimeRef.current === 0) {
      startTimeRef.current = performance.now();
    }
    if (gameState === "idle") {
      startTimeRef.current = 0;
    }
  }, [gameState]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    let raf: number;
    const loop = () => {
      draw(ctx, canvas.width, canvas.height);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ imageRendering: "auto" }}
      data-ocid="game.canvas_target"
    />
  );
}
