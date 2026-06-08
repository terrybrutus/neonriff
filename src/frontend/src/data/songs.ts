import type { Difficulty, Lane, Note, Song, SongStyle } from "@/types/game";

let _noteIdCounter = 0;

function makeNote(lane: Lane, time: number): Note {
  return {
    id: `n${_noteIdCounter++}`,
    lane,
    time,
    type: "tap",
    hit: false,
    missed: false,
  };
}

// Each string = one 16th-note step. Chars are lane numbers 0-4, "_" is rest.
// Uses 16th-note grid to match the audio engine's beat scheduler.
function buildChart(
  bpm: number,
  patterns: string[],
  startOffset = 1.5,
): Note[] {
  _noteIdCounter = 0;
  const subDur = 60 / bpm / 4; // 16th note — same grid as audioEngine
  const notes: Note[] = [];
  patterns.forEach((pat, i) => {
    const time = startOffset + i * subDur;
    for (const char of pat) {
      const lane = Number.parseInt(char) as Lane;
      if (Number.isNaN(lane) || lane < 0 || lane > 4) continue;
      notes.push(makeNote(lane, time));
    }
  });
  return notes;
}

function loop(measure: string[], times: number): string[] {
  return Array.from({ length: times }, () => measure).flat();
}

// Duration derived from actual chart rather than hardcoded
function chartDuration(bpm: number, patLen: number, startOffset = 1.5): number {
  return startOffset + (patLen - 1) * (60 / bpm / 4) + 3;
}

// -----------------------------------------------------------------------
// NEON FURY — Metal, 120 BPM
// Audio beat grid: kick on steps 0,2,8,10 / snare+guitar on 4,12
// Notes are placed on audio event positions so gems land on the beat.
// -----------------------------------------------------------------------
function neonFuryChart(difficulty: Difficulty): Note[] {
  const bpm = 120;

  // Two 16-step measures (32 steps total), looped to fill ~60s
  // Each pair of measures = 32 × 0.125s = 4s. 15 loops = 480 steps ≈ 62s.
  const patterns: Record<Difficulty, [string[], string[]]> = {
    easy: [
      // kick beat 1 → lane 0, snare beat 2 → lane 2, kick beat 3 → lane 0, snare beat 4 → lane 3
      [
        "0",
        "_",
        "_",
        "_",
        "2",
        "_",
        "_",
        "_",
        "0",
        "_",
        "_",
        "_",
        "3",
        "_",
        "_",
        "_",
      ],
      [
        "0",
        "_",
        "_",
        "_",
        "2",
        "_",
        "_",
        "_",
        "4",
        "_",
        "_",
        "_",
        "2",
        "_",
        "_",
        "_",
      ],
    ],
    medium: [
      // main beats + double kicks on steps 2,10
      [
        "0",
        "_",
        "1",
        "_",
        "2",
        "_",
        "_",
        "_",
        "0",
        "_",
        "4",
        "_",
        "3",
        "_",
        "_",
        "_",
      ],
      [
        "0",
        "_",
        "1",
        "_",
        "2",
        "_",
        "_",
        "3",
        "0",
        "_",
        "4",
        "_",
        "24",
        "_",
        "2",
        "_",
      ],
    ],
    hard: [
      // fills on every other 16th, chords on snare
      [
        "0",
        "_",
        "1",
        "_",
        "2",
        "_",
        "1",
        "_",
        "0",
        "_",
        "4",
        "_",
        "3",
        "_",
        "2",
        "_",
      ],
      [
        "0",
        "2",
        "1",
        "_",
        "2",
        "_",
        "1",
        "2",
        "0",
        "2",
        "4",
        "_",
        "3",
        "_",
        "14",
        "_",
      ],
    ],
    expert: [
      // dense — nearly every 16th, chords on guitar hits
      [
        "0",
        "2",
        "1",
        "_",
        "24",
        "_",
        "1",
        "2",
        "0",
        "2",
        "4",
        "_",
        "3",
        "_",
        "14",
        "2",
      ],
      [
        "0",
        "2",
        "1",
        "3",
        "24",
        "1",
        "_",
        "2",
        "04",
        "2",
        "4",
        "1",
        "3",
        "4",
        "_",
        "2",
      ],
    ],
  };

  const [mA, mB] = patterns[difficulty];
  return buildChart(bpm, loop([...mA, ...mB], 15));
}

