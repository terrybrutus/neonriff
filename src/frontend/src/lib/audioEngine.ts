export type SongStyle = "metal" | "blues-rock" | "electronic";

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private songStartTime = 0;
  private bpm = 120;
  private style: SongStyle = "metal";
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private beatScheduleTimer: ReturnType<typeof setInterval> | null = null;
  private nextBeatTime = 0;
  private beatIndex = 0;
  private _isPlaying = false;

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.8;
      this.masterGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.55;
      this.musicGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.9;
      this.sfxGain.connect(this.masterGain);
    }
    return this.ctx;
  }

  get isPlaying() {
    return this._isPlaying;
  }

  getSongTime(): number {
    if (!this.ctx || !this._isPlaying) return 0;
    return this.ctx.currentTime - this.songStartTime;
  }

  start(bpm: number, style: SongStyle = "metal", offsetSeconds = 0) {
    const ctx = this.getCtx();
    if (ctx.state === "suspended") ctx.resume();
    this.bpm = bpm;
    this.style = style;
    this.songStartTime = ctx.currentTime - offsetSeconds;
    this._isPlaying = true;
    this.nextBeatTime = ctx.currentTime;
    this.beatIndex = 0;
    this.scheduleBeat();
    this.beatScheduleTimer = setInterval(() => this.scheduleBeat(), 100);
  }

  stop() {
    this._isPlaying = false;
    if (this.beatScheduleTimer !== null) {
      clearInterval(this.beatScheduleTimer);
      this.beatScheduleTimer = null;
    }
  }

  private scheduleBeat() {
    const ctx = this.getCtx();
    const beatDur = 60 / this.bpm;
    const scheduleAhead = 0.2;
    while (this.nextBeatTime < ctx.currentTime + scheduleAhead) {
      this.synthesizeBeat(this.nextBeatTime, this.beatIndex);
      this.beatIndex = (this.beatIndex + 1) % 16;
      this.nextBeatTime += beatDur / 4;
    }
  }

  private synthesizeBeat(when: number, step: number) {
    if (this.style === "electronic") {
      this.beatElectronic(when, step);
    } else if (this.style === "blues-rock") {
      this.beatBlues(when, step);
    } else {
      this.beatMetal(when, step);
    }
  }

  // -----------------------------------------------------------------------
  // METAL — double kick, all 16th hi-hats, heavy chords, aggressive bass
  // -----------------------------------------------------------------------
  private beatMetal(when: number, step: number) {
    const ctx = this.getCtx();
    const out = this.musicGain!;

    if (step === 0 || step === 2 || step === 8 || step === 10) {
      this.synthKick(ctx, when, out);
    }
    if (step === 4 || step === 12) {
      this.synthSnare(ctx, when, out);
    }
    this.synthHihat(ctx, when, out, false);

    const bassPat = [0, -1, 7, -1, 5, -1, 3, -1, 0, -1, 7, -1, 10, -1, 7, -1];
    const bn = bassPat[step];
    if (bn >= 0) this.synthBass(ctx, when, 55 * 2 ** (bn / 12), out);

    if (step % 4 === 0) {
      const chords = [0, 7, 5, 10];
      this.synthGuitar(
        ctx,
        when,
        110 * 2 ** (chords[(step / 4) % 4] / 12),
        out,
      );
    }
  }

  // -----------------------------------------------------------------------
  // BLUES-ROCK — shuffle groove, sparse hi-hat, pentatonic bass walk, E guitar
  // -----------------------------------------------------------------------
  private beatBlues(when: number, step: number) {
    const ctx = this.getCtx();
    const out = this.musicGain!;

    if (step === 0 || step === 8) this.synthKick(ctx, when, out);
    if (step === 4 || step === 12) this.synthSnare(ctx, when, out);

    // Open hi-hat on quarter notes, closed on 8ths
    if (step % 4 === 0) {
      this.synthHihat(ctx, when, out, true);
    } else if (step % 2 === 0) {
      this.synthHihat(ctx, when, out, false);
    }

    // Pentatonic bass walk in E (E2 = 41.2 Hz)
    const bassPat = [0, -1, -1, 4, 5, -1, -1, 7, 5, -1, -1, 4, 0, -1, -1, -1];
    const bn = bassPat[step];
    if (bn >= 0) this.synthBass(ctx, when, 41.2 * 2 ** (bn / 12), out);

    // Sparse guitar stabs on beats 1 and 3 — lower E power chord
    if (step === 0) this.synthGuitar(ctx, when, 82.4, out);
    if (step === 8) this.synthGuitar(ctx, when, 82.4 * 2 ** (5 / 12), out);
  }

  // -----------------------------------------------------------------------
  // ELECTRONIC — 4-on-floor, digital clap, synth bass, arpeggio lead
  // -----------------------------------------------------------------------
  private beatElectronic(when: number, step: number) {
    const ctx = this.getCtx();
    const out = this.musicGain!;

    if (step % 4 === 0) this.synthKick(ctx, when, out);
    if (step === 4 || step === 12) this.synthClap(ctx, when, out);
    this.synthDigiHihat(ctx, when, out);

    // Staccato synth bass (square wave, upper register)
    const bassPat = [0, 12, 7, -1, 5, -1, 7, -1, 0, 12, 5, -1, 10, -1, 7, 5];
    const bn = bassPat[step];
    if (bn >= 0) this.synthSynthBass(ctx, when, 110 * 2 ** (bn / 12), out);

    // Synth arpeggio lead — A3 base (220 Hz)
    const arpPat = [0, 4, 7, 12, 0, 7, 12, 16, 3, 7, 10, 15, 0, 4, 7, 12];
    this.synthArp(ctx, when, 220 * 2 ** (arpPat[step] / 12), out);
  }

  // -----------------------------------------------------------------------
  // Drum / synth primitives
  // -----------------------------------------------------------------------
  private synthKick(ctx: AudioContext, when: number, out: AudioNode) {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.connect(env);
    env.connect(out);
    osc.type = "sine";
    osc.frequency.setValueAtTime(150, when);
    osc.frequency.exponentialRampToValueAtTime(30, when + 0.12);
    env.gain.setValueAtTime(1.2, when);
    env.gain.exponentialRampToValueAtTime(0.001, when + 0.22);
    osc.start(when);
    osc.stop(when + 0.25);
  }

  private synthSnare(ctx: AudioContext, when: number, out: AudioNode) {
    const bufSize = ctx.sampleRate * 0.18;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bpf = ctx.createBiquadFilter();
    bpf.type = "bandpass";
    bpf.frequency.value = 1800;
    bpf.Q.value = 0.9;
    const env = ctx.createGain();
    src.connect(bpf);
    bpf.connect(env);
    env.connect(out);
    env.gain.setValueAtTime(0.8, when);
    env.gain.exponentialRampToValueAtTime(0.001, when + 0.18);
    src.start(when);
    src.stop(when + 0.2);

    const osc = ctx.createOscillator();
    const oenv = ctx.createGain();
    osc.connect(oenv);
    oenv.connect(out);
    osc.frequency.value = 180;
    oenv.gain.setValueAtTime(0.4, when);
    oenv.gain.exponentialRampToValueAtTime(0.001, when + 0.1);
    osc.start(when);
    osc.stop(when + 0.12);
  }

  private synthHihat(
    ctx: AudioContext,
    when: number,
    out: AudioNode,
    open: boolean,
  ) {
    const bufSize = ctx.sampleRate * (open ? 0.25 : 0.04);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const hpf = ctx.createBiquadFilter();
    hpf.type = "highpass";
    hpf.frequency.value = 8000;
    const env = ctx.createGain();
    src.connect(hpf);
    hpf.connect(env);
    env.connect(out);
    env.gain.setValueAtTime(0.3, when);
    env.gain.exponentialRampToValueAtTime(0.001, when + (open ? 0.2 : 0.04));
    src.start(when);
    src.stop(when + (open ? 0.25 : 0.05));
  }

  private synthClap(ctx: AudioContext, when: number, out: AudioNode) {
    const bufSize = ctx.sampleRate * 0.06;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const hpf = ctx.createBiquadFilter();
    hpf.type = "highpass";
    hpf.frequency.value = 2200;
    hpf.Q.value = 0.5;
    const env = ctx.createGain();
    src.connect(hpf);
    hpf.connect(env);
    env.connect(out);
    env.gain.setValueAtTime(0.75, when);
    env.gain.exponentialRampToValueAtTime(0.001, when + 0.09);
    src.start(when);
    src.stop(when + 0.12);
  }

  private synthDigiHihat(ctx: AudioContext, when: number, out: AudioNode) {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    const hpf = ctx.createBiquadFilter();
    osc.connect(hpf);
    hpf.connect(env);
    env.connect(out);
    osc.type = "square";
    osc.frequency.value = 6000 + Math.random() * 2000;
    hpf.type = "highpass";
    hpf.frequency.value = 5000;
    env.gain.setValueAtTime(0.08, when);
    env.gain.exponentialRampToValueAtTime(0.001, when + 0.025);
    osc.start(when);
    osc.stop(when + 0.03);
  }

  private synthBass(
    ctx: AudioContext,
    when: number,
    freq: number,
    out: AudioNode,
  ) {
    const osc = ctx.createOscillator();
    const distortion = ctx.createWaveShaper();
    const env = ctx.createGain();
    const lpf = ctx.createBiquadFilter();

    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i * 2) / 256 - 1;
      curve[i] = ((Math.PI + 100) * x) / (Math.PI + 100 * Math.abs(x));
    }
    distortion.curve = curve;

    osc.connect(distortion);
    distortion.connect(lpf);
    lpf.connect(env);
    env.connect(out);

    lpf.type = "lowpass";
    lpf.frequency.value = 500;
    osc.type = "sawtooth";
    osc.frequency.value = freq;

    const dur = (60 / this.bpm) * 0.9;
    env.gain.setValueAtTime(0.55, when);
    env.gain.exponentialRampToValueAtTime(0.001, when + dur);
    osc.start(when);
    osc.stop(when + dur + 0.05);
  }

  private synthSynthBass(
    ctx: AudioContext,
    when: number,
    freq: number,
    out: AudioNode,
  ) {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    const lpf = ctx.createBiquadFilter();
    osc.connect(lpf);
    lpf.connect(env);
    env.connect(out);
    osc.type = "square";
    osc.frequency.value = freq;
    lpf.type = "lowpass";
    lpf.frequency.value = 1400;
    lpf.Q.value = 2;
    const dur = (60 / this.bpm) * 0.22;
    env.gain.setValueAtTime(0.45, when);
    env.gain.exponentialRampToValueAtTime(0.001, when + dur);
    osc.start(when);
    osc.stop(when + dur + 0.02);
  }

  private synthArp(
    ctx: AudioContext,
    when: number,
    freq: number,
    out: AudioNode,
  ) {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.connect(env);
    env.connect(out);
    osc.type = "sine";
    osc.frequency.value = freq;
    const dur = (60 / this.bpm) * 0.18;
    env.gain.setValueAtTime(0.2, when);
    env.gain.exponentialRampToValueAtTime(0.001, when + dur);
    osc.start(when);
    osc.stop(when + dur + 0.01);
  }

  private synthGuitar(
    ctx: AudioContext,
    when: number,
    freq: number,
    out: AudioNode,
  ) {
    const freqs = [freq, freq * 1.5, freq * 2];
    for (const f of freqs) {
      const osc = ctx.createOscillator();
      const ws = ctx.createWaveShaper();
      const env = ctx.createGain();
      const lpf = ctx.createBiquadFilter();

      const curve = new Float32Array(512);
      for (let i = 0; i < 512; i++) {
        const x = (i * 2) / 512 - 1;
        curve[i] = (3 * x) / (1 + 2 * Math.abs(x));
      }
      ws.curve = curve;

      osc.connect(ws);
      ws.connect(lpf);
      lpf.connect(env);
      env.connect(out);

      lpf.type = "lowpass";
      lpf.frequency.value = 3000;
      osc.type = "sawtooth";
      osc.frequency.value = f;

      const dur = (60 / this.bpm) * 0.85;
      env.gain.setValueAtTime(0.12, when);
      env.gain.exponentialRampToValueAtTime(0.001, when + dur);
      osc.start(when);
      osc.stop(when + dur + 0.05);
    }
  }

  // -----------------------------------------------------------------------
  // SFX
  // -----------------------------------------------------------------------
  playHit(lane: number, rating: "perfect" | "great" | "good") {
    const ctx = this.getCtx();
    if (ctx.state === "suspended") ctx.resume();
    const out = this.sfxGain!;
    const when = ctx.currentTime;

    const laneFreqs = [523.25, 659.25, 783.99, 987.77, 1174.66];
    const freq = laneFreqs[lane] ?? 660;

    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.connect(env);
    env.connect(out);
    osc.type = "triangle";
    osc.frequency.value =
      freq * (rating === "perfect" ? 1 : rating === "great" ? 0.95 : 0.9);

    const dur = rating === "perfect" ? 0.18 : 0.12;
    env.gain.setValueAtTime(0.6, when);
    env.gain.exponentialRampToValueAtTime(0.001, when + dur);
    osc.start(when);
    osc.stop(when + dur + 0.02);

    if (rating === "perfect") {
      const osc2 = ctx.createOscillator();
      const env2 = ctx.createGain();
      osc2.connect(env2);
      env2.connect(out);
      osc2.type = "sine";
      osc2.frequency.value = freq * 2;
      env2.gain.setValueAtTime(0.3, when);
      env2.gain.exponentialRampToValueAtTime(0.001, when + 0.25);
      osc2.start(when);
      osc2.stop(when + 0.27);
    }
  }

  playMiss() {
    const ctx = this.getCtx();
    if (ctx.state === "suspended") ctx.resume();
    const out = this.sfxGain!;
    const when = ctx.currentTime;

    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.connect(env);
    env.connect(out);
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(180, when);
    osc.frequency.exponentialRampToValueAtTime(60, when + 0.18);
    env.gain.setValueAtTime(0.4, when);
    env.gain.exponentialRampToValueAtTime(0.001, when + 0.2);
    osc.start(when);
    osc.stop(when + 0.22);
  }

  setMusicVolume(v: number) {
    if (this.musicGain) this.musicGain.gain.value = v;
  }

  setSfxVolume(v: number) {
    if (this.sfxGain) this.sfxGain.gain.value = v;
  }

  dispose() {
    this.stop();
    this.ctx?.close();
    this.ctx = null;
  }
}

export const audioEngine = new AudioEngine();
