"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useMode } from "@/lib/mode-context";
import { projects } from "@/lib/projects";

const SignalCore = dynamic(() => import("@/components/SignalCore"), {
  ssr: false,
});

const entrances = [
  { href: "/work", label: "WORK", desc: "Case studies from production systems" },
  { href: "/lab", label: "LAB", desc: "Experiments without résumé pressure" },
  { href: "/writing", label: "WRITING", desc: "Engineering, notes, and everything else" },
  { href: "/music", label: "MUSIC", desc: "Unfinished things sounding increasingly finished" },
  { href: "/about", label: "ABOUT", desc: "Contradictions, not adjectives" },
];

export default function Home() {
  const { mode, setMode } = useMode();

  if (mode === "direct") {
    return (
      <div className="mx-auto max-w-4xl px-5 py-20 sm:px-8">
        <p className="font-mono-label mb-3 text-xs text-[var(--accent)]">
          DIRECT MODE
        </p>
        <h1 className="font-serif-editorial mb-2 text-4xl text-[var(--ink)] sm:text-5xl">
          Sargundeep Singh
        </h1>
        <p className="mb-10 max-w-xl text-lg text-[var(--ink-dim)]">
          I build intelligent systems that speak, reason and act.
        </p>

        <h2 className="font-mono-label mb-4 text-xs text-[var(--ink-faint)]">
          FEATURED WORK
        </h2>
        <div className="mb-12 divide-y divide-[var(--line)] border-y border-[var(--line)]">
          {projects.map((p) => (
            <Link
              key={p.slug}
              href={`/work/${p.slug}`}
              className="group flex items-center justify-between gap-4 py-4 transition-colors hover:text-[var(--accent)]"
            >
              <span>
                <span className="block text-base text-[var(--ink)] group-hover:text-[var(--accent)]">
                  {p.title}
                </span>
                <span className="font-mono-label text-[11px] text-[var(--ink-faint)]">
                  {p.category}
                </span>
              </span>
              <span className="font-mono-label text-xs text-[var(--ink-faint)]">
                →
              </span>
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap gap-4">
          <Link
            href="/work"
            className="rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-[#0b0a08]"
          >
            All projects
          </Link>
          <Link
            href="/about"
            className="rounded-full border border-[var(--line)] px-5 py-2.5 text-sm text-[var(--ink)]"
          >
            About
          </Link>
          <a
            href="/resume.pdf"
            className="rounded-full border border-[var(--line)] px-5 py-2.5 text-sm text-[var(--ink)]"
          >
            Resume
          </a>
          <Link
            href="/writing"
            className="rounded-full border border-[var(--line)] px-5 py-2.5 text-sm text-[var(--ink)]"
          >
            Writing
          </Link>
          <button
            onClick={() => setMode("explore")}
            className="font-mono-label ml-auto text-xs text-[var(--ink-faint)] underline underline-offset-4"
          >
            switch to explore mode
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <section className="relative flex min-h-[85vh] flex-col items-center justify-center overflow-hidden px-5 text-center">
        <div className="pointer-events-auto absolute inset-0 -z-0 opacity-90">
          <SignalCore />
        </div>

        <div className="pointer-events-none relative z-10 flex flex-col items-center">
          <p className="font-mono-label mb-6 text-[11px] text-[var(--ink-faint)]">
            SIGNALS BECOMING SYSTEMS
          </p>
          <h1 className="font-serif-editorial mb-4 text-5xl text-[var(--ink)] sm:text-6xl">
            Sargundeep Singh
          </h1>
          <p className="mb-3 max-w-md text-lg text-[var(--ink-dim)]">
            I build intelligent systems that speak, reason and act.
          </p>
          <p className="mb-10 max-w-md text-sm text-[var(--ink-faint)]">
            Usually somewhere between a production incident, a half-written
            song and an unnecessarily ambitious side project.
          </p>

          <button
            onClick={() => setMode("direct")}
            className="pointer-events-auto font-mono-label rounded-full border border-[var(--line)] px-5 py-2.5 text-xs text-[var(--ink-dim)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            JUST SHOW ME THE WORK →
          </button>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl grid-cols-2 gap-px border border-[var(--line)] bg-[var(--line)] sm:grid-cols-5">
        {entrances.map((e) => (
          <Link
            key={e.href}
            href={e.href}
            className="group flex flex-col justify-between gap-6 bg-[var(--bg)] p-6 transition-colors hover:bg-[var(--bg-raised)]"
          >
            <span className="font-mono-label text-xs text-[var(--accent)]">
              {e.label}
            </span>
            <span className="text-sm text-[var(--ink-faint)] group-hover:text-[var(--ink-dim)]">
              {e.desc}
            </span>
          </Link>
        ))}
      </section>

      <section className="mx-auto max-w-3xl px-5 py-24 text-center sm:px-8">
        <p className="text-sm text-[var(--ink-faint)]">
          Voice becomes structured data. Conversations become workflows.
          Documents become schedules. EEG signals become physical commands.
          Bugs become architecture improvements.
        </p>
      </section>
    </div>
  );
}