// -----------------------------------------------------------------------
// CHROME REBEL — Blues-Rock, 100 BPM
// Audio: kick 0,8 / snare 4,12 / open hi-hat quarters / pentatonic bass walk
// Notes map to the sparse, swinging feel of blues-rock.
// -----------------------------------------------------------------------
function chromeRebelChart(difficulty: Difficulty): Note[] {
  const bpm = 100;

  // 32 steps = 4.8s. 13 loops = 416 steps ≈ 64s.
  const patterns: Record<Difficulty, [string[], string[]]> = {
    easy: [
      // kick-snare-kick-snare feel, open and spacious
      [
        "0",
        "_",
        "_",
        "_",
        "3",
        "_",
        "_",
        "_",
        "0",
        "_",
        "_",
        "_",
        "2",
        "_",
        "_",
        "_",
      ],
      [
        "0",
        "_",
        "_",
        "_",
        "3",
        "_",
        "_",
        "_",
        "4",
        "_",
        "_",
        "_",
        "3",
        "_",
        "_",
        "_",
      ],
    ],
    medium: [
      // bass walk steps 3,7,11 added for blues feel
      [
        "0",
        "_",
        "_",
        "1",
        "3",
        "_",
        "_",
        "2",
        "0",
        "_",
        "_",
        "4",
        "2",
        "_",
        "_",
        "_",
      ],
      [
        "0",
        "_",
        "_",
        "2",
        "3",
        "_",
        "_",
        "1",
        "4",
        "_",
        "_",
        "3",
        "2",
        "_",
        "1",
        "_",
      ],
    ],
    hard: [
      // shuffle feel — emphasise the swing off-beats
      [
        "0",
        "_",
        "3",
        "1",
        "2",
        "_",
        "4",
        "_",
        "0",
        "_",
        "3",
        "4",
        "2",
        "_",
        "4",
        "2",
      ],
      [
        "0",
        "3",
        "_",
        "1",
        "24",
        "_",
        "3",
        "1",
        "04",
        "_",
        "3",
        "4",
        "2",
        "1",
        "4",
        "_",
      ],
    ],
    expert: [
      // full pattern with walk and fills
      [
        "0",
        "3",
        "_",
        "1",
        "24",
        "_",
        "3",
        "1",
        "04",
        "_",
        "3",
        "4",
        "3",
        "1",
        "4",
        "2",
      ],
      [
        "04",
        "3",
        "2",
        "1",
        "24",
        "3",
        "_",
        "1",
        "0",
        "3",
        "4",
        "2",
        "3",
        "1",
        "24",
        "_",
      ],
    ],
  };

  const [mA, mB] = patterns[difficulty];
  return buildChart(bpm, loop([...mA, ...mB], 13));
}

// -----------------------------------------------------------------------
// DIGITAL STORM — Electronic, 140 BPM
// Audio: 4-on-floor kick (0,4,8,12) / clap (4,12) / staccato synth / arpeggio
// Dense and mechanical — every step has something playing.
// -----------------------------------------------------------------------
function digitalStormChart(difficulty: Difficulty): Note[] {
  const bpm = 140;

  // 32 steps = 3.43s. 18 loops = 576 steps ≈ 65s.
  const patterns: Record<Difficulty, [string[], string[]]> = {
    easy: [
      // four-on-floor feel — notes only on kick beats
      [
        "0",
        "_",
        "_",
        "_",
        "2",
        "_",
        "_",
        "_",
        "0",
        "_",
        "_",
        "_",
        "3",
        "_",
        "_",
        "_",
      ],
      [
        "0",
        "_",
        "_",
        "_",
        "2",
        "_",
        "_",
        "_",
        "4",
        "_",
        "_",
        "_",
        "2",
        "_",
        "_",
        "_",
      ],
    ],
    medium: [
      // kick + some synth bass hits between
      [
        "0",
        "_",
        "1",
        "_",
        "2",
        "_",
        "3",
        "_",
        "0",
        "_",
        "4",
        "_",
        "2",
        "_",
        "1",
        "_",
      ],
      [
        "0",
        "_",
        "1",
        "_",
        "2",
        "_",
        "3",
        "_",
        "0",
        "1",
        "4",
        "_",
        "2",
        "3",
        "_",
        "1",
      ],
    ],
    hard: [
      // 8th note density with arp-like movement
      [
        "0",
        "_",
        "1",
        "2",
        "2",
        "_",
        "3",
        "_",
        "0",
        "1",
        "4",
        "_",
        "2",
        "3",
        "1",
        "_",
      ],
      [
        "0",
        "2",
        "1",
        "_",
        "24",
        "_",
        "3",
        "2",
        "0",
        "1",
        "4",
        "3",
        "2",
        "_",
        "13",
        "2",
      ],
    ],
    expert: [
      // every 16th — machine-gun arpeggio feel
      [
        "0",
        "2",
        "1",
        "3",
        "2",
        "4",
        "3",
        "1",
        "0",
        "2",
        "4",
        "3",
        "3",
        "1",
        "2",
        "4",
      ],
      [
        "0",
        "2",
        "4",
        "1",
        "24",
        "3",
        "1",
        "4",
        "0",
        "3",
        "4",
        "2",
        "13",
        "4",
        "2",
        "1",
      ],
    ],
  };

  const [mA, mB] = patterns[difficulty];
  return buildChart(bpm, loop([...mA, ...mB], 18));
}

// -----------------------------------------------------------------------
// Song catalog
// -----------------------------------------------------------------------
function makeSong(
  id: string,
  title: string,
  artist: string,
  bpm: number,
  style: SongStyle,
  chartFn: (d: Difficulty) => Note[],
): Song {
  const charts = {
    easy: chartFn("easy"),
    medium: chartFn("medium"),
    hard: chartFn("hard"),
    expert: chartFn("expert"),
  };
  // Duration from the expert chart (longest), so the game ends at the right time
  const duration = chartDuration(
    bpm,
    charts.expert.length > 0
      ? Math.round(
          (charts.expert[charts.expert.length - 1].time - 1.5) / (60 / bpm / 4),
        ) + 1
      : 480,
  );

  return { id, title, artist, bpm, duration, style, charts };
}

export const SONGS: Song[] = [
  makeSong(
    "neon-fury",
    "Neon Fury",
    "The Circuit Breakers",
    120,
    "metal",
    neonFuryChart,
  ),
  makeSong(
    "chrome-rebel",
    "Chrome Rebel",
    "Steel Voltage",
    100,
    "blues-rock",
    chromeRebelChart,
  ),
  makeSong(
    "digital-storm",
    "Digital Storm",
    "Phantom Grid",
    140,
    "electronic",
    digitalStormChart,
  ),
];

export function getSong(id: string): Song {
  return SONGS.find((s) => s.id === id) ?? SONGS[0];
}
