"use client";

import { useEffect, useRef, useState } from "react";
import { useMusic } from "@/lib/music/music-context";
import { audioEngine, type NoteEvent } from "@/lib/music/engine";
import { KEY_MAP, SCALE_MIDI, MAX_RECORD_SECONDS } from "@/lib/music/scale";
import { smoothRuleBased } from "@/lib/music/smooth";
import { isWebGLAvailable, preloadAI, smoothWithAI } from "@/lib/music/magenta";
import { humToMelody } from "@/lib/music/pitch";
import Knob from "./Knob";

const KEY_LABELS = Object.keys(KEY_MAP);

const pill =
  "rounded-full border border-[var(--line)] px-5 py-2.5 text-sm text-[var(--ink)] disabled:opacity-50";
const pillOn =
  "rounded-full border border-[var(--accent)] px-5 py-2.5 text-sm text-[var(--accent)]";
const subtle =
  "font-mono-label text-xs text-[var(--ink-faint)] underline underline-offset-4";

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 w-40 overflow-hidden rounded-full bg-[var(--bg-raised)]">
      <div
        className="h-full bg-[var(--accent)]"
        style={{ width: `${value * 100}%` }}
      />
    </div>
  );
}

export default function Instrument() {
  const {
    state,
    startRecording,
    stopRecording,
    play,
    stop,
    clearLoop,
    setLoop,
    toggleBeats,
    setLofi,
    setBeatLevel,
    setBeatPitch,
    setTranspose,
  } = useMusic();
  const [activeKeys, setActiveKeys] = useState<Set<number>>(new Set());
  const [recordProgress, setRecordProgress] = useState(0);
  const [preSmoothLoop, setPreSmoothLoop] = useState<NoteEvent[] | null>(null);
  const [aiStatus, setAiStatus] = useState<
    "idle" | "loading" | "error" | "unavailable"
  >("idle");
  const [humStatus, setHumStatus] = useState<
    "idle" | "listening" | "empty" | "blocked"
  >("idle");
  const [humProgress, setHumProgress] = useState(0);
  const [snapToKey, setSnapToKey] = useState(true);
  const humAbort = useRef<AbortController | null>(null);
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
      return;
    }
    const start = performance.now();
    function tick() {
      const elapsed = (performance.now() - start) / 1000;
      setRecordProgress(Math.min(1, elapsed / MAX_RECORD_SECONDS));
      rafRef.current = requestAnimationFrame(tick);
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
    setLoop(smoothRuleBased(state.loop, state.loopSeconds));
  }

  async function handleSmoothAI() {
    setPreSmoothLoop(state.loop);
    setAiStatus("loading");
    try {
      const smoothed = await smoothWithAI(state.loop, state.loopSeconds);
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

  async function handleHum() {
    setHumStatus("idle");
    setPreSmoothLoop(null);
    const abort = new AbortController();
    humAbort.current = abort;
    let tick: number | undefined;
    try {
      const { notes, loopSeconds } = await humToMelody({
        stopSignal: abort.signal,
        snapToKey,
        onListening: () => {
          setHumStatus("listening");
          const start = performance.now();
          tick = window.setInterval(() => {
            setHumProgress(
              Math.min(1, (performance.now() - start) / 1000 / MAX_RECORD_SECONDS)
            );
          }, 50);
        },
      });
      if (notes.length === 0) {
        setHumStatus("empty");
        return;
      }
      setLoop(notes, loopSeconds);
      play();
      setHumStatus("idle");
    } catch {
      setHumStatus("blocked");
    } finally {
      if (tick) window.clearInterval(tick);
      humAbort.current = null;
      setHumProgress(0);
    }
  }

  const hasLoop = state.loop.length > 0;
  const busy = state.isRecording || humStatus === "listening";

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
        Play the pads or your keyboard (A S D F G H J K L ;), or hum a tune.
        Record up to {MAX_RECORD_SECONDS} seconds and stop whenever you like.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        {!state.isRecording && humStatus !== "listening" && (
          <button onClick={startRecording} className="rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-[#0b0a08]">
            {hasLoop ? "Record again" : "Record"}
          </button>
        )}
        {state.isRecording && (
          <>
            <ProgressBar value={recordProgress} />
            <span className="font-mono-label text-[11px] text-[var(--accent)]">
              RECORDING
            </span>
            <button onClick={stopRecording} className={pillOn}>
              Stop
            </button>
          </>
        )}

        {humStatus === "listening" ? (
          <>
            <ProgressBar value={humProgress} />
            <span className="font-mono-label text-[11px] text-[var(--accent)]">
              LISTENING — HUM OR WHISTLE
            </span>
            <button onClick={() => humAbort.current?.abort()} className={pillOn}>
              Stop
            </button>
          </>
        ) : (
          !state.isRecording && (
            <button
              onClick={handleHum}
              className={pill}
              title="Hum or whistle (up to 15s); it becomes a melody at your own pitch. Audio stays in your browser."
            >
              Hum a melody
            </button>
          )
        )}

        {!busy && (
          <label className="font-mono-label flex items-center gap-2 text-[11px] text-[var(--ink-faint)]">
            <input
              type="checkbox"
              checked={snapToKey}
              onChange={(e) => setSnapToKey(e.target.checked)}
              className="accent-[var(--accent)]"
            />
            snap hum to key
          </label>
        )}

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

      <div className="mb-6 flex flex-wrap items-start gap-6 rounded-md border border-[var(--line)] p-4">
        <div className="flex flex-col items-start gap-3">
          <button
            onClick={toggleBeats}
            aria-pressed={state.beats}
            className={state.beats ? pillOn : pill}
          >
            {state.beats ? "Beat on" : "Add a beat"}
          </button>
          <span className="font-mono-label max-w-[9rem] text-[10px] text-[var(--ink-faint)]">
            Drag a knob up or down. Double-click to reset.
          </span>
        </div>
        <Knob
          label="LOFI"
          value={state.lofiAmount}
          min={0}
          max={1}
          step={0.05}
          defaultValue={0}
          format={(v) => (v === 0 ? "off" : `${Math.round(v * 100)}%`)}
          onChange={setLofi}
        />
        <Knob
          label="BEAT LEVEL"
          value={state.beatLevel}
          min={0}
          max={1}
          step={0.05}
          defaultValue={0.8}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={setBeatLevel}
        />
        <Knob
          label="BEAT PITCH"
          value={state.beatPitch}
          min={-12}
          max={12}
          step={1}
          defaultValue={0}
          format={(v) => `${v > 0 ? "+" : ""}${v} st`}
          onChange={setBeatPitch}
        />
        <Knob
          label="MELODY PITCH"
          value={state.transpose}
          min={-12}
          max={12}
          step={1}
          defaultValue={0}
          format={(v) => `${v > 0 ? "+" : ""}${v} st`}
          onChange={setTranspose}
        />
      </div>

      {hasLoop && !state.isRecording && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => (state.isPlaying ? stop() : play())}
            className={pill}
          >
            {state.isPlaying ? "Stop" : "Play"}
          </button>
          <button onClick={handleSmooth} className={pill}>
            Smooth it out
          </button>
          {aiStatus !== "unavailable" && (
            <button
              onClick={handleSmoothAI}
              disabled={aiStatus === "loading"}
              className={pill}
              title="Round-trips your melody through an on-device AI model (Magenta) to clean it up while keeping its shape"
            >
              {aiStatus === "loading" ? "Thinking…" : "Smooth it out (AI)"}
            </button>
          )}
          {aiStatus === "error" && (
            <span className="font-mono-label text-[11px] text-[var(--ink-faint)]">
              AI smoothing failed to load — try again, or use the quick version
            </span>
          )}
          {preSmoothLoop && (
            <button onClick={handleUndoSmooth} className={subtle}>
              undo smoothing
            </button>
          )}
          <button
            onClick={() => {
              clearLoop();
              setPreSmoothLoop(null);
            }}
            className={subtle}
          >
            clear
          </button>
          <span className="font-mono-label text-[10px] text-[var(--ink-faint)]">
            loop: {state.loopSeconds}s
          </span>
        </div>
      )}
    </div>
  );
}
