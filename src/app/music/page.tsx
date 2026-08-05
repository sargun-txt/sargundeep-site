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
      <p className="mb-12 max-w-xl text-[var(--ink-dim)]">
        A production desk with voice, guitar, and effects layers is coming
        in v2. No autoplay, ever — sound stays off until you ask for it.
      </p>
      <div className="rounded-lg border border-dashed border-[var(--line)] p-8 text-center">
        <p className="font-mono-label text-xs text-[var(--ink-faint)]">
          COMING SOON
        </p>
      </div>
    </div>
  );
}
