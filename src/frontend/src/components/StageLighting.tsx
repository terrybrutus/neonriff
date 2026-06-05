import { useGameStore } from "@/store/gameStore";

const BEAM_CONFIGS = [
  { color: "rgba(0,255,255,0.12)", angle: -15, speed: 6, delay: 0, width: 28 },
  { color: "rgba(180,0,255,0.10)", angle: 10, speed: 8, delay: 1.5, width: 24 },
  { color: "rgba(255,255,255,0.08)", angle: -5, speed: 7, delay: 3, width: 22 },
  { color: "rgba(255,0,80,0.10)", angle: 20, speed: 9, delay: 0.8, width: 26 },
  {
    color: "rgba(0,200,255,0.09)",
    angle: -22,
    speed: 5.5,
    delay: 2.2,
    width: 30,
  },
  { color: "rgba(255,200,255,0.07)", angle: 5, speed: 10, delay: 4, width: 20 },
];

function LightBeam({
  color,
  angle,
  speed,
  delay,
  width,
}: {
  color: string;
  angle: number;
  speed: number;
  delay: number;
  width: number;
}) {
  return (
    <div
      className="absolute bottom-0"
      style={{
        left: "50%",
        width: `${width}px`,
        height: "100vh",
        transformOrigin: "bottom center",
        transform: `translateX(-50%) rotate(${angle}deg)`,
        clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
        background: `linear-gradient(to bottom, ${color}, transparent)`,
        animation: `beam-sweep ${speed}s ease-in-out ${delay}s infinite alternate`,
        opacity: 0.9,
      }}
    />
  );
}

function CrowdLayer() {
  const crowdEnergy = useGameStore((s) => s.crowdEnergy);
  const wild = crowdEnergy > 80;

  return (
    <div
      className="absolute bottom-0 left-0 right-0 pointer-events-none"
      style={{
        height: "15vh",
        zIndex: 2,
        animation: wild
          ? "crowd-sway 0.8s ease-in-out infinite alternate"
          : "crowd-sway 1.5s ease-in-out infinite alternate",
      }}
    >
      <svg
        viewBox="0 0 1200 200"
        preserveAspectRatio="none"
        className="w-full h-full"
        role="img"
        aria-label="Animated crowd"
        style={{
          filter: wild ? "drop-shadow(0 0 12px rgba(255,0,255,0.5))" : "none",
        }}
      >
        {/* Crowd heads */}
        {Array.from({ length: 40 }, (_, crowdIndex) => {
          const x = (crowdIndex / 40) * 1200 + Math.sin(crowdIndex * 3) * 15;
          const y = 180 + Math.cos(crowdIndex * 2.5) * 20;
          const r = 12 + Math.sin(crowdIndex * 4) * 4;
          const armH = 40 + Math.sin(crowdIndex * 2) * 25;
          return (
            <g key={`crowd-${x.toFixed(1)}-${y.toFixed(1)}`}>
              {/* Arm */}
              <line
                x1={x}
                y1={y - r * 0.5}
                x2={x + (crowdIndex % 2 === 0 ? 15 : -15)}
                y2={y - armH}
                stroke={wild ? "rgba(255,0,255,0.4)" : "rgba(80,80,80,0.5)"}
                strokeWidth={3}
                strokeLinecap="round"
              />
              {/* Head */}
              <circle
                cx={x}
                cy={y}
                r={r}
                fill={wild ? "rgba(60,20,60,0.9)" : "rgba(30,30,30,0.95)"}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function FogLayer() {
  return (
    <div
      className="absolute bottom-0 left-0 right-0 pointer-events-none"
      style={{
        height: "25vh",
        background:
          "radial-gradient(ellipse 80% 60% at 50% 100%, rgba(60,0,120,0.35) 0%, rgba(20,0,60,0.15) 40%, transparent 70%)",
        animation: "fog-pulse 4s ease-in-out infinite",
        zIndex: 3,
      }}
    />
  );
}

function StageFloorLine() {
  return (
    <div
      className="absolute left-0 right-0 pointer-events-none"
      style={{
        top: "85vh",
        height: "2px",
        background:
          "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 20%, rgba(255,255,255,0.9) 50%, rgba(255,255,255,0.6) 80%, transparent 100%)",
        boxShadow:
          "0 0 8px rgba(255,255,255,0.6), 0 0 16px rgba(255,255,255,0.3), 0 0 32px rgba(255,255,255,0.15)",
        zIndex: 4,
      }}
    />
  );
}

export function StageLighting() {
  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 0 }}
    >
      {/* Light beams */}
      {BEAM_CONFIGS.map((beam) => (
        <LightBeam key={`beam-${beam.color}-${beam.angle}`} {...beam} />
      ))}

      {/* Crowd */}
      <CrowdLayer />

      {/* Fog */}
      <FogLayer />

      {/* Stage floor highlight */}
      <StageFloorLine />
    </div>
  );
}
