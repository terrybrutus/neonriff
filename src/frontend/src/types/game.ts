export type Lane = 0 | 1 | 2 | 3 | 4;
export type Difficulty = "easy" | "medium" | "hard" | "expert";
export type HitRating = "perfect" | "great" | "good" | "miss";
export type GameScreen = "start" | "game" | "gameover";
export type SongStyle = "metal" | "blues-rock" | "electronic";

export interface Note {
  id: string;
  lane: Lane;
  time: number; // seconds from song start when note should be hit
  type: "tap" | "hold";
  holdDuration?: number;
  hit: boolean;
  missed: boolean;
  hitRating?: HitRating;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  duration: number; // seconds
  style: SongStyle;
  charts: Record<Difficulty, Note[]>;
}

export interface HitEvent {
  lane: Lane;
  rating: HitRating;
  score: number;
  time: number;
}

export const LANE_COLORS: Record<Lane, string> = {
  0: "#00ff41",
  1: "#ff1744",
  2: "#ffea00",
  3: "#00b0ff",
  4: "#ff6d00",
};

export const LANE_KEYS: Record<Lane, string> = {
  0: "A",
  1: "S",
  2: "D",
  3: "F",
  4: "Space",
};

export const HIT_WINDOWS: Record<HitRating, number> = {
  perfect: 0.05,
  great: 0.1,
  good: 0.15,
  miss: 0,
};

export const HIT_SCORES: Record<HitRating, number> = {
  perfect: 150,
  great: 100,
  good: 50,
  miss: 0,
};
