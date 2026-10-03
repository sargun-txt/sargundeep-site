import type { NoteEvent } from "./engine";
import { LOOP_SECONDS, SCALE_MIDI } from "./scale";
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

function snapToScale(midi: number): number {
  return SCALE_MIDI.reduce((closest, m) =>
    Math.abs(m - midi) < Math.abs(closest - midi) ? m : closest
  );
}

function median3(values: (number | null)[], i: number): number | null {
  const w = [values[i - 1], values[i], values[i + 1]].filter(
    (v): v is number => v != null
  );
  if (w.length < 2 || values[i] == null) return null;
  return [...w].sort((a, b) => a - b)[Math.floor(w.length / 2)];
}

export function framesToNotes(
  frames: { t: number; midi: number | null }[]
): NoteEvent[] {
  const raw = frames.map((f) => f.midi);
  const smoothed = raw.map((_, i) => median3(raw, i));
  const voiced = smoothed.filter((v): v is number => v != null);
  if (voiced.length === 0) return [];

  // Shift the whole hum by octaves so it sits in the instrument's range.
  const sortedVoiced = [...voiced].sort((a, b) => a - b);
  const median = sortedVoiced[Math.floor(sortedVoiced.length / 2)];
  const shift = 12 * Math.round((70 - median) / 12);

  const snapped = smoothed.map((m) =>
    m == null ? null : snapToScale(Math.min(81, Math.max(60, m + shift)))
  );

  const notes: NoteEvent[] = [];
  let start = -1;
  let pitch = 0;
  let gap = 0;
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

  let lastVoiced = -1;
  for (let i = 0; i < snapped.length; i++) {
    const m = snapped[i];
    if (m == null) {
      gap++;
      if (start >= 0 && gap > 2) {
        close(lastVoiced);
      }
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

// Records LOOP_SECONDS of mic audio, tracks the pitch, and returns a scale-
// locked melody. Nothing leaves the browser; the audio is never stored.
export async function humToMelody(
  onListening?: () => void
): Promise<NoteEvent[]> {
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

  onListening?.();

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

  await new Promise<void>((resolve) => {
    const id = window.setInterval(() => {
      const t = (performance.now() - start) / 1000;
      analyser.getFloatTimeDomainData(buf);
      const f = detectPitch(buf, ctx.sampleRate);
      frames.push({
        t,
        midi: f == null ? null : Math.round(69 + 12 * Math.log2(f / 440)),
      });
      if (t >= LOOP_SECONDS) {
        window.clearInterval(id);
        resolve();
      }
    }, FRAME_MS);
  });

  stream.getTracks().forEach((tr) => tr.stop());
  await ctx.close();

  return smoothRuleBased(framesToNotes(frames));
}
