import { LOOP_SECONDS, midiToFreq } from "./scale";

export type NoteEvent = {
  midi: number;
  time: number; // seconds from loop start
  duration: number; // seconds
};

type Listener = () => void;

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private analyser: AnalyserNode | null = null;

  private loop: NoteEvent[] = [];
  private isPlaying = false;
  private isMuted = false;
  private isRecording = false;
  private recordStart = 0;
  private recordedNotes: NoteEvent[] = [];
  private activeDowns = new Map<number, number>();

  private loopTimer: number | null = null;
  private loopStartedAt = 0;
  private scheduledTimers: number[] = [];

  private listeners = new Set<Listener>();

  private ensureContext() {
    if (this.ctx) return this.ctx;
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.isMuted ? 0 : 0.6;
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.master.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
    return this.ctx;
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    this.listeners.forEach((fn) => fn());
  }

  getAnalyser() {
    this.ensureContext();
    return this.analyser;
  }

  // Never creates an AudioContext on its own — only returns data once the
  // visitor has actually played something and one already exists.
  getAnalyserPassive() {
    return this.ctx ? this.analyser : null;
  }

  getState() {
    return {
      isPlaying: this.isPlaying,
      isMuted: this.isMuted,
      isRecording: this.isRecording,
      loop: this.loop,
    };
  }

  playNote(midi: number, duration = 0.4) {
    const ctx = this.ensureContext();
    const master = this.master!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = midiToFreq(midi);

    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.5, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + duration + 0.05);

    if (this.isRecording) {
      const t = (ctx.currentTime - this.recordStart) % LOOP_SECONDS;
      this.recordedNotes.push({ midi, time: t, duration });
    }
  }

  startKey(midi: number) {
    if (this.activeDowns.has(midi)) return;
    this.activeDowns.set(midi, performance.now());
    this.playNote(midi, 0.9);
  }

  stopKey(midi: number) {
    this.activeDowns.delete(midi);
  }

  startRecording() {
    const ctx = this.ensureContext();
    this.isRecording = true;
    this.recordStart = ctx.currentTime;
    this.recordedNotes = [];
    this.emit();
    window.setTimeout(() => {
      if (this.isRecording) this.finishRecording();
    }, LOOP_SECONDS * 1000);
  }

  finishRecording() {
    if (!this.isRecording) return;
    this.isRecording = false;
    this.loop = [...this.recordedNotes];
    this.emit();
    if (this.loop.length > 0) this.play();
  }

  setLoop(notes: NoteEvent[]) {
    const wasPlaying = this.isPlaying;
    this.stop();
    this.loop = notes;
    this.emit();
    if (wasPlaying) this.play();
  }

  clearLoop() {
    this.stop();
    this.loop = [];
    this.emit();
  }

  play() {
    if (this.loop.length === 0) return;
    this.ensureContext();
    this.isPlaying = true;
    this.loopStartedAt = performance.now();
    this.scheduleLoopCycle();
    this.emit();
  }

  private scheduleLoopCycle() {
    this.scheduledTimers.forEach((t) => window.clearTimeout(t));
    this.scheduledTimers = [];
    for (const n of this.loop) {
      const t = window.setTimeout(() => {
        this.playNote(n.midi, n.duration);
      }, n.time * 1000);
      this.scheduledTimers.push(t);
    }
    this.loopTimer = window.setTimeout(() => {
      if (this.isPlaying) this.scheduleLoopCycle();
    }, LOOP_SECONDS * 1000);
  }

  stop() {
    this.isPlaying = false;
    if (this.loopTimer) window.clearTimeout(this.loopTimer);
    this.scheduledTimers.forEach((t) => window.clearTimeout(t));
    this.scheduledTimers = [];
    this.emit();
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.master) {
      this.master.gain.value = this.isMuted ? 0 : 0.6;
    }
    this.emit();
  }
}

export const audioEngine = new AudioEngine();
