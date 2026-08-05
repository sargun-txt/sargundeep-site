"use client";

import Link from "next/link";
import { useState } from "react";
import { useMode } from "@/lib/mode-context";

const links = [
  { href: "/work", label: "WORK" },
  { href: "/lab", label: "LAB" },
  { href: "/writing", label: "WRITING" },
  { href: "/music", label: "MUSIC" },
  { href: "/about", label: "ABOUT" },
];

export default function Nav() {
  const { mode, setMode } = useMode();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--bg)]/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
        <Link
          href="/"
          className="font-mono-label text-xs tracking-[0.15em] text-[var(--ink)]"
        >
          SARGUNDEEP.SINGH
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="font-mono-label text-[11px] text-[var(--ink-dim)] transition-colors hover:text-[var(--accent)]"
            >
              {l.label}
            </Link>
          ))}
          <button
            onClick={() => setMode(mode === "explore" ? "direct" : "explore")}
            className="font-mono-label rounded-full border border-[var(--line)] px-3 py-1 text-[10px] text-[var(--ink-dim)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
            title="Toggle between direct and explore mode"
          >
            {mode === "explore" ? "EXPLORE MODE" : "DIRECT MODE"}
          </button>
        </nav>

        <button
          className="font-mono-label text-xs text-[var(--ink-dim)] md:hidden"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "CLOSE" : "MENU"}
        </button>
      </div>

      {open && (
        <nav className="flex flex-col gap-4 border-t border-[var(--line)] px-5 py-5 md:hidden">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="font-mono-label text-sm text-[var(--ink-dim)]"
            >
              {l.label}
            </Link>
          ))}
          <button
            onClick={() => setMode(mode === "explore" ? "direct" : "explore")}
            className="font-mono-label self-start rounded-full border border-[var(--line)] px-3 py-1 text-[11px] text-[var(--ink-dim)]"
          >
            {mode === "explore" ? "EXPLORE MODE" : "DIRECT MODE"}
          </button>
        </nav>
      )}
    </header>
  );
}
