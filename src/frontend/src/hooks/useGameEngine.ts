import { audioEngine } from "@/lib/audioEngine";
import type { SongStyle } from "@/lib/audioEngine";
import { useGameStore } from "@/store/gameStore";
import type { Lane, Note } from "@/types/game";
import { HIT_WINDOWS } from "@/types/game";
import { useCallback, useEffect, useRef } from "react";

const MISS_CUTOFF = 0.25;

export function useGameEngine(
  songDuration: number,
  bpm: number,
  style: SongStyle,
) {
  const notes = useGameStore((s) => s.notes);
  const screen = useGameStore((s) => s.screen);
  const hitNote = useGameStore((s) => s.hitNote);
  const missNote = useGameStore((s) => s.missNote);
  const endGame = useGameStore((s) => s.endGame);

  // Always-fresh refs so the rAF loop never has stale closures
  const notesRef = useRef<Note[]>(notes);
  const screenRef = useRef(screen);
  const endGameRef = useRef(endGame);
  const missNoteRef = useRef(missNote);
  const songDurationRef = useRef(songDuration);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);
  useEffect(() => {
    screenRef.current = screen;
  }, [screen]);
  useEffect(() => {
    endGameRef.current = endGame;
  }, [endGame]);
  useEffect(() => {
    missNoteRef.current = missNote;
  }, [missNote]);
  useEffect(() => {
    songDurationRef.current = songDuration;
  }, [songDuration]);

  // Stable rAF loop using refs — never recreated, never stale
  const loopFnRef = useRef<() => void>(function noop() {});
  loopFnRef.current = () => {
    if (screenRef.current !== "game") return;
    const now = audioEngine.getSongTime();

    for (const note of notesRef.current) {
      if (!note.hit && !note.missed && now > note.time + MISS_CUTOFF) {
        missNoteRef.current(note.id);
        audioEngine.playMiss();
      }
    }

    if (now >= songDurationRef.current) {
      endGameRef.current();
      return;
    }

    rafRef.current = requestAnimationFrame(loopFnRef.current!);
  };

  useEffect(() => {
    if (screen === "game") {
      audioEngine.start(bpm, style);
      rafRef.current = requestAnimationFrame(loopFnRef.current!);
    } else {
      audioEngine.stop();
      cancelAnimationFrame(rafRef.current);
    }
    return () => {
      cancelAnimationFrame(rafRef.current);
      audioEngine.stop();
    };
  }, [screen, bpm, style]);

  const handleLanePress = useCallback(
    (lane: number) => {
      if (screenRef.current !== "game") return;
      const now = audioEngine.getSongTime();
      const currentNotes = notesRef.current;

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
    },
    [hitNote],
  );

  return { handleLanePress };
}
