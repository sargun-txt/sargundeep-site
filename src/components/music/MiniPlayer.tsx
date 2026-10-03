"use client";

import { useMusic } from "@/lib/music/music-context";

export default function MiniPlayer() {
  const { state, play, stop, toggleMute } = useMusic();

  if (state.loop.length === 0 && !state.beats) return null;

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => (state.isPlaying ? stop() : play())}
        className="font-mono-label rounded-full border border-[var(--line)] px-2.5 py-1 text-[10px] text-[var(--ink-dim)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
        title={state.isPlaying ? "Pause your loop" : "Play your loop"}
      >
        {state.isPlaying ? "⏸" : "▶"} LOOP
      </button>
      <button
        onClick={toggleMute}
        className="font-mono-label rounded-full border border-[var(--line)] px-2.5 py-1 text-[10px] text-[var(--ink-dim)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
        title={state.isMuted ? "Unmute" : "Mute"}
      >
        {state.isMuted ? "MUTED" : "SOUND"}
      </button>
    </div>
  );
}
