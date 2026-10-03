import type { NoteEvent } from "./engine";

const MAJ7 = [0, 7, 11, 16];
const MIN7 = [0, 7, 10, 15];

// Two-chord pad that follows the key of the melody: the most-held pitch
// class is the tonic, and the third above it decides major vs minor.
export function padChordsForLoop(notes: NoteEvent[]): number[][] {
  const weight = new Array(12).fill(0);
  for (const n of notes) weight[((n.midi % 12) + 12) % 12] += n.duration;
  if (notes.length === 0) weight[0] = 1;

  const tonic = weight.indexOf(Math.max(...weight));
  const minor = weight[(tonic + 3) % 12] > weight[(tonic + 4) % 12];
  const root = 48 + ((tonic - 48) % 12 + 12) % 12;

  if (minor) {
    return [
      MIN7.map((i) => root + i),
      MAJ7.map((i) => root - 4 + i), // bVI
    ];
  }
  return [
    MAJ7.map((i) => root + i),
    MIN7.map((i) => root - 3 + i), // vi
  ];
}
