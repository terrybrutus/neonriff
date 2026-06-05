import { useGameStore } from "@/store/gameStore";
import { useEffect, useRef } from "react";

const LANE_KEYS: Record<string, number> = {
  a: 0,
  A: 0,
  s: 1,
  S: 1,
  d: 2,
  D: 2,
  f: 3,
  F: 3,
  " ": 4,
};

export function useKeyboardInput(
  onLanePress: (lane: number, time: number) => void,
) {
  const heldRef = useRef<Set<string>>(new Set());
  const pressLane = useGameStore((s) => s.pressLane);
  const releaseLane = useGameStore((s) => s.releaseLane);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key;
      if (heldRef.current.has(key)) return; // debounce repeat
      const lane = LANE_KEYS[key];
      if (lane === undefined) return;

      e.preventDefault();
      heldRef.current.add(key);
      pressLane(lane);
      onLanePress(lane, performance.now());
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key;
      const lane = LANE_KEYS[key];
      if (lane === undefined) return;

      e.preventDefault();
      heldRef.current.delete(key);
      releaseLane(lane);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      heldRef.current.clear();
    };
  }, [onLanePress, pressLane, releaseLane]);
}
