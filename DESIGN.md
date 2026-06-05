# Design Brief: NeonRiff

**Tone:** Rock concert intensity, neon-soaked stage lighting, dark metal aesthetic. Visually immersive with maximum flair—glow effects, flicker animations, screen shake, crowd energy pulses. Anti-boring, high-impact motion.

**Differentiation:** 5-lane rhythm game with Guitar Hero DNA. Lane colors (green/red/yellow/blue/orange) map to playable notes with intense neon glow. Dark metal backdrop creates depth; stage lighting effects emphasize performance flow. No plain UI—every interactive element glows or animates.

## Palette

| Role | Value | Usage |
|------|-------|-------|
| Lane Green | `oklch(0.65 0.15 142)` | Primary note lane, glow highlights |
| Lane Red | `oklch(0.60 0.20 30)` | Secondary note lane, glow highlights |
| Lane Yellow | `oklch(0.85 0.18 100)` | Tertiary note lane, glow highlights |
| Lane Blue | `oklch(0.60 0.18 260)` | Quaternary note lane, glow highlights |
| Lane Orange | `oklch(0.70 0.20 50)` | Quinary note lane, glow highlights |
| Glow Bright | `oklch(0.95 0.15 70)` | Multi-purpose neon accent, combo glow |
| Dark Metal | `oklch(0.08 0 0)` | Stage background, deep depth |
| Stage Light | `oklch(0.25 0.05 240)` | Subtle stage fill, ambient depth |

## Typography

| Layer | Font | Usage |
|-------|------|-------|
| Display | Space Grotesk | Combo counters, score labels, stage titles |
| Body | Inter | Game UI text, hint labels |
| Mono | IBM Plex Mono | Timing info, technical feedback |

## Structural Zones

| Zone | Purpose | Styling |
|------|---------|----------|
| Header | Song title, performer, time | Semi-transparent dark overlay, Space Grotesk 24px bold |
| Play Field | 5 lanes + falling notes + impact zone | Full-width dark metal, lane dividers at 20% opacity |
| Status Bar | Score, combo, energy meter | Sticky footer or top, glow-bright box-shadow, animated pulse |
| Controls | Play/pause, note feedback | Minimal, neon accent on active |

## Motion

| Animation | Duration | Easing | Usage |
|-----------|----------|--------|-------|
| glow-pulse | 2s | ease-in-out | Lane glow intensity breathing |
| neon-flicker | 0.15s | linear | Rapid neon flicker on perfect hits |
| screen-shake | 0.4s | cubic-bezier(0.36, 0, 0.66, 1) | Combo milestones (every 5+ hits) |
| pulse-crowd | 0.6s | ease-in-out | Energy meter feedback, audience response |

## Constraints

- No leaderboard or persistent scores (MVP).
- Single-song demo mode (pre-loaded chart).
- 5-lane keyboard input: G, H, J, K, L keys map to green, red, yellow, blue, orange.
- Timing windows: perfect (±50ms), good (±100ms), miss (>100ms).
- No save/replay (in-session gameplay only).

## Signature Detail

Every interactive element has a neon glow. Lane borders emit stage lighting. On combo hits >5, full screen-shake triggers with crowd-pulse energy meter feedback. No dead UI—every pixel either plays music or responds to input.
