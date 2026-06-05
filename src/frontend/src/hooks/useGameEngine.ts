import { useGameStore } from "@/store/gameStore";
import type { Difficulty, NoteResult } from "@/types/game";
import { useCallback, useEffect, useRef } from "react";

const HIT_WINDOWS: Record<Difficulty, number> = {
  Easy: 150,
  Medium: 100,
  Hard: 60,
};

function getHitQuality(delta: number, difficulty: Difficulty): NoteResult {
  const abs = Math.abs(delta);
  if (difficulty === "Easy") {
    if (abs <= 30) return "Perfect";
    if (abs <= 60) return "Great";
    if (abs <= 100) return "Good";
    return "Miss";
  }
  if (difficulty === "Medium") {
    if (abs <= 20) return "Perfect";
    if (abs <= 40) return "Great";
    if (abs <= 70) return "Good";
    return "Miss";
  }
  // Hard
  if (abs <= 15) return "Perfect";
  if (abs <= 30) return "Great";
  if (abs <= 50) return "Good";
  return "Miss";
}

export function useGameEngine() {
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const isRunningRef = useRef(false);

  const gameState = useGameStore((s) => s.gameState);
  const _difficulty = useGameStore((s) => s.difficulty);
  const _notes = useGameStore((s) => s.notes);
  const hitNote = useGameStore((s) => s.hitNote);
  const missNote = useGameStore((s) => s.missNote);
  const endGame = useGameStore((s) => s.endGame);
  const addParticle = useGameStore((s) => s.addParticle);
  const triggerScreenShake = useGameStore((s) => s.triggerScreenShake);

  const startGame = useCallback((selectedDifficulty: Difficulty) => {
    useGameStore.getState().startGame(selectedDifficulty);
    startTimeRef.current = performance.now();
    isRunningRef.current = true;
  }, []);

  const stopGame = useCallback(() => {
    isRunningRef.current = false;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const attemptHit = useCallback(
    (lane: number, pressTime: number) => {
      const state = useGameStore.getState();
      if (state.gameState !== "playing") return;

      const elapsed = pressTime - startTimeRef.current;
      const windowMs = HIT_WINDOWS[state.difficulty];

      // Find the closest unhit note in this lane
      let bestNote = state.notes.find((n) => {
        if (n.lane !== lane) return false;
        const delta = n.time - elapsed;
        return Math.abs(delta) <= windowMs;
      });

      if (!bestNote) {
        // No note in window — optional: ghost miss logic could go here
        return;
      }

      const delta = bestNote.time - elapsed;
      const result = getHitQuality(delta, state.difficulty);

      if (result === "Miss") {
        missNote(bestNote.id);
        addParticle(lane, "miss");
        triggerScreenShake(0.3);
      } else {
        hitNote(bestNote.id, result);
        addParticle(lane, result === "Perfect" ? "explosion" : "hit");
        if (result === "Perfect") {
          triggerScreenShake(0.5);
        }
      }
    },
    [hitNote, missNote, addParticle, triggerScreenShake],
  );

  useEffect(() => {
    if (gameState !== "playing") {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    const loop = () => {
      const state = useGameStore.getState();
      if (state.gameState !== "playing") {
        isRunningRef.current = false;
        return;
      }

      const elapsed = performance.now() - startTimeRef.current;
      const windowMs = HIT_WINDOWS[state.difficulty];

      // Auto-miss notes that have passed the hit window
      const missed: string[] = [];
      for (const note of state.notes) {
        if (note.time + windowMs < elapsed) {
          missed.push(note.id);
        }
      }

      for (const id of missed) {
        missNote(id);
        const note = state.notes.find((n) => n.id === id);
        if (note) {
          addParticle(note.lane, "miss");
        }
      }

      if (missed.length > 0) {
        triggerScreenShake(0.2);
      }

      // End game if no notes remain and some time has passed
      const remaining = useGameStore.getState().notes;
      if (remaining.length === 0 && elapsed > 5000) {
        endGame();
        return;
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [gameState, missNote, addParticle, triggerScreenShake, endGame]);

  return {
    startGame,
    stopGame,
    isRunning: gameState === "playing",
    attemptHit,
  };
}
