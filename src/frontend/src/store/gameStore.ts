import { SONGS, getSong } from "@/data/songs";
import type {
  Difficulty,
  GameScreen,
  HitRating,
  Note,
  Song,
} from "@/types/game";
import { HIT_SCORES } from "@/types/game";
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

interface Accuracy {
  perfect: number;
  great: number;
  good: number;
  miss: number;
}

interface HitEvent {
  id: string;
  lane: number;
  rating: HitRating;
  x: number;
  y: number;
}

interface GameState {
  screen: GameScreen;
  selectedSongId: string;
  difficulty: Difficulty;

  // Active game state
  notes: Note[];
  score: number;
  combo: number;
  maxCombo: number;
  health: number; // 0-100
  accuracy: Accuracy;
  pressedLanes: boolean[];
  hitEvents: HitEvent[];
  lastRating: HitRating | null;

  // High scores per song+difficulty
  highScores: Record<string, number>;
}

interface GameActions {
  selectSong: (songId: string) => void;
  selectDifficulty: (d: Difficulty) => void;
  startGame: () => void;
  endGame: () => void;
  returnToStart: () => void;

  setNotes: (notes: Note[]) => void;
  hitNote: (noteId: string, rating: HitRating, lane: number) => void;
  missNote: (noteId: string) => void;
  pressLane: (lane: number) => void;
  releaseLane: (lane: number) => void;
  clearHitEvent: (id: string) => void;
}

type Store = GameState & GameActions;

const initialPressedLanes = [false, false, false, false, false];

export const useGameStore = create<Store>((set, get) => ({
  screen: "start",
  selectedSongId: SONGS[0].id,
  difficulty: "medium",
  notes: [],
  score: 0,
  combo: 0,
  maxCombo: 0,
  health: 100,
  accuracy: { perfect: 0, great: 0, good: 0, miss: 0 },
  pressedLanes: [...initialPressedLanes],
  hitEvents: [],
  lastRating: null,
  highScores: {},

  selectSong: (songId) => set({ selectedSongId: songId }),
  selectDifficulty: (d) => set({ difficulty: d }),

  startGame: () => {
    const { selectedSongId, difficulty } = get();
    const song = getSong(selectedSongId);
    // Deep clone notes so the chart stays pristine
    const notes: Note[] = song.charts[difficulty].map((n) => ({
      ...n,
      hit: false,
      missed: false,
    }));
    set({
      screen: "game",
      notes,
      score: 0,
      combo: 0,
      maxCombo: 0,
      health: 100,
      accuracy: { perfect: 0, great: 0, good: 0, miss: 0 },
      pressedLanes: [...initialPressedLanes],
      hitEvents: [],
      lastRating: null,
    });
  },

  endGame: () => {
    const { score, selectedSongId, difficulty, highScores, accuracy } = get();
    const key = `${selectedSongId}:${difficulty}`;
    const prev = highScores[key] ?? 0;
    const totalHits = accuracy.perfect + accuracy.great + accuracy.good;
    const total = totalHits + accuracy.miss;
    void total; // used for future stats
    set({
      screen: "gameover",
      highScores: score > prev ? { ...highScores, [key]: score } : highScores,
    });
  },

  returnToStart: () => set({ screen: "start" }),

  setNotes: (notes) => set({ notes }),

  hitNote: (noteId, rating, lane) =>
    set((s) => {
      const pts = HIT_SCORES[rating];
      const newCombo = rating === "miss" ? 0 : s.combo + 1;
      const multiplier =
        newCombo >= 30 ? 4 : newCombo >= 20 ? 3 : newCombo >= 10 ? 2 : 1;
      const earned = pts * multiplier;
      const healthDelta =
        rating === "perfect"
          ? 2
          : rating === "great"
            ? 1
            : rating === "good"
              ? 0
              : -15;
      const newHealth = Math.min(100, Math.max(0, s.health + healthDelta));
      const newMaxCombo = Math.max(s.maxCombo, newCombo);
      const newAcc = { ...s.accuracy, [rating]: s.accuracy[rating] + 1 };
      const updatedNotes = s.notes.map((n) =>
        n.id === noteId ? { ...n, hit: true, hitRating: rating } : n,
      );
      const hitEvent: HitEvent = {
        id: `${noteId}-ev`,
        lane,
        rating,
        x: 0,
        y: 0,
      };
      return {
        notes: updatedNotes,
        score: s.score + earned,
        combo: newCombo,
        maxCombo: newMaxCombo,
        health: newHealth,
        accuracy: newAcc,
        lastRating: rating,
        hitEvents: [...s.hitEvents, hitEvent].slice(-10),
      };
    }),

  missNote: (noteId) =>
    set((s) => ({
      notes: s.notes.map((n) => (n.id === noteId ? { ...n, missed: true } : n)),
      combo: 0,
      health: Math.max(0, s.health - 15),
      accuracy: { ...s.accuracy, miss: s.accuracy.miss + 1 },
      lastRating: "miss",
    })),

  pressLane: (lane) =>
    set((s) => {
      const next = [...s.pressedLanes];
      next[lane] = true;
      return { pressedLanes: next };
    }),

  releaseLane: (lane) =>
    set((s) => {
      const next = [...s.pressedLanes];
      next[lane] = false;
      return { pressedLanes: next };
    }),

  clearHitEvent: (id) =>
    set((s) => ({ hitEvents: s.hitEvents.filter((e) => e.id !== id) })),
}));

// Shallow selectors for object slices
export function useGameStatus() {
  return useGameStore(
    useShallow((s) => ({
      screen: s.screen,
      score: s.score,
      combo: s.combo,
      maxCombo: s.maxCombo,
      health: s.health,
      accuracy: s.accuracy,
      lastRating: s.lastRating,
    })),
  );
}

export function useGameActions() {
  return useGameStore(
    useShallow((s) => ({
      selectSong: s.selectSong,
      selectDifficulty: s.selectDifficulty,
      startGame: s.startGame,
      endGame: s.endGame,
      returnToStart: s.returnToStart,
      hitNote: s.hitNote,
      missNote: s.missNote,
      pressLane: s.pressLane,
      releaseLane: s.releaseLane,
      clearHitEvent: s.clearHitEvent,
    })),
  );
}

export function getSongForGame(): Song {
  const { selectedSongId } = useGameStore.getState();
  return getSong(selectedSongId);
}
