// C major pentatonic across two octaves — every note harmonizes with every
// other note, so nothing a visitor plays can sound "wrong."
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
export const LOOP_BARS = 2;
export const STEPS_PER_BAR = STEPS_PER_QUARTER * 4;
export const TOTAL_STEPS = LOOP_BARS * STEPS_PER_BAR;
export const LOOP_SECONDS = TOTAL_STEPS * STEP_SECONDS;
