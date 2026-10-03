import {
  BAR_SECONDS,
  DEFAULT_LOOP_SECONDS,
  MAX_RECORD_SECONDS,
  STEP_SECONDS,
  loopSecondsFor,
  midiToFreq,
} from "./scale";
import { padChordsForLoop } from "./harmony";

export type NoteEvent = {
  midi: number;
  time: number; // seconds from loop start
  duration: number; // seconds
};

type Listener = () => void;

// Half-time boom-bap feel, repeated every bar (16 steps).
const KICK_STEPS = [0, 6];
const SNARE_STEPS = [8];

class AudioEngine {
  private ctx: AudioContext | null = null;
  private input: GainNode | null = null;
  private master: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private lofiFilter: BiquadFilterNode | null = null;
  private shaper: WaveShaperNode | null = null;
  private noiseGain: GainNode | null = null;
  private reverbWet: GainNode | null = null;
  private wobbleDepth: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private loop: NoteEvent[] = [];
  private loopSeconds = DEFAULT_LOOP_SECONDS;
  private isPlaying = false;
  private isMuted = false;
  private isRecording = false;
  private beats = false;
  private lofiAmount = 0;
  private beatLevel = 0.8;
  private beatPitch = 0;
  private transpose = 0;
  private recordStart = 0;
  private recordTimeout: number | null = null;
  private recordedNotes: NoteEvent[] = [];
  private activeDowns = new Map<number, number>();

  private loopTimer: number | null = null;
  private scheduledTimers: number[] = [];

  private listeners = new Set<Listener>();

  private ensureContext() {
    if (this.ctx) return this.ctx;
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new Ctx();
    this.ctx = ctx;

    this.input = ctx.createGain();
    this.lofiFilter = ctx.createBiquadFilter();
    this.lofiFilter.type = "lowpass";
    this.lofiFilter.frequency.value = 20000;
    const bus = ctx.createGain();
    this.shaper = ctx.createWaveShaper();
    this.master = ctx.createGain();
    this.master.gain.value = this.isMuted ? 0 : 0.6;
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 256;

    this.input.connect(this.lofiFilter);
    this.lofiFilter.connect(bus);

    // Cheap tape-style echo tail
    const delay = ctx.createDelay(1);
    delay.delayTime.value = 0.19;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.38;
    this.reverbWet = ctx.createGain();
    this.reverbWet.gain.value = 0;
    this.lofiFilter.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(this.reverbWet);
    this.reverbWet.connect(bus);

    // White noise buffer: drums, and (with pops) vinyl crackle
    const rate = ctx.sampleRate;
    this.noiseBuffer = ctx.createBuffer(1, rate, rate);
    const nd = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

    const vinylBuffer = ctx.createBuffer(1, rate * 2, rate);
    const vd = vinylBuffer.getChannelData(0);
    for (let i = 0; i < vd.length; i++) {
      vd[i] = (Math.random() * 2 - 1) * 0.015;
      if (Math.random() < 0.0004) vd[i] = (Math.random() * 2 - 1) * 0.35;
    }
    const vinyl = ctx.createBufferSource();
    vinyl.buffer = vinylBuffer;
    vinyl.loop = true;
    const vinylHp = ctx.createBiquadFilter();
    vinylHp.type = "highpass";
    vinylHp.frequency.value = 900;
    this.noiseGain = ctx.createGain();
    this.noiseGain.gain.value = 0;
    vinyl.connect(vinylHp);
    vinylHp.connect(this.noiseGain);
    this.noiseGain.connect(bus);
    vinyl.start();

    // Slow pitch wobble shared by every melodic voice
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.6;
    this.wobbleDepth = ctx.createGain();
    this.wobbleDepth.gain.value = 0;
    lfo.connect(this.wobbleDepth);
    lfo.start();

    bus.connect(this.shaper);
    this.shaper.connect(this.master);
    this.master.connect(this.analyser);
    this.analyser.connect(ctx.destination);

    this.applyLofi();
    return ctx;
  }

