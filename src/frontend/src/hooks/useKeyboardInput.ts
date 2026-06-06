import { useGameStore } from "@/store/gameStore";
import { useEffect, useRef } from "react";

const KEY_TO_LANE: Record<string, number> = {
  a: 0,
  s: 1,
  d: 2,
  f: 3,
  " ": 4,
};

export function useKeyboardInput(onLanePress: (lane: number) => void) {
  const pressLane = useGameStore((s) => s.pressLane);
  const releaseLane = useGameStore((s) => s.releaseLane);
  const heldKeys = useRef<Set<string>>(new Set());

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === " ") e.preventDefault();
      const lane = KEY_TO_LANE[key];
      if (lane === undefined) return;
      if (heldKeys.current.has(key)) return; // ignore key repeat
      heldKeys.current.add(key);
      pressLane(lane);
      onLanePress(lane);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const lane = KEY_TO_LANE[key];
      if (lane === undefined) return;
      heldKeys.current.delete(key);
      releaseLane(lane);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [pressLane, releaseLane, onLanePress]);
}
