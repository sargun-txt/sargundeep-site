import type { NoteEvent } from "./engine";
import { MAX_RECORD_SECONDS, loopSecondsFor } from "./scale";
import { smoothRuleBased } from "./smooth";

const FRAME_MS = 30;
const MIN_NOTE_SECONDS = 0.09;

// Normalized autocorrelation pitch tracker, tuned for humming/whistling
// (80Hz–1kHz). Returns null for silence or unvoiced/noisy frames.
export function detectPitch(buf: Float32Array, sampleRate: number): number | null {
  let rms = 0;
  for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / buf.length);
  if (rms < 0.012) return null;

  const minLag = Math.floor(sampleRate / 1000);
  const maxLag = Math.floor(sampleRate / 80);
  const n = buf.length - maxLag;
  if (n <= 0) return null;

  let energy0 = 0;
  for (let i = 0; i < n; i++) energy0 += buf[i] * buf[i];

  const norms = new Float32Array(maxLag + 2);
  let best = 0;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let c = 0;
    let e = 0;
    for (let i = 0; i < n; i++) {
      c += buf[i] * buf[i + lag];
      e += buf[i + lag] * buf[i + lag];
    }
    const v = c / Math.sqrt(energy0 * e + 1e-9);
    norms[lag] = v;
    if (v > best) best = v;
  }
  if (best < 0.8) return null;

  // Prefer the shortest strong peak so we don't lock onto a lower octave.
  for (let lag = minLag + 1; lag < maxLag; lag++) {
    if (
      norms[lag] >= best * 0.93 &&
      norms[lag] >= norms[lag - 1] &&
      norms[lag] >= norms[lag + 1]
    ) {
      return sampleRate / lag;
    }
  }
  return null;
}

function median3(values: (number | null)[], i: number): number | null {
  const w = [values[i - 1], values[i], values[i + 1]].filter(
    (v): v is number => v != null
  );
  if (w.length < 2 || values[i] == null) return null;
  return [...w].sort((a, b) => a - b)[Math.floor(w.length / 2)];
}

const MAJOR = [0, 2, 4, 5, 7, 9, 11];

// Fit the hum to whichever major/relative-minor key it already mostly sits
// in, then nudge only the stray notes. Keeps the player's own pitches.
export function snapToBestKey(notes: NoteEvent[]): NoteEvent[] {
  if (notes.length === 0) return notes;
  let bestRoot = 0;
  let bestScore = -1;
  for (let root = 0; root < 12; root++) {
    const inKey = new Set(MAJOR.map((i) => (root + i) % 12));
    const score = notes.reduce(
      (sum, n) => sum + (inKey.has(((n.midi % 12) + 12) % 12) ? n.duration : 0),
      0
    );
    if (score > bestScore) {
      bestScore = score;
      bestRoot = root;
    }
  }
  const inKey = new Set(MAJOR.map((i) => (bestRoot + i) % 12));
  return notes.map((n) => {
    for (const d of [0, -1, 1, -2, 2]) {
      if (inKey.has((((n.midi + d) % 12) + 12) % 12)) {
        return { ...n, midi: n.midi + d };
      }
    }
    return n;
  });
}

export function framesToNotes(
  frames: { t: number; midi: number | null }[]
): NoteEvent[] {
  const raw = frames.map((f) => f.midi);
  const smoothed = raw.map((_, i) => median3(raw, i));

  const notes: NoteEvent[] = [];
  let start = -1;
  let pitch = 0;
  let gap = 0;
  let lastVoiced = -1;
  const frameSec = FRAME_MS / 1000;

  const close = (endIdx: number) => {
    if (start < 0) return;
    const t0 = frames[start].t;
    const len = frames[endIdx].t - t0 + frameSec;
    if (len >= MIN_NOTE_SECONDS) {
      notes.push({ midi: pitch, time: t0, duration: Math.max(0.2, len) });
    }
    start = -1;
  };

  for (let i = 0; i < smoothed.length; i++) {
    const m = smoothed[i];
    if (m == null) {
      gap++;
      if (start >= 0 && gap > 2) close(lastVoiced);
      continue;
    }
    gap = 0;
    if (start >= 0 && m !== pitch) close(lastVoiced);
    if (start < 0) {
      start = i;
      pitch = m;
    }
    lastVoiced = i;
  }
  close(lastVoiced);
  return notes;
}

export class MicError extends Error {}

// Listens until `stopSignal` aborts or MAX_RECORD_SECONDS pass, tracks the
// pitch, and returns the melody at its real pitch. Nothing leaves the
// browser; the audio is never stored.
export async function humToMelody(opts: {
  stopSignal: AbortSignal;
  snapToKey: boolean;
  onListening?: () => void;
}): Promise<{ notes: NoteEvent[]; loopSeconds: number }> {
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });
  } catch {
    throw new MicError("Microphone access was blocked.");
  }

  opts.onListening?.();

  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;
  const ctx = new Ctx();
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  source.connect(analyser);

  const buf = new Float32Array(analyser.fftSize);
  const frames: { t: number; midi: number | null }[] = [];
  const start = performance.now();
  let elapsed = 0;

  await new Promise<void>((resolve) => {
    const id = window.setInterval(() => {
      elapsed = (performance.now() - start) / 1000;
      analyser.getFloatTimeDomainData(buf);
      const f = detectPitch(buf, ctx.sampleRate);
      frames.push({
        t: elapsed,
        midi: f == null ? null : Math.round(69 + 12 * Math.log2(f / 440)),
      });
      if (elapsed >= MAX_RECORD_SECONDS || opts.stopSignal.aborted) {
        window.clearInterval(id);
        resolve();
      }
    }, FRAME_MS);
  });

  stream.getTracks().forEach((tr) => tr.stop());
  await ctx.close();

  let notes = framesToNotes(frames);
  // Keep every note in a comfortable, audible range without changing its
  // pitch class (fold by octaves only).
  notes = notes.map((n) => {
    let midi = n.midi;
    while (midi < 48) midi += 12;
    while (midi > 84) midi -= 12;
    return { ...n, midi };
  });
  if (opts.snapToKey) notes = snapToBestKey(notes);

  const lastEnd = notes.length
    ? Math.max(...notes.map((n) => n.time + n.duration))
    : 0;
  const loopSeconds = loopSecondsFor(Math.max(elapsed, lastEnd));
  return { notes: smoothRuleBased(notes, loopSeconds), loopSeconds };
}
