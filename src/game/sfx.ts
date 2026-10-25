/** Minimal WebAudio chiptune-ish SFX. No assets, created lazily on first gesture. */
export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  enabled = true;

  private ensure(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.enabled ? 0.16 : 0;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  unlock() {
    this.ensure();
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    if (this.master) this.master.gain.value = on ? 0.16 : 0;
    if (on) this.ensure();
  }

  private blip(
    freq: number,
    dur: number,
    type: OscillatorType = "square",
    slideTo?: number,
    gain = 1,
    delay = 0,
  ) {
    if (!this.enabled) return;
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.9 * gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private noise(dur: number, gain = 0.7, cutoff = 1400) {
    if (!this.enabled) return;
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const frames = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = gain;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = cutoff;
    src.connect(filter).connect(g).connect(this.master);
    src.start();
  }

  jump() {
    this.blip(520, 0.11, "square", 900, 0.5);
  }
  land() {
    this.noise(0.05, 0.25, 700);
  }
  duck() {
    this.blip(300, 0.07, "square", 170, 0.35);
  }
  /** Pitch climbs while you keep chaining pickups. */
  coin(combo: number) {
    const f = 880 * Math.pow(1.0595, Math.min(combo, 12));
    this.blip(f, 0.06, "square", undefined, 0.32);
    this.blip(f * 1.5, 0.09, "square", undefined, 0.3, 0.05);
  }
  milestone() {
    this.blip(880, 0.07, "square", undefined, 0.45);
    this.blip(1320, 0.09, "square", undefined, 0.4, 0.07);
  }
  crash() {
    this.noise(0.28, 0.8);
    this.blip(220, 0.34, "sawtooth", 48, 0.6);
  }
  timeUp() {
    this.blip(660, 0.12, "square", undefined, 0.4);
    this.blip(494, 0.12, "square", undefined, 0.4, 0.12);
    this.blip(330, 0.26, "square", undefined, 0.4, 0.24);
  }
  start() {
    this.blip(660, 0.06, "square", undefined, 0.4);
    this.blip(990, 0.08, "square", undefined, 0.35, 0.06);
  }
  claim() {
    [784, 988, 1175, 1568].forEach((f, i) => this.blip(f, 0.09, "square", undefined, 0.38, i * 0.07));
  }
  buy() {
    this.blip(523, 0.07, "square", undefined, 0.4);
    this.blip(659, 0.07, "square", undefined, 0.4, 0.07);
    this.blip(784, 0.14, "square", undefined, 0.4, 0.14);
  }
  deny() {
    this.blip(180, 0.14, "sawtooth", 120, 0.4);
  }
  /** Box opened with a blessing: a bright rising arpeggio. */
  powerUp() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => this.blip(f, 0.08, "square", undefined, 0.36, i * 0.05));
  }
  /** Box opened with a curse: a sour descending wobble. */
  curse() {
    this.blip(392, 0.12, "sawtooth", 370, 0.4);
    this.blip(311, 0.14, "sawtooth", 290, 0.4, 0.11);
    this.blip(220, 0.26, "sawtooth", 150, 0.45, 0.23);
  }
  laser() {
    this.blip(1500, 0.09, "square", 380, 0.28);
  }
  boom() {
    this.noise(0.22, 0.6, 900);
    this.blip(160, 0.2, "square", 60, 0.35);
  }
  shield() {
    this.blip(740, 0.08, "triangle", 1480, 0.45);
    this.noise(0.12, 0.35, 2400);
  }
  thrust() {
    this.noise(0.05, 0.12, 500);
  }
}

export const sfx = new Sfx();
