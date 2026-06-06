import { audioEngine } from "@/lib/audioEngine";
import { useGameStore } from "@/store/gameStore";
import type { Lane, Note } from "@/types/game";
import { HIT_WINDOWS } from "@/types/game";
import { useCallback, useEffect, useRef } from "react";

const MISS_CUTOFF = 0.25; // seconds past hit time → auto miss

export function useGameEngine(songDuration: number, bpm: number) {
  const notes = useGameStore((s) => s.notes);
  const screen = useGameStore((s) => s.screen);
  const hitNote = useGameStore((s) => s.hitNote);
  const missNote = useGameStore((s) => s.missNote);
  const endGame = useGameStore((s) => s.endGame);

  const notesRef = useRef<Note[]>(notes);
  const rafRef = useRef<number>(0);

  // Keep ref in sync without subscribing in rAF
  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  // Auto-miss loop — checks every rAF if any notes slipped past
  const runLoop = useCallback(() => {
    if (screen !== "game") return;
    const now = audioEngine.getSongTime();

    // Auto-miss notes that passed without being hit
    for (const note of notesRef.current) {
      if (!note.hit && !note.missed && now > note.time + MISS_CUTOFF) {
        missNote(note.id);
        audioEngine.playMiss();
      }
    }

    // End game when song time exceeds duration
    if (now >= songDuration) {
      endGame();
      return;
    }

    rafRef.current = requestAnimationFrame(runLoop);
  }, [screen, missNote, endGame, songDuration]);

  useEffect(() => {
    if (screen === "game") {
      audioEngine.start(bpm);
      rafRef.current = requestAnimationFrame(runLoop);
    } else {
      audioEngine.stop();
      cancelAnimationFrame(rafRef.current);
    }
    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [screen, runLoop, bpm]);

  // Called by keyboard/touch input with the lane pressed
  const handleLanePress = useCallback(
    (lane: number) => {
      if (screen !== "game") return;
      const now = audioEngine.getSongTime();
      const currentNotes = notesRef.current;

      // Find closest unhit note in this lane
      let closest: Note | null = null;
      let minDist = Number.POSITIVE_INFINITY;

      for (const note of currentNotes) {
        if (note.lane !== (lane as Lane)) continue;
        if (note.hit || note.missed) continue;
        const dist = Math.abs(note.time - now);
        if (dist < minDist) {
          minDist = dist;
          closest = note;
        }
      }

      if (!closest) return;

      const diff = Math.abs(closest.time - now);

      if (diff <= HIT_WINDOWS.perfect) {
        hitNote(closest.id, "perfect", lane);
        audioEngine.playHit(lane, "perfect");
      } else if (diff <= HIT_WINDOWS.great) {
        hitNote(closest.id, "great", lane);
        audioEngine.playHit(lane, "great");
      } else if (diff <= HIT_WINDOWS.good) {
        hitNote(closest.id, "good", lane);
        audioEngine.playHit(lane, "good");
      }
      // Outside good window = no hit registered (note will auto-miss later)
    },
    [screen, hitNote],
  );

  return { handleLanePress };
}
