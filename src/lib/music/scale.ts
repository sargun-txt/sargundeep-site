// C major pentatonic across two octaves — the pads' default scale.
export const SCALE_MIDI = [60, 62, 64, 67, 69, 72, 74, 76, 79, 81];

export const KEY_MAP: Record<string, number> = {
  a: 60,
  s: 62,
  d: 64,
  f: 67,
  g: 69,
  h: 72,
  j: 74,
  k: 76,
  l: 79,
  ";": 81,
};

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export const BPM = 120;
export const STEPS_PER_QUARTER = 4;
export const STEP_SECONDS = 60 / BPM / STEPS_PER_QUARTER;
export const STEPS_PER_BAR = STEPS_PER_QUARTER * 4;
export const BAR_SECONDS = STEPS_PER_BAR * STEP_SECONDS;

export const MAX_RECORD_SECONDS = 15;
export const DEFAULT_LOOP_SECONDS = 2 * BAR_SECONDS;
export const MAX_LOOP_SECONDS = Math.ceil(MAX_RECORD_SECONDS / BAR_SECONDS) * BAR_SECONDS;

// Loops are whole bars so the beat and chords always line up.
export function loopSecondsFor(durationSeconds: number): number {
  const bars = Math.ceil(Math.max(durationSeconds, 0.1) / BAR_SECONDS);
  return Math.min(Math.max(bars, 1) * BAR_SECONDS, MAX_LOOP_SECONDS);
}