  private applyLofi() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const a = this.lofiAmount;
    this.lofiFilter!.frequency.setTargetAtTime(
      20000 * Math.pow(0.09, a),
      t,
      0.05
    );
    this.noiseGain!.gain.setTargetAtTime(a * 1.2, t, 0.1);
    this.reverbWet!.gain.setTargetAtTime(0.35 * a, t, 0.1);
    this.wobbleDepth!.gain.setTargetAtTime(12 * a, t, 0.1);
    if (a > 0.02) {
      const drive = 1 + a * 2.2;
      const curve = new Float32Array(1024);
      for (let i = 0; i < curve.length; i++) {
        const x = (i / (curve.length - 1)) * 2 - 1;
        curve[i] = Math.tanh(x * drive) / Math.tanh(drive);
      }
      this.shaper!.curve = curve;
    } else {
      this.shaper!.curve = null;
    }
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
      beats: this.beats,
      lofiAmount: this.lofiAmount,
      beatLevel: this.beatLevel,
      beatPitch: this.beatPitch,
      transpose: this.transpose,
      loop: this.loop,
      loopSeconds: this.loopSeconds,
    };
  }

  playNote(midi: number, duration = 0.4, fromLoop = false) {
    const ctx = this.ensureContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = this.lofiAmount > 0.2 ? "triangle" : "sine";
    osc.frequency.value = midiToFreq(midi + this.transpose);
    this.wobbleDepth!.connect(osc.detune);

    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.5, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.input!);
    osc.start(now);
    osc.stop(now + duration + 0.05);
    osc.onended = () => {
      this.wobbleDepth?.disconnect(osc.detune);
    };

    if (this.isRecording && !fromLoop) {
      this.recordedNotes.push({
        midi,
        time: ctx.currentTime - this.recordStart,
        duration,
      });
    }
  }

  private playPad(notes: number[], duration: number) {
    if (this.lofiAmount < 0.05) return;
    const ctx = this.ensureContext();
    const now = ctx.currentTime;
    const padFilter = ctx.createBiquadFilter();
    padFilter.type = "lowpass";
    padFilter.frequency.value = 900;
    const padGain = ctx.createGain();
    padGain.gain.setValueAtTime(0, now);
    padGain.gain.linearRampToValueAtTime(0.04 + 0.1 * this.lofiAmount, now + 0.35);
    padGain.gain.linearRampToValueAtTime(0.0001, now + duration);
    padFilter.connect(padGain);
    padGain.connect(this.input!);
    for (const midi of notes) {
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = midiToFreq(midi + this.transpose);
      this.wobbleDepth!.connect(osc.detune);
      osc.connect(padFilter);
      osc.start(now);
      osc.stop(now + duration + 0.05);
      osc.onended = () => {
        this.wobbleDepth?.disconnect(osc.detune);
      };
    }
  }

  private drumPitch(base: number) {
    return base * Math.pow(2, this.beatPitch / 12);
  }

  private noiseHit(opts: {
    type: BiquadFilterType;
    freq: number;
    duration: number;
    gain: number;
  }) {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = opts.type;
    filter.frequency.value = this.drumPitch(opts.freq);
    const g = ctx.createGain();
    g.gain.setValueAtTime(Math.max(opts.gain * this.beatLevel, 0.0001), now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + opts.duration);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.input!);
    src.start(now);
    src.stop(now + opts.duration + 0.02);
  }

  private playKick() {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.frequency.setValueAtTime(this.drumPitch(130), now);
    osc.frequency.exponentialRampToValueAtTime(this.drumPitch(42), now + 0.14);
    g.gain.setValueAtTime(Math.max(0.9 * this.beatLevel, 0.0001), now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
    osc.connect(g);
    g.connect(this.input!);
    osc.start(now);
    osc.stop(now + 0.35);
  }

  private playSnare() {
    this.noiseHit({ type: "bandpass", freq: 1800, duration: 0.2, gain: 0.5 });
    const ctx = this.ensureContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = this.drumPitch(190);
    const g = ctx.createGain();
    g.gain.setValueAtTime(Math.max(0.25 * this.beatLevel, 0.0001), now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
    osc.connect(g);
    g.connect(this.input!);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  private playHat(velocity: number) {
    this.noiseHit({
      type: "highpass",
      freq: 7000,
      duration: 0.05,
      gain: 0.14 * velocity,
    });
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
    this.recordTimeout = window.setTimeout(
      () => this.finishRecording(),
      MAX_RECORD_SECONDS * 1000
    );
  }

  finishRecording() {
    if (!this.isRecording) return;
    if (this.recordTimeout) window.clearTimeout(this.recordTimeout);
    const elapsed = this.ctx ? this.ctx.currentTime - this.recordStart : 0;
    this.isRecording = false;
    const notes = [...this.recordedNotes].sort((a, b) => a.time - b.time);
    if (notes.length === 0) {
      this.emit();
      return;
    }
    const lastEnd = Math.max(...notes.map((n) => n.time + 0.2));
    this.stop();
    this.loopSeconds = loopSecondsFor(Math.max(elapsed, lastEnd));
    this.loop = notes;
    this.emit();
    this.play();
  }

  setLoop(notes: NoteEvent[], loopSeconds?: number) {
    const wasPlaying = this.isPlaying;
    this.stop();
    this.loop = notes;
    if (loopSeconds !== undefined) this.loopSeconds = loopSeconds;
    this.emit();
    if (wasPlaying || (notes.length > 0 && this.beats)) this.play();
  }

  clearLoop() {
    this.stop();
    this.loop = [];
    this.loopSeconds = DEFAULT_LOOP_SECONDS;
    this.emit();
    if (this.beats) this.play();
  }

  play() {
    if (this.loop.length === 0 && !this.beats) return;
    this.ensureContext();
    this.isPlaying = true;
    this.scheduleLoopCycle();
    this.emit();
  }

  private at(seconds: number, fn: () => void) {
    this.scheduledTimers.push(window.setTimeout(fn, seconds * 1000));
  }

  private scheduleLoopCycle() {
    if (this.loopTimer) window.clearTimeout(this.loopTimer);
    this.scheduledTimers.forEach((t) => window.clearTimeout(t));
    this.scheduledTimers = [];

    const bars = Math.round(this.loopSeconds / BAR_SECONDS);

    for (const n of this.loop) {
      this.at(n.time, () => this.playNote(n.midi, n.duration, true));
    }

    if (this.beats) {
      for (let b = 0; b < bars; b++) {
        const base = b * BAR_SECONDS;
        for (const s of KICK_STEPS) {
          this.at(base + s * STEP_SECONDS + (Math.random() - 0.5) * 0.012, () =>
            this.playKick()
          );
        }
        for (const s of SNARE_STEPS) {
          this.at(base + s * STEP_SECONDS + (Math.random() - 0.5) * 0.012, () =>
            this.playSnare()
          );
        }
        for (let s = 0; s < 16; s += 2) {
          const swing = s % 4 === 2 ? 0.03 : 0;
          const velocity = s % 4 === 0 ? 1 : 0.55 + Math.random() * 0.2;
          this.at(base + s * STEP_SECONDS + swing, () => this.playHat(velocity));
        }
      }
    }

    const chords = padChordsForLoop(this.loop);
    for (let b = 0; b < bars; b++) {
      this.at(b * BAR_SECONDS, () =>
        this.playPad(chords[b % 2], BAR_SECONDS - 0.05)
      );
    }

    this.loopTimer = window.setTimeout(() => {
      if (this.isPlaying) this.scheduleLoopCycle();
    }, this.loopSeconds * 1000);
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

  setLofi(amount: number) {
    this.ensureContext();
    this.lofiAmount = Math.min(1, Math.max(0, amount));
    this.applyLofi();
    this.emit();
  }

  setBeatLevel(level: number) {
    this.beatLevel = Math.min(1, Math.max(0, level));
    this.emit();
  }

  setBeatPitch(semitones: number) {
    this.beatPitch = Math.min(12, Math.max(-12, semitones));
    this.emit();
  }

  setTranspose(semitones: number) {
    this.transpose = Math.min(12, Math.max(-12, semitones));
    this.emit();
  }

  toggleBeats() {
    this.ensureContext();
    this.beats = !this.beats;
    this.emit();
    if (this.beats) {
      this.stop();
      this.play();
    } else if (this.isPlaying) {
      this.stop();
      if (this.loop.length > 0) this.play();
    }
  }
}

export const audioEngine = new AudioEngine();
