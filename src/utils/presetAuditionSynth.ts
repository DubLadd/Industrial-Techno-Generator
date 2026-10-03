import { TechnoCategory } from '../types/presets';

/**
 * Dedicated Web Audio Audition Synthesizer
 * Plays a 5-second isolated preview clip for any preset using a dedicated small GainNode.
 * Completely decoupled from the master track to prevent any audio interruption.
 */
export class PresetAuditionSynth {
  private ctx: AudioContext | null = null;
  private auditionGainNode: GainNode | null = null;
  private timerId: number | null = null;
  private stopTimeoutId: number | null = null;
  private isPlaying: boolean = false;
  private currentPresetId: string | null = null;

  constructor() {
    // Lazily initialized on first user interaction
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    if (!this.auditionGainNode && this.ctx) {
      // Dedicated small GainNode (isolated preview bus)
      const gain = this.ctx.createGain();
      gain.gain.value = 0.28; // Comfortable preview level
      gain.connect(this.ctx.destination);
      this.auditionGainNode = gain;
    }
  }

  /**
   * Starts a 5-second audition for the given preset
   */
  public auditionPreset(
    presetId: string,
    category: TechnoCategory,
    bpm: number,
    distortion: number,
    resonance: number,
    onEnded?: () => void
  ) {
    this.stop(); // Stop any active audition first
    this.initContext();

    if (!this.ctx || !this.auditionGainNode) return;

    this.isPlaying = true;
    this.currentPresetId = presetId;

    const ctx = this.ctx;
    const gainNode = this.auditionGainNode;
    const now = ctx.currentTime;

    // Reset gain with subtle fade-in
    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setValueAtTime(0.001, now);
    gainNode.gain.linearRampToValueAtTime(0.28, now + 0.05);

    // Schedule 5-second smooth fade-out and stop
    const auditionDuration = 5.0; // 5 seconds
    const fadeOutStart = auditionDuration - 0.5; // at 4.5s
    gainNode.gain.setValueAtTime(0.28, now + fadeOutStart);
    gainNode.gain.linearRampToValueAtTime(0.0001, now + auditionDuration);

    let step = 0;
    const intervalMs = (60 / Math.max(100, Math.min(180, bpm)) / 4) * 1000; // 16th notes

    this.timerId = window.setInterval(() => {
      if (!this.isPlaying) return;
      this.playCategoryPattern(step, category, distortion, resonance);
      step = (step + 1) % 16;
    }, intervalMs);

    // Hard stop after exactly 5.0 seconds
    this.stopTimeoutId = window.setTimeout(() => {
      this.stop();
      if (onEnded) onEnded();
    }, auditionDuration * 1000);
  }

  /**
   * Stops the current audition clip immediately with an anti-pop ramp
   */
  public stop() {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    if (this.stopTimeoutId !== null) {
      clearTimeout(this.stopTimeoutId);
      this.stopTimeoutId = null;
    }

    if (this.ctx && this.auditionGainNode && this.isPlaying) {
      const now = this.ctx.currentTime;
      this.auditionGainNode.gain.cancelScheduledValues(now);
      this.auditionGainNode.gain.setValueAtTime(this.auditionGainNode.gain.value, now);
      this.auditionGainNode.gain.linearRampToValueAtTime(0.0001, now + 0.04);
    }

    this.isPlaying = false;
    this.currentPresetId = null;
  }

  public getActivePresetId(): string | null {
    return this.isPlaying ? this.currentPresetId : null;
  }

