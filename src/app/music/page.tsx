import Instrument from "@/components/music/Instrument";

export const metadata = { title: "Music — Sargundeep Singh" };

export default function Music() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
      <p className="font-mono-label mb-3 text-xs text-[var(--accent)]">
        MUSIC
      </p>
      <h1 className="font-serif-editorial mb-4 text-4xl text-[var(--ink)]">
        Unfinished things, increasingly finished.
      </h1>
      <p className="mb-10 max-w-xl text-[var(--ink-dim)]">
        Play something. Loop it. It'll follow you around the site at a low
        volume until you mute it or record over it — nothing plays until you
        touch a key.
      </p>

      <Instrument />

      <div className="mt-12 rounded-lg border border-dashed border-[var(--line)] p-8 text-center">
        <p className="font-mono-label text-xs text-[var(--ink-faint)]">
          A multitrack production desk with real stems is coming in v2
        </p>
      </div>
    </div>
  );
}
