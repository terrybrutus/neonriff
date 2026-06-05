import { useGameStore } from "@/store/gameStore";
import { useCallback } from "react";

const LANES = [
  {
    label: "A",
    colorClass: "border-lime-500/60 text-lime-400 shadow-lime-500/30",
    activeClass: "border-lime-400 text-lime-300 shadow-lime-400/60 scale-105",
  },
  {
    label: "S",
    colorClass: "border-red-500/60 text-red-400 shadow-red-500/30",
    activeClass: "border-red-400 text-red-300 shadow-red-400/60 scale-105",
  },
  {
    label: "D",
    colorClass: "border-yellow-500/60 text-yellow-400 shadow-yellow-500/30",
    activeClass:
      "border-yellow-400 text-yellow-300 shadow-yellow-400/60 scale-105",
  },
  {
    label: "F",
    colorClass: "border-blue-500/60 text-blue-400 shadow-blue-500/30",
    activeClass: "border-blue-400 text-blue-300 shadow-blue-400/60 scale-105",
  },
  {
    label: "⎵",
    colorClass: "border-orange-500/60 text-orange-400 shadow-orange-500/30",
    activeClass:
      "border-orange-400 text-orange-300 shadow-orange-400/60 scale-105",
  },
];

export default function TouchControls() {
  const { pressLane, releaseLane, laneActive } = useGameStore((s) => ({
    pressLane: s.pressLane,
    releaseLane: s.releaseLane,
    laneActive: s.laneActive,
  }));

  const handlePress = useCallback(
    (lane: number) => (e: React.TouchEvent | React.MouseEvent) => {
      e.preventDefault();
      pressLane(lane);
    },
    [pressLane],
  );

  const handleRelease = useCallback(
    (lane: number) => (e: React.TouchEvent | React.MouseEvent) => {
      e.preventDefault();
      releaseLane(lane);
    },
    [releaseLane],
  );

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex h-16 w-full sm:h-20">
      {LANES.map((lane, laneIndex) => {
        const isActive = laneActive[laneIndex];
        return (
          <button
            type="button"
            key={`touch-lane-${lane.label}`}
            data-ocid={`touch.lane_${laneIndex}_button`}
            className={`flex flex-1 items-center justify-center border-t-2 bg-black/80 text-lg font-black tracking-widest backdrop-blur-sm transition-all duration-75 select-none sm:text-2xl ${
              isActive ? lane.activeClass : lane.colorClass
            }`}
            onTouchStart={handlePress(laneIndex)}
            onTouchEnd={handleRelease(laneIndex)}
            onMouseDown={handlePress(laneIndex)}
            onMouseUp={handleRelease(laneIndex)}
            onMouseLeave={handleRelease(laneIndex)}
            onContextMenu={(e) => e.preventDefault()}
            aria-label={`Lane ${laneIndex + 1} button`}
          >
            {lane.label}
          </button>
        );
      })}
    </div>
  );
}