  private playCategoryPattern(
    step: number,
    category: TechnoCategory,
    distortion: number,
    resonance: number
  ) {
    if (!this.ctx || !this.auditionGainNode) return;
    const t = this.ctx.currentTime;

    switch (category) {
      case 'Acid':
        // 303 Squelching Bass pattern on steps 0, 3, 6, 8, 11, 14 with resonant kick
        if (step % 4 === 0) this.triggerKick(t, 120, 0.2, 0.7);
        if ([0, 3, 6, 8, 11, 14].includes(step)) {
          const notes = [110, 110, 146.83, 110, 164.81, 130.81];
          const freq = notes[step % notes.length];
          this.triggerAcidSynth(t, freq, resonance);
        }
        if (step % 2 === 1) this.triggerHiHat(t, 0.03, 0.2);
        break;

      case 'Hard':
      case 'Industrial':
        // Heavy saturated 909 kick + industrial metallic clatter
        if (step % 4 === 0) this.triggerDistortedKick(t, distortion);
        if (step % 4 === 2) this.triggerHiHat(t, 0.06, 0.45);
        if (step === 4 || step === 12) this.triggerIndustrialSnare(t);
        break;

      case 'Hypnotic':
        // Fast rolling hypnotic groove
        if (step % 4 === 0) this.triggerKick(t, 130, 0.22, 0.8);
        if (step % 2 === 0) this.triggerPercClick(t, 400 + (step * 80));
        if (step % 4 === 2) this.triggerHiHat(t, 0.04, 0.3);
        break;

      case 'Ambient':
        // Deep sub drone + atmospheric shimmer
        if (step === 0 || step === 8) this.triggerSubDrone(t, 55);
        if (step % 4 === 2) this.triggerHiHat(t, 0.08, 0.15);
        break;

      case 'Peak Time':
      case 'Raw':
      default:
        // Relentless punchy kick + open hats + ride groove
        if (step % 4 === 0) this.triggerKick(t, 140, 0.28, 0.9);
        if (step % 4 === 2) this.triggerHiHat(t, 0.05, 0.4);
        if (step % 2 === 1) this.triggerPercClick(t, 800);
        break;
    }
  }

  // --- Voice Synthesis Helpers ---

  private triggerKick(t: number, startFreq = 135, decay = 0.25, gainLevel = 0.8) {
    if (!this.ctx || !this.auditionGainNode) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(36, t + decay * 0.7);

    gain.gain.setValueAtTime(gainLevel, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + decay);

    osc.connect(gain);
    gain.connect(this.auditionGainNode);

    osc.start(t);
    osc.stop(t + decay);
  }

  private triggerDistortedKick(t: number, driveAmount = 50) {
    if (!this.ctx || !this.auditionGainNode) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const shaper = this.ctx.createWaveShaper();

    // Drive curve
    const k = driveAmount * 0.8;
    const n = 256;
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      curve[i] = ((3 + k) * x * 20 * (Math.PI / 180)) / (Math.PI + k * Math.abs(x));
    }
    shaper.curve = curve;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.18);

    gain.gain.setValueAtTime(0.85, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

    osc.connect(shaper);
    shaper.connect(gain);
    gain.connect(this.auditionGainNode);

    osc.start(t);
    osc.stop(t + 0.3);
  }

  private triggerAcidSynth(t: number, freq: number, resonanceVal = 50) {
    if (!this.ctx || !this.auditionGainNode) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, t);

    filter.type = 'lowpass';
    filter.Q.value = 6 + (resonanceVal / 100) * 12; // Resonant squeal
    filter.frequency.setValueAtTime(1800, t);
    filter.frequency.exponentialRampToValueAtTime(250, t + 0.2);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.auditionGainNode);

    osc.start(t);
    osc.stop(t + 0.24);
  }

  private triggerHiHat(t: number, duration = 0.05, level = 0.3) {
    if (!this.ctx || !this.auditionGainNode) return;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 7500;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(level, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.auditionGainNode);

    noise.start(t);
    noise.stop(t + duration);
  }

  private triggerIndustrialSnare(t: number) {
    if (!this.ctx || !this.auditionGainNode) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.12);

    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(this.auditionGainNode);

    osc.start(t);
    osc.stop(t + 0.16);

    this.triggerHiHat(t, 0.12, 0.4);
  }

  private triggerPercClick(t: number, freq = 600) {
    if (!this.ctx || !this.auditionGainNode) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(100, t + 0.04);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    osc.connect(gain);
    gain.connect(this.auditionGainNode);

    osc.start(t);
    osc.stop(t + 0.05);
  }

  private triggerSubDrone(t: number, freq = 55) {
    if (!this.ctx || !this.auditionGainNode) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.35, t + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

    osc.connect(gain);
    gain.connect(this.auditionGainNode);

    osc.start(t);
    osc.stop(t + 0.85);
  }
}

// Export singleton instance for lightweight isolated auditioning across the rack
export const presetAuditionEngine = new PresetAuditionSynth();
