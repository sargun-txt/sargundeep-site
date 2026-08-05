"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Mode = "direct" | "explore";

const ModeContext = createContext<{
  mode: Mode;
  setMode: (m: Mode) => void;
}>({ mode: "explore", setMode: () => {} });

export function ModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<Mode>("explore");

  useEffect(() => {
    const stored = window.localStorage.getItem("mode");
    if (stored === "direct" || stored === "explore") setModeState(stored);
  }, []);

  function setMode(m: Mode) {
    setModeState(m);
    window.localStorage.setItem("mode", m);
  }

  useEffect(() => {
    document.documentElement.dataset.mode = mode;
  }, [mode]);

  return (
    <ModeContext.Provider value={{ mode, setMode }}>
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  return useContext(ModeContext);
}
