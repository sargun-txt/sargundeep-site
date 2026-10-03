"use client";

import { useEffect, useRef, useState } from "react";
import { useMusic } from "@/lib/music/music-context";
import { audioEngine } from "@/lib/music/engine";
import { KEY_MAP, SCALE_MIDI, LOOP_SECONDS } from "@/lib/music/scale";
import { smoothRuleBased } from "@/lib/music/smooth";
import { isWebGLAvailable, preloadAI, smoothWithAI } from "@/lib/music/magenta";
import { humToMelody } from "@/lib/music/pitch";

const KEY_LABELS = Object.keys(KEY_MAP);

export default function Instrument() {
  const {
    state,
    startRecording,
    play,
    stop,
    clearLoop,
    setLoop,
    toggleLofi,
    toggleBeats,
  } = useMusic();
  const [humStatus, setHumStatus] = useState<
    "idle" | "listening" | "empty" | "blocked"
  >("idle");
  const [humProgress, setHumProgress] = useState(0);
  const [activeKeys, setActiveKeys] = useState<Set<number>>(new Set());
  const [recordProgress, setRecordProgress] = useState(0);
  const [preSmoothLoop, setPreSmoothLoop] = useState<typeof state.loop | null>(
    null
  );
  const [aiStatus, setAiStatus] = useState<
    "idle" | "loading" | "error" | "unavailable"
  >("idle");
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isWebGLAvailable()) {
      setAiStatus("unavailable");
      return;
    }
    if (state.loop.length > 0) preloadAI();
  }, [state.loop.length]);

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

  async function handleHum() {
    setHumStatus("idle");
    setPreSmoothLoop(null);
    let tick: number | undefined;
    try {
      const notes = await humToMelody(() => {
        setHumStatus("listening");
        const start = performance.now();
        tick = window.setInterval(() => {
          setHumProgress(
            Math.min(1, (performance.now() - start) / 1000 / LOOP_SECONDS)
          );
        }, 50);
      });
      if (notes.length === 0) {
        setHumStatus("empty");
        return;
      }
      setLoop(notes);
      play();
      setHumStatus("idle");
    } catch {
      setHumStatus("blocked");
    } finally {
      if (tick) window.clearInterval(tick);
      setHumProgress(0);
    }
  }

  async function handleSmoothAI() {
    setPreSmoothLoop(state.loop);
    setAiStatus("loading");
    try {
      const smoothed = await smoothWithAI(state.loop);
      if (smoothed.length === 0) throw new Error("empty result");
      setLoop(smoothed);
      setAiStatus("idle");
    } catch {
      setAiStatus("error");
    }
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

      <div className="mb-4 flex flex-wrap items-center gap-3">
        {humStatus === "listening" ? (
          <div className="flex items-center gap-3">
            <div className="h-2 w-40 overflow-hidden rounded-full bg-[var(--bg-raised)]">
              <div
                className="h-full bg-[var(--accent)]"
                style={{ width: `${humProgress * 100}%` }}
              />
            </div>
            <span className="font-mono-label text-[11px] text-[var(--accent)]">
              LISTENING — HUM OR WHISTLE
            </span>
          </div>
        ) : (
          <button
            onClick={handleHum}
            disabled={state.isRecording}
            className="rounded-full border border-[var(--line)] px-5 py-2.5 text-sm text-[var(--ink)] disabled:opacity-50"
            title="Hum or whistle for 4 seconds; it becomes a melody. Audio stays in your browser."
          >
            Hum a melody
          </button>
        )}
        <button
          onClick={toggleBeats}
          aria-pressed={state.beats}
          className={`rounded-full border px-5 py-2.5 text-sm ${
            state.beats
              ? "border-[var(--accent)] text-[var(--accent)]"
              : "border-[var(--line)] text-[var(--ink)]"
          }`}
        >
          {state.beats ? "Beat on" : "Add a beat"}
        </button>
        <button
          onClick={toggleLofi}
          aria-pressed={state.lofi}
          className={`rounded-full border px-5 py-2.5 text-sm ${
            state.lofi
              ? "border-[var(--accent)] text-[var(--accent)]"
              : "border-[var(--line)] text-[var(--ink)]"
          }`}
        >
          {state.lofi ? "Lofi on" : "Make it lofi"}
        </button>
        {humStatus === "empty" && (
          <span className="font-mono-label text-[11px] text-[var(--ink-faint)]">
            Didn&apos;t catch a clear pitch — try humming louder and steadier.
          </span>
        )}
        {humStatus === "blocked" && (
          <span className="font-mono-label text-[11px] text-[var(--ink-faint)]">
            Microphone unavailable or blocked in your browser.
          </span>
        )}
      </div>

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
            {aiStatus !== "unavailable" && (
              <button
                onClick={handleSmoothAI}
                disabled={aiStatus === "loading"}
                className="rounded-full border border-[var(--line)] px-5 py-2.5 text-sm text-[var(--ink)] disabled:opacity-50"
                title="Round-trips your melody through an on-device AI model (Magenta) to clean it up while keeping its shape"
              >
                {aiStatus === "loading" ? "Thinking…" : "Smooth it out (AI)"}
              </button>
            )}
            {aiStatus === "error" && (
              <span className="font-mono-label text-[11px] text-[var(--ink-faint)]">
                AI smoothing failed to load — try again, or use the quick
                version
              </span>
            )}
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
