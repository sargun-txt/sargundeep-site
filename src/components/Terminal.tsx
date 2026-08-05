"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const HELP = [
  "available: help, status, resume, now, music, coffee, charlie, sudo hire sargun",
];

export default function Terminal() {
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<string[]>([
    "sargun@site:~$ type 'help' to begin",
  ]);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "`" && !e.metaKey && !e.ctrlKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function run(cmd: string) {
    const c = cmd.trim().toLowerCase();
    const out: string[] = [`sargun@site:~$ ${cmd}`];

    switch (c) {
      case "help":
        out.push(...HELP);
        break;
      case "status":
        out.push(
          "SYSTEMS: mostly operational",
          "SONGS FINISHED: statistically insignificant",
          "SIDE PROJECTS: exceeding safe limits"
        );
        break;
      case "resume":
        out.push("opening resume...");
        window.open("/resume.pdf", "_blank");
        break;
      case "now":
        out.push("studying computer science + business at the university of alberta, building voice AI systems.");
        break;
      case "music":
        out.push("routing to /music...");
        router.push("/music");
        setOpen(false);
        break;
      case "coffee":
        out.push("brewing... this may take longer than expected, like most of my side projects.");
        break;
      case "charlie":
        out.push("routing to /work/charlie...");
        router.push("/work/charlie");
        setOpen(false);
        break;
      case "sudo hire sargun":
        out.push("permission granted. see /contact for next steps.");
        break;
      case "clear":
        setLines([]);
        setInput("");
        return;
      default:
        out.push(`command not found: ${cmd}. try 'help'.`);
    }

    setLines((prev) => [...prev, ...out]);
    setInput("");
  }

  if (!open) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--line)] bg-[#050403]/97 backdrop-blur">
      <div className="mx-auto max-w-3xl px-4 py-3">
        <div className="font-mono-label mb-2 max-h-48 overflow-y-auto text-xs text-[var(--ink-dim)]">
          {lines.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (input.trim()) run(input);
          }}
          className="flex items-center gap-2"
        >
          <span className="font-mono-label text-xs text-[var(--accent)]">
            &gt;
          </span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="font-mono-label flex-1 bg-transparent text-xs text-[var(--ink)] outline-none"
            placeholder="type a command..."
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="font-mono-label text-[10px] text-[var(--ink-faint)]"
          >
            esc
          </button>
        </form>
      </div>
    </div>
  );
}
