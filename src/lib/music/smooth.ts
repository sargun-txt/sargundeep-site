import type { NoteEvent } from "./engine";
import { LOOP_SECONDS, STEP_SECONDS } from "./scale";

// Rule-based smoothing: snap note starts to the nearest 16th-note step and
// stretch each note toward the next one (legato) so the loop feels played,
// not typed. No pitch changes — the scale already guarantees those are fine.
export function smoothRuleBased(notes: NoteEvent[]): NoteEvent[] {
  if (notes.length === 0) return notes;

  const quantized = notes
    .map((n) => ({
      ...n,
      time: Math.round(n.time / STEP_SECONDS) * STEP_SECONDS,
    }))
    .sort((a, b) => a.time - b.time);

  return quantized.map((n, i) => {
    const next = quantized[i + 1];
    const gapToNext = next ? next.time - n.time : LOOP_SECONDS - n.time;
    const duration = Math.max(n.duration, Math.min(gapToNext * 0.9, 0.8));
    return { ...n, duration };
  });
}
