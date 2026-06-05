import { useGameStore } from "@/store/gameStore";

const LANE_COLORS = [
  "rgba(0,255,65,",
  "rgba(255,0,51,",
  "rgba(255,238,0,",
  "rgba(0,170,255,",
  "rgba(255,102,0,",
];

export function LaneGlowEffects() {
  const laneActive = useGameStore((s) => s.laneActive);
  const combo = useGameStore((s) => s.combo);

  const comboTier = combo >= 50 ? 3 : combo >= 10 ? 2 : 1;
  const highwayPulse = combo >= 50;

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 5 }}>
      {/* Highway-wide neon pulse when combo > 50 */}
      {highwayPulse && (
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.02) 50%, transparent 100%)",
            animation: "highway-pulse 1.2s ease-in-out infinite",
          }}
        />
      )}

      {/* Per-lane glow strips */}
      {[0, 1, 2, 3, 4].map((lane) => {
        const isActive = laneActive[lane];
        const baseOpacity = isActive ? 0.7 : 0.15;
        const spread = isActive
          ? comboTier === 3
            ? 30
            : comboTier === 2
              ? 20
              : 12
          : 4;
        const color = LANE_COLORS[lane];

        return (
          <div
            key={`lane-${lane}`}
            className="absolute top-0 bottom-0 transition-all duration-150"
            style={{
              left: `${lane * 20}%`,
              width: "20%",
              background: isActive
                ? `linear-gradient(90deg, transparent 0%, ${color}${baseOpacity}) 20%, ${color}${baseOpacity}) 50%, ${color}${baseOpacity}) 80%, transparent 100%)`
                : `linear-gradient(90deg, transparent 0%, ${color}${baseOpacity}) 10%, ${color}${baseOpacity}) 50%, ${color}${baseOpacity}) 90%, transparent 100%)`,
              boxShadow: isActive
                ? `inset 0 0 ${spread}px ${color}0.5), 0 0 ${spread}px ${color}0.4)`
                : `inset 0 0 ${spread}px ${color}0.2)`,
            }}
          />
        );
      })}
    </div>
  );
}
