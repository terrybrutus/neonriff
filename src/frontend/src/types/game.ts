export interface Note {
  id: string;
  lane: 0 | 1 | 2 | 3 | 4;
  time: number;
  duration?: number;
}

export type NoteResult = "Perfect" | "Great" | "Good" | "Miss";

export type Difficulty = "Easy" | "Medium" | "Hard";

export type GameState = "idle" | "playing" | "paused" | "gameover";

export interface ParticleEmit {
  id: string;
  lane: number;
  type: "hit" | "miss" | "explosion";
  createdAt: number;
}

export interface ScreenShake {
  active: boolean;
  intensity: number;
}

export interface Accuracy {
  perfect: number;
  great: number;
  good: number;
  miss: number;
  total: number;
}

export interface GameStore {
  gameState: GameState;
  difficulty: Difficulty;
  notes: Note[];
  score: number;
  combo: number;
  maxCombo: number;
  health: number;
  accuracy: Accuracy;
  laneActive: boolean[];
  particles: ParticleEmit[];
  screenShake: ScreenShake;
  crowdEnergy: number;

  startGame: (difficulty: Difficulty) => void;
  endGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  hitNote: (noteId: string, result: NoteResult) => void;
  missNote: (noteId: string) => void;
  pressLane: (lane: number) => void;
  releaseLane: (lane: number) => void;
  addParticle: (lane: number, type: ParticleEmit["type"]) => void;
  clearParticle: (id: string) => void;
  triggerScreenShake: (intensity: number) => void;
  updateCrowdEnergy: (delta: number) => void;
}
