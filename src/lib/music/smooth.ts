import type { NoteEvent } from "./engine";
import { LOOP_SECONDS, STEP_SECONDS, SCALE_MIDI } from "./scale";

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

  const legato = quantized.map((n, i) => {
    const next = quantized[i + 1];
    const gapToNext = next ? next.time - n.time : LOOP_SECONDS - n.time;
    const duration = Math.max(n.duration, Math.min(gapToNext * 0.9, 0.8));
    return { ...n, duration };
  });

  return closeTheLoop(legato);
}

// Without this, a loop just cuts off and restarts — the last note never
// resolves anywhere. This inserts one short passing note near the end that
// steps from the last pitch toward the first, so the seam reads as a
// musical turnaround instead of a hard reset.
export function closeTheLoop(notes: NoteEvent[]): NoteEvent[] {
  if (notes.length < 2) return notes;

  const sorted = [...notes].sort((a, b) => a.time - b.time);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  const firstIdx = SCALE_MIDI.indexOf(first.midi);
  const lastIdx = SCALE_MIDI.indexOf(last.midi);
  if (firstIdx === -1 || lastIdx === -1 || firstIdx === lastIdx) {
    return sorted;
  }

  const step = firstIdx > lastIdx ? 1 : -1;
  const bridgeMidi = SCALE_MIDI[lastIdx + step];
  const bridgeDuration = STEP_SECONDS * 1.5;

  const earliestBridgeTime = last.time + STEP_SECONDS * 0.5;
  const bridgeTime = Math.min(
    Math.max(earliestBridgeTime, LOOP_SECONDS - bridgeDuration),
    LOOP_SECONDS - STEP_SECONDS * 0.5
  );
  if (bridgeTime <= last.time) return sorted;

  const trimmedLast = {
    ...last,
    duration: Math.min(last.duration, bridgeTime - last.time),
  };
  const bridge: NoteEvent = {
    midi: bridgeMidi,
    time: bridgeTime,
    duration: Math.min(bridgeDuration, LOOP_SECONDS - bridgeTime),
  };

  return [...sorted.slice(0, -1), trimmedLast, bridge];
}
