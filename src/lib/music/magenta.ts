import type { NoteEvent } from "./engine";
import { LOOP_SECONDS, STEPS_PER_QUARTER, BPM } from "./scale";

// Google's free, open-source (Apache 2.0) hosted checkpoint — no key, no
// billing, no backend of ours involved.
const CHECKPOINT_URL =
  "https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/mel_2bar_small";

type VaeModule = typeof import("@magenta/music/esm/music_vae");
type SequencesModule = typeof import("@magenta/music/esm/core/sequences");

let vaePromise: Promise<{
  sequences: SequencesModule;
  vae: InstanceType<VaeModule["MusicVAE"]>;
}> | null = null;

export function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl")
    );
  } catch {
    return false;
  }
}

async function getVae() {
  if (!vaePromise) {
    vaePromise = (async () => {
      const [{ MusicVAE }, sequences] = await Promise.all([
        import("@magenta/music/esm/music_vae"),
        import("@magenta/music/esm/core/sequences"),
      ]);
      const vae = new MusicVAE(CHECKPOINT_URL);
      await vae.initialize();
      return { sequences, vae };
    })();
  }
  return vaePromise;
}

// Lets the UI start the (slow, one-time) model download ahead of time, e.g.
// as soon as a visitor has a loop recorded, instead of only on first click.
export function preloadAI() {
  if (isWebGLAvailable()) getVae().catch(() => {});
}

function notesToSequence(notes: NoteEvent[]) {
  return {
    notes: notes.map((n) => ({
      pitch: n.midi,
      startTime: n.time,
      endTime: Math.min(n.time + n.duration, LOOP_SECONDS),
    })),
    totalTime: LOOP_SECONDS,
    tempos: [{ time: 0, qpm: BPM }],
  };
}

// Encode the melody into the model's latent space and decode it straight
// back out. That round trip is what "smooths without losing the soul" —
// the model reconstructs the closest melody it considers musically
// plausible, which keeps the original contour but cleans up the timing
// and fills in gaps the way a trained ear would.
export async function smoothWithAI(notes: NoteEvent[]): Promise<NoteEvent[]> {
  const { sequences, vae } = await getVae();
  const seq = notesToSequence(notes);
  const quantized = sequences.quantizeNoteSequence(seq, STEPS_PER_QUARTER);
  const z = await vae.encode([quantized]);
  const [outSeq] = await vae.decode(z);
  z.dispose();

  const stepSeconds = 60 / BPM / STEPS_PER_QUARTER;
  return (outSeq.notes ?? []).map((n) => ({
    midi: n.pitch ?? 60,
    time: (n.quantizedStartStep ?? 0) * stepSeconds,
    duration: Math.max(
      0.15,
      ((n.quantizedEndStep ?? 1) - (n.quantizedStartStep ?? 0)) * stepSeconds
    ),
  }));
}
