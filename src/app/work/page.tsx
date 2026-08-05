import Link from "next/link";
import { projects } from "@/lib/projects";

export const metadata = { title: "Work — Sargundeep Singh" };

export default function WorkIndex() {
  return (
    <div className="mx-auto max-w-4xl px-5 py-16 sm:px-8">
      <p className="font-mono-label mb-3 text-xs text-[var(--accent)]">
        WORK
      </p>
      <h1 className="font-serif-editorial mb-4 text-4xl text-[var(--ink)]">
        Case files, not project cards.
      </h1>
      <p className="mb-12 max-w-xl text-[var(--ink-dim)]">
        Each of these is a system that had to survive contact with real
        users, real data, or real production constraints.
      </p>

      <div className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
        {projects.map((p) => (
          <Link
            key={p.slug}
            href={`/work/${p.slug}`}
            className="group flex flex-col gap-1 py-6 transition-colors"
          >
            <span className="font-mono-label text-[11px] text-[var(--ink-faint)]">
              {p.category}
            </span>
            <span className="text-xl text-[var(--ink)] group-hover:text-[var(--accent)]">
              {p.title}
            </span>
            <span className="text-sm text-[var(--ink-dim)]">
              {p.oneLine}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
