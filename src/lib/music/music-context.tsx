"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { audioEngine, type NoteEvent } from "./engine";

const STORAGE_KEY = "music-loop-v1";

type MusicState = {
  isPlaying: boolean;
  isMuted: boolean;
  isRecording: boolean;
  loop: NoteEvent[];
};

const MusicContext = createContext<{
  state: MusicState;
  startRecording: () => void;
  play: () => void;
  stop: () => void;
  toggleMute: () => void;
  clearLoop: () => void;
  setLoop: (notes: NoteEvent[]) => void;
} | null>(null);

export function MusicProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<MusicState>(() => audioEngine.getState());

  useEffect(() => {
    const unsubscribe = audioEngine.subscribe(() =>
      setState(audioEngine.getState())
    );

    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const notes = JSON.parse(raw) as NoteEvent[];
        if (Array.isArray(notes) && notes.length > 0) {
          audioEngine.setLoop(notes);
        }
      } catch {
        // ignore malformed storage
      }
    }

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (state.loop.length > 0) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.loop));
    }
  }, [state.loop]);

  const startRecording = useCallback(() => audioEngine.startRecording(), []);
  const play = useCallback(() => audioEngine.play(), []);
  const stop = useCallback(() => audioEngine.stop(), []);
  const toggleMute = useCallback(() => audioEngine.toggleMute(), []);
  const clearLoop = useCallback(() => {
    audioEngine.clearLoop();
    window.localStorage.removeItem(STORAGE_KEY);
  }, []);
  const setLoop = useCallback((notes: NoteEvent[]) => audioEngine.setLoop(notes), []);

  return (
    <MusicContext.Provider
      value={{ state, startRecording, play, stop, toggleMute, clearLoop, setLoop }}
    >
      {children}
    </MusicContext.Provider>
  );
}

export function useMusic() {
  const ctx = useContext(MusicContext);
  if (!ctx) throw new Error("useMusic must be used within MusicProvider");
  return ctx;
}
