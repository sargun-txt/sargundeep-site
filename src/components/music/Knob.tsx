"use client";

import { useRef } from "react";

type Props = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
};

// Rotary control: drag up/down or use arrow keys. Double-click
// resets. Exposed to assistive tech as a slider.
export default function Knob({
  label,
  value,
  min,
  max,
  step,
  defaultValue,
  format,
  onChange,
}: Props) {
  const drag = useRef<{ y: number; v: number } | null>(null);
  const range = max - min;
  const angle = -135 + 270 * ((value - min) / range);

  function clamp(v: number) {
    const snapped = Math.round(v / step) * step;
    return Math.min(max, Math.max(min, Number(snapped.toFixed(4))));
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={format(value)}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = { y: e.clientY, v: value };
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          const dy = drag.current.y - e.clientY;
          onChange(clamp(drag.current.v + (dy / 140) * range));
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        onDoubleClick={() => onChange(defaultValue)}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp" || e.key === "ArrowRight") {
            e.preventDefault();
            onChange(clamp(value + step));
          } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
            e.preventDefault();
            onChange(clamp(value - step));
          }
        }}
        className="relative h-16 w-16 cursor-ns-resize touch-none select-none rounded-full border border-[var(--line)] bg-[var(--bg-raised)] outline-none transition-colors hover:border-[var(--ink-dim)] focus-visible:border-[var(--accent)]"
      >
        <div
          className="absolute inset-0"
          style={{ transform: `rotate(${angle}deg)` }}
        >
          <div className="mx-auto mt-1.5 h-4 w-0.5 rounded-full bg-[var(--accent)]" />
        </div>
      </div>
      <div className="text-center">
        <div className="font-mono-label text-[10px] text-[var(--ink-dim)]">
          {label}
        </div>
        <div className="font-mono-label text-[10px] text-[var(--ink-faint)]">
          {format(value)}
        </div>
      </div>
    </div>
  );
}
