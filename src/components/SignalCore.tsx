"use client";

import { useEffect, useRef } from "react";
import { audioEngine } from "@/lib/music/engine";

type Node = {
  angle: number;
  radius: number;
  speed: number;
  size: number;
  wobble: number;
};

export default function SignalCore() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouse = useRef({ x: 0, y: 0, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    const nodeCount = 22;
    const nodes: Node[] = Array.from({ length: nodeCount }, (_, i) => ({
      angle: (i / nodeCount) * Math.PI * 2,
      radius: 90 + Math.random() * 60,
      speed: 0.0015 + Math.random() * 0.0015,
      size: 1.5 + Math.random() * 2,
      wobble: Math.random() * Math.PI * 2,
    }));

    let t = 0;
    let raf = 0;
    let freqData: Uint8Array | null = null;

    function onMove(e: PointerEvent) {
      const rect = canvas!.getBoundingClientRect();
      mouse.current.x = e.clientX - rect.left - width / 2;
      mouse.current.y = e.clientY - rect.top - height / 2;
      mouse.current.active = true;
    }
    function onLeave() {
      mouse.current.active = false;
    }
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);

    function draw() {
      ctx!.clearRect(0, 0, width, height);
      const cx = width / 2;
      const cy = height / 2;

      let audioLevel = 0;
      const analyser = audioEngine.getAnalyserPassive();
      if (analyser) {
        if (!freqData || freqData.length !== analyser.frequencyBinCount) {
          freqData = new Uint8Array(analyser.frequencyBinCount);
        }
        analyser.getByteFrequencyData(
          freqData as Uint8Array<ArrayBuffer>
        );
        let sum = 0;
        for (let i = 0; i < freqData.length; i++) sum += freqData[i];
        audioLevel = sum / freqData.length / 255;
      }

      const pull = mouse.current.active
        ? Math.min(
            1,
            Math.hypot(mouse.current.x, mouse.current.y) / (width / 2)
          )
        : 0;
      const tiltX = mouse.current.active ? mouse.current.x * 0.04 : 0;
      const tiltY = mouse.current.active ? mouse.current.y * 0.04 : 0;

      // waveform line through the core
      ctx!.beginPath();
      ctx!.strokeStyle = "rgba(255, 90, 31, 0.35)";
      ctx!.lineWidth = 1;
      const waveW = Math.min(width, height) * 0.9;
      for (let x = -waveW / 2; x <= waveW / 2; x += 4) {
        const freq = 0.06;
        const amp =
          14 *
          Math.sin(x * freq + t * 2) *
          (1 - Math.abs(x) / (waveW / 2)) *
          (mouse.current.active ? 1 + pull : 1) *
          (1 + audioLevel * 1.5);
        const px = cx + x + tiltX * 0.3;
        const py = cy + amp + tiltY * 0.3;
        if (x === -waveW / 2) ctx!.moveTo(px, py);
        else ctx!.lineTo(px, py);
      }
      ctx!.stroke();

      // orbiting nodes with connecting lines
      const pts: { x: number; y: number; size: number }[] = [];
      for (const n of nodes) {
        const a = n.angle + t * n.speed * 60;
        const wob = Math.sin(t * 1.3 + n.wobble) * 6;
        const r = n.radius + wob + pull * 18 + audioLevel * 30;
        const x = cx + Math.cos(a) * r + tiltX;
        const y = cy + Math.sin(a) * r * 0.72 + tiltY;
        pts.push({ x, y, size: n.size + audioLevel * 2 });
      }

      ctx!.strokeStyle = "rgba(236, 230, 216, 0.08)";
      ctx!.lineWidth = 1;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        const b = pts[(i + 5) % pts.length];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist < 140) {
          ctx!.beginPath();
          ctx!.moveTo(a.x, a.y);
          ctx!.lineTo(b.x, b.y);
          ctx!.stroke();
        }
      }

      for (const p of pts) {
        ctx!.beginPath();
        ctx!.fillStyle = "rgba(255, 90, 31, 0.75)";
        ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx!.fill();
      }

      // center pulse
      const pulse = 3 + Math.sin(t * 3) * 1.2 + audioLevel * 6;
      ctx!.beginPath();
      ctx!.fillStyle = "rgba(255, 90, 31, 0.9)";
      ctx!.arc(cx + tiltX, cy + tiltY, pulse, 0, Math.PI * 2);
      ctx!.fill();

      t += reduceMotion ? 0 : 0.016;
      raf = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="h-full w-full touch-none"
      aria-hidden="true"
    />
  );
}
