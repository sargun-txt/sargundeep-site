import type { NoteEvent } from "./engine";
import { STEPS_PER_QUARTER, BPM, BAR_SECONDS } from "./scale";
import { closeTheLoop } from "./smooth";

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

// The model works on exactly two bars at a time.
const CHUNK_SECONDS = 2 * BAR_SECONDS;

// The VAE can reconstruct pitches the player never used. Pull each one back
// to the nearest pitch class the melody already contained, so AI smoothing
// stays in the player's own key.
function makeSnapper(notes: NoteEvent[]) {
  const classes = new Set(notes.map((n) => ((n.midi % 12) + 12) % 12));
  return (midi: number) => {
    for (const d of [0, -1, 1, -2, 2, -3, 3]) {
      if (classes.has((((midi + d) % 12) + 12) % 12)) return midi + d;
    }
    return midi;
  };
}

function chunkToSequence(notes: NoteEvent[], offset: number) {
  return {
    notes: notes.map((n) => ({
      pitch: n.midi,
      startTime: n.time - offset,
      endTime: Math.min(n.time - offset + n.duration, CHUNK_SECONDS),
    })),
    totalTime: CHUNK_SECONDS,
    tempos: [{ time: 0, qpm: BPM }],
  };
}

// Encode each two-bar phrase into the model's latent space and decode it
// straight back out. That round trip is what "smooths without losing the
// soul" — the model reconstructs the closest melody it considers musically
// plausible, which keeps the original contour but cleans up the timing.
export async function smoothWithAI(
  notes: NoteEvent[],
  loopSeconds: number
): Promise<NoteEvent[]> {
  const { sequences, vae } = await getVae();
  const snap = makeSnapper(notes);
  const stepSeconds = 60 / BPM / STEPS_PER_QUARTER;
  const chunkCount = Math.ceil(loopSeconds / CHUNK_SECONDS);
  const out: NoteEvent[] = [];

  for (let c = 0; c < chunkCount; c++) {
    const offset = c * CHUNK_SECONDS;
    const inChunk = notes.filter(
      (n) => n.time >= offset && n.time < offset + CHUNK_SECONDS
    );
    if (inChunk.length === 0) continue;

    const quantized = sequences.quantizeNoteSequence(
      chunkToSequence(inChunk, offset),
      STEPS_PER_QUARTER
    );
    const z = await vae.encode([quantized]);
    const [outSeq] = await vae.decode(z);
    z.dispose();

    for (const n of outSeq.notes ?? []) {
      out.push({
        midi: snap(n.pitch ?? 60),
        time: offset + (n.quantizedStartStep ?? 0) * stepSeconds,
        duration: Math.max(
          0.15,
          ((n.quantizedEndStep ?? 1) - (n.quantizedStartStep ?? 0)) *
            stepSeconds
        ),
      });
    }
  }

  return closeTheLoop(out, loopSeconds);
}
