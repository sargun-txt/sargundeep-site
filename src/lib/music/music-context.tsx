"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { audioEngine, type NoteEvent } from "./engine";

const STORAGE_KEY = "music-loop-v2";
const LEGACY_KEY = "music-loop-v1";

type MusicState = ReturnType<typeof audioEngine.getState>;

const MusicContext = createContext<{
  state: MusicState;
  startRecording: () => void;
  stopRecording: () => void;
  play: () => void;
  stop: () => void;
  toggleMute: () => void;
  toggleBeats: () => void;
  setLofi: (v: number) => void;
  setBeatLevel: (v: number) => void;
  setBeatPitch: (v: number) => void;
  setTranspose: (v: number) => void;
  clearLoop: () => void;
  setLoop: (notes: NoteEvent[], loopSeconds?: number) => void;
} | null>(null);

export function MusicProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<MusicState>(() => audioEngine.getState());

  useEffect(() => {
    const unsubscribe = audioEngine.subscribe(() =>
      setState(audioEngine.getState())
    );

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as {
          notes: NoteEvent[];
          loopSeconds: number;
        };
        if (Array.isArray(saved.notes) && saved.notes.length > 0) {
          audioEngine.setLoop(saved.notes, saved.loopSeconds);
        }
      } else {
        const legacy = window.localStorage.getItem(LEGACY_KEY);
        if (legacy) {
          const notes = JSON.parse(legacy) as NoteEvent[];
          if (Array.isArray(notes) && notes.length > 0) {
            audioEngine.setLoop(notes, 4);
          }
        }
      }
    } catch {
      // ignore malformed storage
    }

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (state.loop.length > 0) {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ notes: state.loop, loopSeconds: state.loopSeconds })
      );
    }
  }, [state.loop, state.loopSeconds]);

  const startRecording = useCallback(() => audioEngine.startRecording(), []);
  const stopRecording = useCallback(() => audioEngine.finishRecording(), []);
  const play = useCallback(() => audioEngine.play(), []);
  const stop = useCallback(() => audioEngine.stop(), []);
  const toggleMute = useCallback(() => audioEngine.toggleMute(), []);
  const toggleBeats = useCallback(() => audioEngine.toggleBeats(), []);
  const setLofi = useCallback((v: number) => audioEngine.setLofi(v), []);
  const setBeatLevel = useCallback((v: number) => audioEngine.setBeatLevel(v), []);
  const setBeatPitch = useCallback((v: number) => audioEngine.setBeatPitch(v), []);
  const setTranspose = useCallback((v: number) => audioEngine.setTranspose(v), []);
  const clearLoop = useCallback(() => {
    audioEngine.clearLoop();
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_KEY);
  }, []);
  const setLoop = useCallback(
    (notes: NoteEvent[], loopSeconds?: number) =>
      audioEngine.setLoop(notes, loopSeconds),
    []
  );

  return (
    <MusicContext.Provider
      value={{
        state,
        startRecording,
        stopRecording,
        play,
        stop,
        toggleMute,
        toggleBeats,
        setLofi,
        setBeatLevel,
        setBeatPitch,
        setTranspose,
        clearLoop,
        setLoop,
      }}
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
