"use client";

import { useEffect, useRef, useState } from "react";
import { useMusic } from "@/lib/music/music-context";
import { audioEngine } from "@/lib/music/engine";
import { KEY_MAP, SCALE_MIDI, LOOP_SECONDS } from "@/lib/music/scale";
import { smoothRuleBased } from "@/lib/music/smooth";

const KEY_LABELS = Object.keys(KEY_MAP);

export default function Instrument() {
  const { state, startRecording, play, stop, clearLoop, setLoop } = useMusic();
  const [activeKeys, setActiveKeys] = useState<Set<number>>(new Set());
  const [recordProgress, setRecordProgress] = useState(0);
  const [preSmoothLoop, setPreSmoothLoop] = useState<typeof state.loop | null>(
    null
  );
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      const midi = KEY_MAP[e.key.toLowerCase()];
      if (midi === undefined || e.repeat) return;
      audioEngine.startKey(midi);
      setActiveKeys((prev) => new Set(prev).add(midi));
    }
    function onKeyUp(e: KeyboardEvent) {
      const midi = KEY_MAP[e.key.toLowerCase()];
      if (midi === undefined) return;
      audioEngine.stopKey(midi);
      setActiveKeys((prev) => {
        const next = new Set(prev);
        next.delete(midi);
        return next;
      });
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useEffect(() => {
    if (!state.isRecording) {
      setRecordProgress(0);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    const start = performance.now();
    function tick() {
      const elapsed = (performance.now() - start) / 1000;
      setRecordProgress(Math.min(1, elapsed / LOOP_SECONDS));
      if (elapsed < LOOP_SECONDS) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [state.isRecording]);

  function pressPad(midi: number) {
    audioEngine.startKey(midi);
    setActiveKeys((prev) => new Set(prev).add(midi));
    window.setTimeout(() => {
      audioEngine.stopKey(midi);
      setActiveKeys((prev) => {
        const next = new Set(prev);
        next.delete(midi);
        return next;
      });
    }, 150);
  }

  function handleSmooth() {
    setPreSmoothLoop(state.loop);
    setLoop(smoothRuleBased(state.loop));
  }

  function handleUndoSmooth() {
    if (preSmoothLoop) {
      setLoop(preSmoothLoop);
      setPreSmoothLoop(null);
    }
  }

  return (
    <div className="rounded-lg border border-[var(--line)] p-6">
      <div className="mb-6 grid grid-cols-5 gap-2 sm:grid-cols-10">
        {SCALE_MIDI.map((midi, i) => (
          <button
            key={midi}
            onMouseDown={() => pressPad(midi)}
            onTouchStart={(e) => {
              e.preventDefault();
              pressPad(midi);
            }}
            className={`font-mono-label flex aspect-square flex-col items-center justify-center rounded-md border text-[10px] transition-colors ${
              activeKeys.has(midi)
                ? "border-[var(--accent)] bg-[var(--accent)]/20 text-[var(--accent)]"
                : "border-[var(--line)] text-[var(--ink-faint)] hover:border-[var(--ink-dim)]"
            }`}
          >
            {KEY_LABELS[i]?.toUpperCase()}
          </button>
        ))}
      </div>

      <p className="font-mono-label mb-6 text-[11px] text-[var(--ink-faint)]">
        Play with the keys above, or your keyboard (A S D F G H J K L ;). Every
        note is in key — nothing you play can sound wrong.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        {!state.isRecording ? (
          <button
            onClick={startRecording}
            className="rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-[#0b0a08]"
          >
            {state.loop.length > 0 ? "Record again" : `Record a ${LOOP_SECONDS}s loop`}
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <div className="h-2 w-40 overflow-hidden rounded-full bg-[var(--bg-raised)]">
              <div
                className="h-full bg-[var(--accent)] transition-[width]"
                style={{ width: `${recordProgress * 100}%` }}
              />
            </div>
            <span className="font-mono-label text-[11px] text-[var(--accent)]">
              RECORDING
            </span>
          </div>
        )}

        {state.loop.length > 0 && !state.isRecording && (
          <>
            <button
              onClick={() => (state.isPlaying ? stop() : play())}
              className="rounded-full border border-[var(--line)] px-5 py-2.5 text-sm text-[var(--ink)]"
            >
              {state.isPlaying ? "Stop" : "Play"}
            </button>
            <button
              onClick={handleSmooth}
              className="rounded-full border border-[var(--line)] px-5 py-2.5 text-sm text-[var(--ink)]"
            >
              Smooth it out
            </button>
            {preSmoothLoop && (
              <button
                onClick={handleUndoSmooth}
                className="font-mono-label text-xs text-[var(--ink-faint)] underline underline-offset-4"
              >
                undo smoothing
              </button>
            )}
            <button
              onClick={() => {
                clearLoop();
                setPreSmoothLoop(null);
              }}
              className="font-mono-label text-xs text-[var(--ink-faint)] underline underline-offset-4"
            >
              clear
            </button>
          </>
        )}
      </div>
    </div>
  );
}
