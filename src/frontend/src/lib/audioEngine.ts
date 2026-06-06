// Web Audio API synthesis engine for NeonRiff
// All sounds are procedurally generated — no external files needed
// Music: synthesized rock beat (kick, snare, hi-hat, bass riff)
// SFX: hit, miss, perfect ding sounds

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private songStartTime = 0;
  private bpm = 120;
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

  start(bpm: number, offsetSeconds = 0) {
    const ctx = this.getCtx();
    if (ctx.state === "suspended") ctx.resume();
    this.bpm = bpm;
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
      this.beatIndex = (this.beatIndex + 1) % 16; // 16th note grid
      this.nextBeatTime += beatDur / 4; // 16th note subdivision
    }
  }

  // 16th note beat pattern (indices 0-15 in a 4/4 measure)
  private synthesizeBeat(when: number, step: number) {
    const ctx = this.getCtx();
    const out = this.musicGain!;

    // KICK on steps 0, 8 (beats 1 and 3)
    if (step === 0 || step === 8) {
      this.synthKick(ctx, when, out);
    }
    // SNARE on steps 4, 12 (beats 2 and 4)
    if (step === 4 || step === 12) {
      this.synthSnare(ctx, when, out);
    }
    // HI-HAT on every even step
    if (step % 2 === 0) {
      this.synthHihat(ctx, when, out, step % 8 === 0);
    }
    // BASS GUITAR riff — follows a power chord pattern
    const bassPattern = [
      0, -1, -1, -1, 5, -1, -1, -1, 3, -1, -1, -1, 7, -1, -1, -1,
    ];
    const bassNote = bassPattern[step];
    if (bassNote >= 0) {
      this.synthBass(ctx, when, 55 * 2 ** (bassNote / 12), out);
    }
    // GUITAR POWER CHORD — on beats 1, 2, 3, 4 (steps 0, 4, 8, 12)
    if (step % 4 === 0) {
      const chordPattern = [0, 5, 3, 7];
      const chordNote = chordPattern[(step / 4) % 4];
      this.synthGuitar(ctx, when, 110 * 2 ** (chordNote / 12), out);
    }
  }

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
    // Noise burst
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

    // Tone component
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

  private synthGuitar(
    ctx: AudioContext,
    when: number,
    freq: number,
    out: AudioNode,
  ) {
    // Power chord = root + fifth + octave
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

  // ---- SFX ----

  playHit(lane: number, rating: "perfect" | "great" | "good") {
    const ctx = this.getCtx();
    if (ctx.state === "suspended") ctx.resume();
    const out = this.sfxGain!;
    const when = ctx.currentTime;

    // Different tones per lane
    const laneFreqs = [523.25, 659.25, 783.99, 987.77, 1174.66]; // C5, E5, G5, B5, D6
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
      // Add sparkle overtone
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
