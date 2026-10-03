/**
 * Web Audio API Industrial Techno Test Generator
 * Allows users to test the real-time visualizer instantly without waiting for AI generation.
 */

export class IndustrialDemoSynth {
  private ctx: AudioContext;
  private outputNode: AudioNode;
  private isRunning: boolean = false;
  private timerId: number | null = null;
  private step: number = 0;
  private bpm: number = 138;

  constructor(ctx: AudioContext, outputNode: AudioNode) {
    this.ctx = ctx;
    this.outputNode = outputNode;
  }

  public start(bpm: number = 138) {
    if (this.isRunning) return;
    this.bpm = bpm;
    this.isRunning = true;
    this.step = 0;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const intervalMs = (60 / this.bpm / 4) * 1000; // 16th notes
    this.timerId = window.setInterval(() => {
      this.playStep(this.step);
      this.step = (this.step + 1) % 16;
    }, intervalMs);
  }

  public stop() {
    this.isRunning = false;
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  public getIsRunning() {
    return this.isRunning;
  }

  private playStep(step: number) {
    const t = this.ctx.currentTime;

    // 4/4 Heavy Distorted Kick on steps 0, 4, 8, 12
    if (step % 4 === 0) {
      this.triggerKick(t);
    }

    // Off-beat Industrial Hi-Hat on steps 2, 6, 10, 14
    if (step % 4 === 2) {
      this.triggerHiHat(t);
    }

    // Syncopated Acid 303 Bassline on steps
    if ([0, 3, 6, 8, 11, 14].includes(step)) {
      const notes = [44, 44, 56, 44, 47, 42]; // A1, A1, G#2, A1, B1, F#1 in MIDI
      const noteIdx = [0, 3, 6, 8, 11, 14].indexOf(step);
      const freq = 440 * Math.pow(2, (notes[noteIdx] - 69) / 12);
      this.triggerAcidBass(t, freq, step === 3 || step === 11);
    }
  }

  private triggerKick(t: number) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const distortion = this.ctx.createWaveShaper();

    // Wave shaper curve for industrial clipping
    distortion.curve = this.makeDistortionCurve(40);
    distortion.oversample = '4x';

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.14);

    gain.gain.setValueAtTime(1.0, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);

    osc.connect(distortion);
    distortion.connect(gain);
    gain.connect(this.outputNode);

    osc.start(t);
    osc.stop(t + 0.35);
  }

  private triggerHiHat(t: number) {
    const bufferSize = this.ctx.sampleRate * 0.05;
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
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.outputNode);

    noise.start(t);
  }

  private triggerAcidBass(t: number, freq: number, accent: boolean) {
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, t);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = accent ? 18 : 10;
    filter.frequency.setValueAtTime(accent ? 2400 : 900, t);
    filter.frequency.exponentialRampToValueAtTime(150, t + 0.2);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(accent ? 0.45 : 0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.outputNode);

    osc.start(t);
    osc.stop(t + 0.25);
  }

  private makeDistortionCurve(amount: number) {
    const k = typeof amount === 'number' ? amount : 50;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }
}
