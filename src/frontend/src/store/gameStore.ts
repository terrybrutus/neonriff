import { EASY_CHART, HARD_CHART, MEDIUM_CHART } from "@/data/songChart";
import type {
  Difficulty,
  GameStore,
  NoteResult,
  ParticleEmit,
} from "@/types/game";
import { create } from "zustand";

const CHARTS: Record<Difficulty, typeof EASY_CHART> = {
  Easy: EASY_CHART,
  Medium: MEDIUM_CHART,
  Hard: HARD_CHART,
};

const SCORE_MAP: Record<NoteResult, number> = {
  Perfect: 300,
  Great: 200,
  Good: 100,
  Miss: 0,
};

function getComboMultiplier(combo: number): number {
  return Math.min(2.0, 1.0 + Math.floor(combo / 10) * 0.1);
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: "idle",
  difficulty: "Medium",
  notes: [],
  score: 0,
  combo: 0,
  maxCombo: 0,
  health: 80,
  accuracy: { perfect: 0, great: 0, good: 0, miss: 0, total: 0 },
  laneActive: [false, false, false, false, false],
  particles: [],
  screenShake: { active: false, intensity: 0 },
  crowdEnergy: 50,

  startGame: (difficulty: Difficulty) => {
    const chart = CHARTS[difficulty];
    set({
      gameState: "playing",
      difficulty,
      notes: chart.map((n) => ({ ...n })),
      score: 0,
      combo: 0,
      maxCombo: 0,
      health: 80,
      accuracy: { perfect: 0, great: 0, good: 0, miss: 0, total: 0 },
      laneActive: [false, false, false, false, false],
      particles: [],
      screenShake: { active: false, intensity: 0 },
      crowdEnergy: 50,
    });
  },

  endGame: () => {
    set({ gameState: "gameover" });
  },

  pauseGame: () => {
    const { gameState } = get();
    if (gameState === "playing") set({ gameState: "paused" });
  },

  resumeGame: () => {
    const { gameState } = get();
    if (gameState === "paused") set({ gameState: "playing" });
  },

  hitNote: (noteId: string, result: NoteResult) => {
    const state = get();
    if (state.gameState !== "playing") return;

    const points = SCORE_MAP[result];
    const mult = getComboMultiplier(state.combo + 1);
    const added = Math.round(points * mult);

    const newCombo = result === "Miss" ? 0 : state.combo + 1;
    const newMaxCombo = Math.max(state.maxCombo, newCombo);

    const healthDelta = result === "Perfect" ? 2 : result === "Miss" ? -15 : 0;
    const newHealth = clamp(state.health + healthDelta, 0, 100);

    const crowdDelta =
      result === "Perfect"
        ? 3
        : result === "Great"
          ? 1
          : result === "Miss"
            ? -5
            : 0;
    const newCrowd = clamp(state.crowdEnergy + crowdDelta, 0, 100);

    const newAccuracy = { ...state.accuracy };
    newAccuracy.total += 1;
    if (result === "Perfect") newAccuracy.perfect += 1;
    else if (result === "Great") newAccuracy.great += 1;
    else if (result === "Good") newAccuracy.good += 1;
    else if (result === "Miss") newAccuracy.miss += 1;

    const newNotes = state.notes.filter((n) => n.id !== noteId);

    set({
      notes: newNotes,
      score: state.score + added,
      combo: newCombo,
      maxCombo: newMaxCombo,
      health: newHealth,
      accuracy: newAccuracy,
      crowdEnergy: newCrowd,
    });

    if (newHealth <= 0) {
      get().endGame();
    }
  },

  missNote: (noteId: string) => {
    const state = get();
    if (state.gameState !== "playing") return;

    const newHealth = clamp(state.health - 15, 0, 100);
    const newCrowd = clamp(state.crowdEnergy - 5, 0, 100);
    const newAccuracy = { ...state.accuracy };
    newAccuracy.total += 1;
    newAccuracy.miss += 1;

    const newNotes = state.notes.filter((n) => n.id !== noteId);

    set({
      notes: newNotes,
      combo: 0,
      health: newHealth,
      accuracy: newAccuracy,
      crowdEnergy: newCrowd,
    });

    if (newHealth <= 0) {
      get().endGame();
    }
  },

  pressLane: (lane: number) => {
    const state = get();
    const next = [...state.laneActive];
    if (lane >= 0 && lane < 5) next[lane] = true;
    set({ laneActive: next });
  },

  releaseLane: (lane: number) => {
    const state = get();
    const next = [...state.laneActive];
    if (lane >= 0 && lane < 5) next[lane] = false;
    set({ laneActive: next });
  },

  addParticle: (lane: number, type: ParticleEmit["type"]) => {
    const state = get();
    const particle: ParticleEmit = {
      id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      lane,
      type,
      createdAt: Date.now(),
    };
    set({ particles: [...state.particles, particle] });
  },

  clearParticle: (id: string) => {
    const state = get();
    set({ particles: state.particles.filter((p) => p.id !== id) });
  },

  triggerScreenShake: (intensity: number) => {
    set({ screenShake: { active: true, intensity } });
    setTimeout(() => {
      set({ screenShake: { active: false, intensity: 0 } });
    }, 300);
  },

  updateCrowdEnergy: (delta: number) => {
    const state = get();
    set({ crowdEnergy: clamp(state.crowdEnergy + delta, 0, 100) });
  },
}));
