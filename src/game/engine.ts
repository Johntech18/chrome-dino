import {
  BUOY,
  CACTUS_LARGE,
  CACTUS_SMALL,
  CLOUD,
  CONE,
  FENCE,
  FIN,
  HORSE,
  HURDLE,
  MEDAL,
  POMMEL,
  SKATEBOARD,
  SURFBOARD,
  TORCH,
  COIN,
  JETPACK,
  MYSTERY_BOX,
  POWER_ICONS,
  DINO_BLINK,
  DINO_DEAD,
  DINO_DUCK_A,
  DINO_DUCK_B,
  DINO_IDLE,
  DINO_RUN_A,
  DINO_RUN_B,
  HATS,
  MOON,
  PTERO_BODY_ROWS,
  PTERO_BODY_TOP,
  PTERO_FRAMES,
  STAR,
  type PixelMap,
  raster,
} from "./sprites";
import { sfx } from "./sfx";
import {
  drawOlympicBackdrop,
  drawOlympicGround,
  drawOlympicRings,
  OLYMPIC_THEME,
} from "./olympicTheme";
import {
  MODES,
  OLYMPIC_EVENTS,
  OLYMPIC_LIST,
  POWERS,
  POWER_LIST,
  SKINS,
  THEMES,
  type ModeDef,
  type ModeId,
  type PowerId,
  type RunSummary,
  type SkinDef,
  type SportId,
  type ThemeDef,
} from "./content";

export const VIEW_H = 300;
export const MAX_W = 1000;
export const MIN_W = 600;

const SCALE = 3;
const GROUND_Y = 246;
const DINO_X = 62;
const STEP = 1000 / 60;
const STRIP_W = 1400;
const DUCK_GRAVITY = 2.9;
const MIN_JUMP_H = 64;
const BUFFER_FRAMES = 7;
const COIN_PX = COIN.w * SCALE;
const BOX_PX = MYSTERY_BOX.w * SCALE;
/** Highest the feet can go while flying: clear of the HUD, still above high pterodactyls. */
const JET_CEILING = 134;
const LASER_SPEED = 15;

export type Phase = "ready" | "running" | "over" | "paused";

export type Snapshot = {
  phase: Phase;
  mode: ModeId;
  score: number;
  hi: number;
  speed: number;
  speedMin: number;
  speedMax: number;
  night: number;
  distance: number;
  milestone: number;
  newBest: boolean;
  runCoins: number;
  coinMult: number;
  timeLeft: number | null;
  timeUp: boolean;
  sport: SportId | null;
  torches: number;
  effects: { id: PowerId; left: number; total: number }[];
  boxes: number;
  zaps: number;
};

type ObstacleKind = "small" | "large" | "ptero";
type Obstacle = {
  kind: ObstacleKind;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Resting y, used by pterodactyls that bob while they flap. */
  by: number;
  anim: number;
  scored: boolean;
  /** Marked when a laser, turbo or shield destroys it. */
  dead?: boolean;
};
type Coin = { x: number; y: number; spin: number; taken: boolean };
type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  g: number;
  life: number;
  max: number;
  size: number;
  color: string | null;
  kind: "sq" | "line";
};
type Popup = { x: number; y: number; life: number; text: string; color?: string };
type MysteryBox = { x: number; y: number; anim: number };
type Laser = { x: number; y: number; vx: number; vy: number; life: number };
type Cloud = { x: number; y: number; s: number };
type Star = { x: number; y: number; tw: number; s: number };
type Pebble = { x: number; y: number; w: number; h: number };
type Box = { x: number; y: number; w: number; h: number };
type RGB = [number, number, number];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const hexRgb = (h: string): RGB => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];
const mixRgb = (a: RGB, b: RGB, t: number): RGB => [
  lerp(a[0], b[0], t),
  lerp(a[1], b[1], t),
  lerp(a[2], b[2], t),
];
const css = (c: RGB) => `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;
/** Snap channels so sprite caches stay small during palette fades. */
const snap = (c: RGB): RGB => c.map((v) => Math.min(255, Math.round(v / 12) * 12)) as RGB;
const overlap = (a: Box, b: Box) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

const OLYMPIC_RGB = {
  dayBg: hexRgb(OLYMPIC_THEME.day.bg),
  dayFg: hexRgb(OLYMPIC_THEME.day.fg),
  nightBg: hexRgb(OLYMPIC_THEME.night.bg),
  nightFg: hexRgb(OLYMPIC_THEME.night.fg),
};

export class DinoGame {
  private ctx!: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private dpr = 1;
  private sized = false;
  vw = MAX_W;

  private raf = 0;
  private last = 0;
  private acc = 0;
  private tick = 0;
  private hitStop = 0;
  private touch = false;
  private reducedMotion = false;
  private fontsReady = false;

  phase: Phase = "ready";
  mode: ModeDef = MODES.classic;
  private skin: SkinDef = SKINS[0];
  private rgb!: { dayBg: RGB; dayFg: RGB; nightBg: RGB; nightFg: RGB };

  score = 0;
  hi = 0;
  speed = 6.2;
  distance = 0;
  night = 0;
  newBest = false;
  private timeUp = false;
  private nightTarget = 0;
  private nextNight = 700;
  private milestone = 0;
  private flash = 0;
  private shake = 0;
  private overAt = 0;
  private ticksLeft = 0;
  private runActive = false;
  private runTicks = 0;

  // run counters
  private runCoins = 0;
  private jumps = 0;
  private dodged = 0;
  private pteros = 0;
  private nightsSeen = 0;
  private duckUsed = false;
  private coinCombo = 0;
  private lastCoinTick = -999;

  // dino
  private dinoY = GROUND_Y;
  private vy = 0;
  private airborne = false;
  private ducking = false;
  private duckHeld = false;
  private jumpDown = false;
  private varJump = false;
  private jumpBuffer = 0;
  private jumpT = 0;
  private runTimer = 0;
  private runFrame = 0;
  private blink = 0;
  private squash = 0;
  private ghost = 0;

  // Olympics: a torch swaps the world into one of six sports
  private sport: SportId | null = null;
  private diveT = -1;
  private diveY = 0;
  private torches: { x: number; y: number; anim: number }[] = [];
  private nextTorch = 1100;
  private runTorches = 0;
  private sportsSeen = new Set<SportId>();
  private sportBanner = 0;
  private medal = false;

  // Arcade: mystery boxes grant timed blessings and curses
  private baseSpeed = 6.2;
  private effects = new Map<PowerId, { left: number; total: number }>();
  private mysteryBoxes: MysteryBox[] = [];
  private nextBox = 600;
  private lasers: Laser[] = [];
  private fireCooldown = 0;
  private bonus = 0;
  private runBoxes = 0;
  private runZaps = 0;
  private powerBanner: { id: PowerId; t: number; blocked: boolean } | null = null;
  private reverseDuck = false;
  private reverseJump = false;

  private obstacles: Obstacle[] = [];
  private coins: Coin[] = [];
  private particles: Particle[] = [];
  private popups: Popup[] = [];
  private clouds: Cloud[] = [];
  private stars: Star[] = [];
  private far: Pebble[] = [];
  private groundOffset = 0;
  private farOffset = 0;
  private nextGap = 520;
  private groundStrip: HTMLCanvasElement | null = null;
  private tintCache = new Map<string, HTMLCanvasElement>();

  onSnapshot: (s: Snapshot) => void = () => {};
  onRunEnd: (r: RunSummary) => void = () => {};
  private snapTick = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.touch = typeof matchMedia !== "undefined" && matchMedia("(pointer: coarse)").matches;
    this.reducedMotion = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.setTheme(THEMES[0]);
    this.buildGround();
    this.resize(MAX_W);
    this.reset();

    if (typeof document !== "undefined" && "fonts" in document) {
      void (document as Document & { fonts: FontFaceSet }).fonts.ready.then(() => {
        this.fontsReady = true;
      });
    } else {
      this.fontsReady = true;
    }
  }

  /* -------------------------------------------------------------- lifecycle */

  start() {
    this.last = performance.now();
    const loop = (now: number) => {
      this.raf = requestAnimationFrame(loop);
      let dt = now - this.last;
      this.last = now;
      if (dt > 220) dt = STEP;
      this.acc += dt;
      let guard = 0;
      while (this.acc >= STEP && guard < 6) {
        if (this.hitStop > 0) this.hitStop--;
        else this.step();
        this.acc -= STEP;
        guard++;
      }
      this.render();
      if (++this.snapTick % 5 === 0) this.emit();
    };
    this.raf = requestAnimationFrame(loop);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
  }

  private emit() {
    this.onSnapshot({
      phase: this.phase,
      mode: this.mode.id,
      score: this.score,
      hi: this.hi,
      speed: this.speed,
      speedMin: this.mode.speedStart,
      speedMax: this.mode.speedMax,
      night: this.night,
      distance: this.distance,
      milestone: this.milestone,
      newBest: this.newBest,
      runCoins: this.runCoins,
      coinMult: this.mode.coinMult,
      timeLeft: this.mode.timeLimit ? Math.max(0, Math.ceil(this.ticksLeft / 60)) : null,
      timeUp: this.timeUp,
      sport: this.sport,
      torches: this.runTorches,
      effects: [...this.effects.entries()].map(([id, e]) => ({ id, left: e.left, total: e.total })),
      boxes: this.runBoxes,
      zaps: this.runZaps,
    });
  }

  /** Resize the logical view. Narrow screens get a narrower world so sprites stay big. */
  resize(cssWidth: number) {
    const vw = Math.round(Math.min(MAX_W, Math.max(MIN_W, cssWidth / 0.8)));
    if (this.sized && vw === this.vw) return;
    this.vw = vw;
    this.sized = true;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = vw * this.dpr;
    this.canvas.height = VIEW_H * this.dpr;
    const ctx = this.canvas.getContext("2d")!;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    this.ctx = ctx;
    this.seedWorld();
  }

  /* ------------------------------------------------------------ configuring */

  setTheme(t: ThemeDef) {
    this.rgb = {
      dayBg: hexRgb(t.day.bg),
      dayFg: hexRgb(t.day.fg),
      nightBg: hexRgb(t.night.bg),
      nightFg: hexRgb(t.night.fg),
    };
  }

  setSkin(s: SkinDef) {
    this.skin = s;
  }

  setHi(n: number) {
    this.hi = n;
  }

  /** Switching mode abandons the current run and returns to the ready screen. */
  setMode(id: ModeId) {
    if (this.runActive) this.endRun("abandon");
    this.mode = MODES[id];
    this.phase = "ready";
    this.reset();
    this.emit();
  }

  /* ------------------------------------------------------------------ setup */

  private seedWorld() {
    this.clouds = [];
    for (let i = 0; i < 5; i++) {
      this.clouds.push({ x: Math.random() * this.vw, y: 26 + Math.random() * 82, s: 0.7 + Math.random() * 0.6 });
    }
    this.stars = [];
    for (let i = 0; i < 28; i++) {
      this.stars.push({
        x: Math.random() * this.vw,
        y: 16 + Math.random() * 130,
        tw: Math.random() * Math.PI * 2,
        s: Math.random() < 0.3 ? 2 : 1,
      });
    }
    this.far = [];
    for (let i = 0; i < 46; i++) {
      this.far.push({
        x: Math.random() * STRIP_W,
        y: GROUND_Y - 26 + Math.random() * 20,
        w: 2 + Math.floor(Math.random() * 3),
        h: 2,
      });
    }
  }

  private buildGround() {
    const cv = document.createElement("canvas");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = STRIP_W * dpr;
    cv.height = (VIEW_H - GROUND_Y + 2) * dpr;
    const c = cv.getContext("2d")!;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.fillStyle = "#fff";
    c.fillRect(0, 0, STRIP_W, 3);
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * STRIP_W;
      const y = 6 + Math.random() * (VIEW_H - GROUND_Y - 8);
      const bw = 2 + Math.floor(Math.random() * 11);
      const bh = Math.random() < 0.72 ? 2 : 3;
      c.globalAlpha = 0.45 + Math.random() * 0.55;
      c.fillRect(Math.floor(x), Math.floor(y), bw, bh);
    }
    c.globalAlpha = 1;
    this.groundStrip = cv;
  }

  private reset() {
    const m = this.mode;
    this.score = 0;
    this.speed = m.speedStart;
    this.baseSpeed = m.speedStart;
    this.effects.clear();
    this.mysteryBoxes = [];
    this.nextBox = 600;
    this.lasers = [];
    this.fireCooldown = 0;
    this.bonus = 0;
    this.runBoxes = 0;
    this.runZaps = 0;
    this.powerBanner = null;
    this.reverseDuck = false;
    this.reverseJump = false;
    this.distance = 0;
    this.obstacles = [];
    this.coins = [];
    this.particles = [];
    this.popups = [];
    this.dinoY = GROUND_Y;
    this.vy = 0;
    this.airborne = false;
    this.ducking = this.duckHeld;
    this.jumpBuffer = 0;
    this.jumpDown = false;
    this.nextGap = 520;
    this.shake = 0;
    this.flash = 0;
    this.squash = 0;
    this.ghost = 0;
    this.sport = null;
    this.diveT = -1;
    this.diveY = 0;
    this.torches = [];
    this.nextTorch = 1100;
    this.runTorches = 0;
    this.sportsSeen.clear();
    this.sportBanner = 0;
    this.medal = false;
    this.dinoY = this.baseY();
    this.runTimer = 0;
    this.runFrame = 0;
    this.newBest = false;
    this.timeUp = false;
    this.milestone = 0;
    this.nextNight = 700;
    this.nightTarget = m.night === "always" ? 1 : 0;
    if (m.night === "always") this.night = 1;
    this.ticksLeft = (m.timeLimit ?? 0) * 60;
    this.runTicks = 0;
    this.runCoins = 0;
    this.jumps = 0;
    this.dodged = 0;
    this.pteros = 0;
    this.nightsSeen = 0;
    this.duckUsed = false;
    this.coinCombo = 0;
    this.hitStop = 0;
    this.seedWorld();
  }

  private begin() {
    this.reset();
    this.phase = "running";
    this.runActive = true;
    sfx.start();
    this.emit();
  }

  /* ------------------------------------------------------------------ input */

  press(source: "key" | "pointer" = "key") {
    sfx.unlock();
    if (this.phase === "paused") {
      this.resume();
      return;
    }
    if (this.phase === "over") {
      if (performance.now() - this.overAt < 450) return;
      this.begin();
    } else if (this.phase === "ready") {
      this.begin();
    }
    if (this.has("reverse")) {
      // cursed controls: the jump input ducks for as long as it is held
      this.reverseDuck = true;
      this.applyDuck(true);
      return;
    }
    if (this.sport === "swimming") {
      this.startDive();
      return;
    }
    this.varJump = source === "key";
    this.jumpDown = true;
    this.tryJump();
  }

  release() {
    this.jumpDown = false;
    if (this.reverseDuck) {
      this.reverseDuck = false;
      this.applyDuck(false);
    }
  }

  private tryJump() {
    if (this.airborne) {
      // with a jetpack, holding jump in the air is thrust rather than a buffered jump
      if (!this.has("jetpack")) this.jumpBuffer = BUFFER_FRAMES;
      return;
    }
    this.jumpBuffer = 0;
    this.vy = (this.mode.jumpV - this.baseSpeed * this.mode.jumpK) * this.jumpMul();
    this.jumpT = 0;
    this.airborne = true;
    this.jumps++;
    this.squash = 0;
    this.puff(5, 0.8);
    sfx.jump();
  }

  setDuck(on: boolean) {
    if (this.has("reverse") && this.phase === "running") {
      // cursed controls: the duck input jumps
      if (on && !this.reverseJump) {
        this.reverseJump = true;
        this.varJump = true;
        this.jumpDown = true;
        this.tryJump();
      } else if (!on && this.reverseJump) {
        this.reverseJump = false;
        this.jumpDown = false;
      }
      return;
    }
    this.applyDuck(on);
  }

  private applyDuck(on: boolean) {
    if (this.mode.olympic && this.sport) return;
    if (on && !this.duckHeld && !this.airborne) sfx.duck();
    if (on && this.phase === "running") this.duckUsed = true;
    this.duckHeld = on;
    this.ducking = on;
  }

  togglePause() {
    if (this.phase === "running") this.pause();
    else if (this.phase === "paused") this.resume();
  }

  /** Hard restart, used by the reload and header buttons. */
  restart() {
    sfx.unlock();
    if (this.runActive) this.endRun("abandon");
    this.begin();
  }

  pause() {
    if (this.phase !== "running") return;
    this.phase = "paused";
    this.jumpDown = false;
    this.emit();
  }

  resume() {
    if (this.phase !== "paused") return;
    this.phase = "running";
    this.last = performance.now();
    this.acc = 0;
    this.emit();
  }

  /* ------------------------------------------------------------------- step */

  private step() {
    this.tick++;
    const running = this.phase === "running";
    const m = this.mode;

    // ambient layers keep drifting even on the ready screen
    const drift = running ? this.speed : 1.1;
    this.groundOffset = (this.groundOffset + drift) % STRIP_W;
    this.farOffset = (this.farOffset + drift * 0.4) % STRIP_W;

    for (const c of this.clouds) {
      c.x -= drift * 0.26 * c.s;
      if (c.x < -90) {
        c.x = this.vw + 40 + Math.random() * 220;
        c.y = 24 + Math.random() * 86;
        c.s = 0.7 + Math.random() * 0.6;
      }
    }
    for (const s of this.stars) {
      s.x -= drift * 0.1;
      s.tw += 0.05;
      if (s.x < -20) {
        s.x = this.vw + 20;
        s.y = 16 + Math.random() * 130;
      }
    }

    if (this.night !== this.nightTarget) {
      this.night += Math.sign(this.nightTarget - this.night) * 0.014;
      if (Math.abs(this.nightTarget - this.night) < 0.015) this.night = this.nightTarget;
    }

    this.updateParticles();
    if (this.flash > 0) this.flash--;
    if (this.shake > 0) this.shake *= 0.86;
    if (this.blink > 0) this.blink--;
    else if (Math.random() < 0.006) this.blink = 7;
    if (this.squash > 0) this.squash = Math.max(0, this.squash - 0.12);
    if (this.ghost > 0) this.ghost--;

    if (!running) return;
    this.runTicks++;

    if (m.timeLimit) {
      this.ticksLeft--;
      if (this.ticksLeft <= 0) {
        this.finishTime();
        return;
      }
    }

    // ---- difficulty ramp
    this.baseSpeed = Math.min(m.speedMax, this.baseSpeed + m.accel);
    this.speed = this.baseSpeed * this.speedMul();
    if (m.arcade) this.tickEffects();
    this.distance += this.speed;
    this.score = Math.floor(this.distance / 19) + this.bonus;

    if (m.night === "cycle" && this.score >= this.nextNight) {
      this.nightTarget = this.nightTarget === 0 ? 1 : 0;
      this.nextNight += 700;
      if (this.nightTarget === 1) this.nightsSeen++;
    }

    const crossed = Math.floor(this.score / 100);
    if (crossed > this.milestone) {
      this.milestone = crossed;
      this.flash = 62;
      sfx.milestone();
    }

    if (m.records && this.score > this.hi) {
      this.hi = this.score;
      this.newBest = true;
    }

    // ---- dino physics
    const base = this.baseY();
    this.ducking = this.duckHeld && !(this.mode.olympic && this.sport);
    if (this.sport === "swimming") {
      if (this.diveT >= 0) {
        this.diveT++;
        const t = this.diveT / 34;
        this.diveY = Math.sin(Math.PI * Math.min(1, t)) * 64;
        if (Math.random() < 0.45) this.bubble();
        if (t >= 1) {
          this.diveT = -1;
          this.diveY = 0;
        }
      }
    } else {
      this.diveT = -1;
      this.diveY = 0;
    }
    if (this.airborne) {
      this.jumpT++;
      const slamming = this.duckHeld && this.vy > 0;
      const g = m.gravity * this.gravityMul();
      if (this.has("jetpack")) {
        this.vy += slamming ? g * DUCK_GRAVITY : g * 0.45;
        if (this.jumpDown) {
          this.vy -= 1.05;
          this.flame();
          if (this.tick % 8 === 0) sfx.thrust();
        }
        this.vy = Math.max(-5.5, Math.min(this.vy, 9));
      } else {
        this.vy += slamming ? g * DUCK_GRAVITY : g;
        // letting go of the key early cuts the jump short, after a guaranteed hop
        const cutV = Math.sqrt(2 * g * 14);
        if (this.varJump && !this.jumpDown && this.vy < -cutV && base - this.dinoY >= MIN_JUMP_H) {
          this.vy = -cutV;
        }
      }
      this.dinoY += this.vy;
      // only powered flight is capped; normal and moon-boot jumps keep their full arc
      if (this.has("jetpack") && this.dinoY < JET_CEILING) {
        this.dinoY = JET_CEILING;
        if (this.vy < 0) this.vy = 0;
      }
      if (this.dinoY >= base) {
        this.dinoY = base;
        this.vy = 0;
        this.airborne = false;
        this.squash = 1;
        this.puff(7, 1.2);
        sfx.land();
        if (this.jumpBuffer > 0) this.tryJump();
      }
    } else {
      this.dinoY = base;
      if (this.tick % 5 === 0) this.puff(1, 0.6);
      // holding jump with a jetpack lifts off immediately
      if (this.has("jetpack") && this.jumpDown) this.tryJump();
    }
    if (this.jumpBuffer > 0) this.jumpBuffer--;

    this.runTimer += 0.12 + this.speed * 0.012;
    if (this.runTimer >= 1) {
      this.runTimer -= 1;
      this.runFrame ^= 1;
    }
    this.emitTrail();
    if (this.has("turbo") || this.has("rush")) this.speedLine();
    if (this.speed > 10 && this.tick % 3 === 0) this.speedLine();

    // ---- obstacles and coins
    this.nextGap -= this.speed;
    if (this.nextGap <= 0) {
      const ext = this.spawn();
      this.nextGap = this.speed * 34 + 250 + Math.random() * (240 + this.speed * 16);
      if (ext && Math.random() < m.coinChance * 0.55) this.spawnArcOver(ext.x0, ext.x1);
      if (Math.random() < m.coinChance) this.spawnGroup(this.vw + 40 + this.nextGap * 0.5);
    }

    if (this.mode.olympic) {
      this.nextTorch -= this.speed;
      if (this.nextTorch <= 0 && this.torches.length === 0) {
        const tx = this.vw + 50;
        const clear = this.obstacles.every((o) => o.x + o.w < tx - 130 || o.x > tx + 190);
        if (clear) {
          this.torches.push({ x: tx, y: GROUND_Y - 64, anim: Math.random() * 6 });
          this.nextTorch = 2500 + Math.random() * 1400;
        } else {
          this.nextTorch = 70;
        }
      }
      for (const t of this.torches) {
        t.x -= this.speed;
        t.anim += 0.16;
      }
      this.torches = this.torches.filter((t) => t.x > -50);
      if (this.sportBanner > 0) this.sportBanner--;
    }

    for (const o of this.obstacles) {
      o.x -= this.speed * (o.kind === "ptero" ? 1.12 : 1);
      o.anim++;
      if (o.kind === "ptero") o.y = o.by + Math.round(Math.sin(o.anim * 0.13) * 2);
      if (!o.scored && o.x + o.w < DINO_X) {
        o.scored = true;
        this.dodged++;
        if (o.kind === "ptero") this.pteros++;
      }
    }
    this.obstacles = this.obstacles.filter((o) => o.x + o.w > -40);

    if (m.arcade) {
      this.nextBox -= this.speed;
      if (this.nextBox <= 0 && this.mysteryBoxes.length === 0) {
        const bx = this.vw + 50;
        const clear = this.obstacles.every((o) => o.x + o.w < bx - 150 || o.x > bx + 190);
        if (clear) {
          // low boxes are run through, high boxes need a jump
          const high = Math.random() < 0.45;
          this.mysteryBoxes.push({ x: bx, y: high ? GROUND_Y - 140 : GROUND_Y - 62, anim: Math.random() * 6 });
          this.nextBox = 1100 + Math.random() * 900;
        } else {
          this.nextBox = 60;
        }
      }
      for (const b of this.mysteryBoxes) {
        b.x -= this.speed;
        b.anim += 0.1;
      }
      this.mysteryBoxes = this.mysteryBoxes.filter((b) => b.x > -50);
      this.updateLasers();
    }

    const grab = this.collectBox();
    const magnet = this.has("magnet");
    const pullX = DINO_X + 30;
    const pullY = this.dinoY + this.diveY - 36;
    for (const c of this.coins) {
      c.x -= this.speed;
      c.spin += 0.11;
      if (magnet && Math.hypot(pullX - c.x, pullY - c.y) < 330) {
        c.x += (pullX - c.x) * 0.16;
        c.y += (pullY - c.y) * 0.16;
      }
      if (!c.taken && overlap(grab, { x: c.x + 3, y: c.y - COIN_PX / 2 + 3, w: COIN_PX - 6, h: COIN_PX - 6 })) {
        this.collect(c);
      }
    }
    this.coins = this.coins.filter((c) => !c.taken && c.x > -40);

    for (const b of [...this.mysteryBoxes]) {
      if (overlap(grab, { x: b.x + 2, y: b.y + 2, w: BOX_PX - 4, h: BOX_PX - 4 })) this.openBox(b);
    }

    const torchBox = this.collectBox();
    for (const t of [...this.torches]) {
      if (overlap(torchBox, { x: t.x + 1, y: t.y - 2, w: 19, h: 47 })) this.collectTorch(t);
    }
    for (const p of this.popups) {
      p.y -= 0.7;
      p.life--;
    }
    this.popups = this.popups.filter((p) => p.life > 0);

    // ---- collisions
    const boxes = this.dinoBoxes();
    for (const o of this.obstacles) {
      const b = this.obstacleBox(o);
      if (boxes.some((d) => overlap(d, b))) {
        if (m.invincible) {
          this.ghost = 40;
        } else if (this.has("turbo")) {
          o.dead = true;
          this.bonus += 5;
          this.explode(o.x + o.w / 2, o.y + o.h / 2, POWERS.turbo.color);
          sfx.boom();
        } else if (this.has("shield")) {
          this.effects.delete("shield");
          o.dead = true;
          this.ghost = 50;
          this.shake = 6;
          this.explode(o.x + o.w / 2, o.y + o.h / 2, POWERS.shield.color);
          sfx.shield();
        } else if (m.arcade && this.ghost > 0) {
          // short grace period after a shield pops
        } else {
          this.die();
          break;
        }
      }
    }
    this.obstacles = this.obstacles.filter((o) => !o.dead);
  }

  /* ------------------------------------------------------------------ boxes */

  private dinoBoxes(): Box[] {
    const y = this.dinoY + this.diveY;
    const S = SCALE;
    if (this.ducking) {
      const h = DINO_DUCK_A.h * S;
      return [{ x: DINO_X + 6, y: y - h + 4, w: DINO_DUCK_A.w * S - 18, h: h - 8 }];
    }
    const h = DINO_IDLE.h * S;
    return [
      { x: DINO_X + 5 * S, y: y - h + 8 * S + 2, w: 15 * S, h: 16 * S - 4 }, // torso and legs
      { x: DINO_X + 13 * S, y: y - h + 3, w: 8 * S, h: 8 * S + 3 }, // head
    ];
  }

  private collectBox(): Box {
    const feet = this.dinoY + this.diveY;
    if (this.ducking) {
      const h = DINO_DUCK_A.h * SCALE;
      return { x: DINO_X + 6, y: feet - h, w: DINO_DUCK_A.w * SCALE - 14, h: h + 4 };
    }
    const h = DINO_IDLE.h * SCALE;
    return { x: DINO_X + 6, y: feet - h, w: 54, h: h + 4 };
  }

  /** Resting height of the feet. Mounts and the pool raise the rex. */
  private baseY(): number {
    if (this.mode.olympic && this.sport) {
      if (this.sport === "swimming") return GROUND_Y - 12;
      if (this.sport === "equestrian") return GROUND_Y - 26;
      if (this.sport === "surfing") return GROUND_Y - 13;
      if (this.sport === "skateboarding") return GROUND_Y - 19;
    }
    return GROUND_Y;
  }

  private startDive() {
    if (this.diveT >= 0) return;
    this.diveT = 0;
    sfx.duck();
    for (let i = 0; i < 7; i++) {
      this.particles.push({
        x: DINO_X + rnd(10, 56),
        y: this.dinoY + 4,
        vx: rnd(-1, 1),
        vy: rnd(-2.2, -0.4),
        g: 0.05,
        life: 24,
        max: 24,
        size: i % 3 === 0 ? 4 : 2,
        color: "#ffffff",
        kind: "sq",
      });
    }
  }

  private bubble() {
    this.particles.push({
      x: DINO_X + rnd(6, 56),
      y: this.dinoY + this.diveY - rnd(0, 20),
      vx: -this.speed * 0.25,
      vy: rnd(-1.4, -0.6),
      g: 0,
      life: 26,
      max: 26,
      size: Math.random() < 0.5 ? 2 : 3,
      color: "#ffffff",
      kind: "sq",
    });
  }

  private collectTorch(t: { x: number; y: number; anim: number }) {
    this.torches = this.torches.filter((o) => o !== t);
    this.runTorches++;
    const ids = OLYMPIC_LIST.filter((e) => e.id !== this.sport).map((e) => e.id);
    const next = ids[Math.floor(Math.random() * ids.length)] ?? "hurdles";
    this.sport = next;
    this.sportsSeen.add(next);
    this.sportBanner = 160;
    this.obstacles = [];
    this.airborne = false;
    this.vy = 0;
    this.duckHeld = false;
    this.ducking = false;
    this.diveT = -1;
    this.diveY = 0;
    this.dinoY = this.baseY();
    this.nextTorch = 2400 + Math.random() * 1200;
    sfx.claim();
    for (let i = 0; i < 16; i++) {
      const a = (Math.PI * 2 * i) / 16;
      this.particles.push({
        x: t.x + 10,
        y: t.y + 20,
        vx: Math.cos(a) * rnd(1.4, 3.4),
        vy: Math.sin(a) * rnd(1.4, 3.4),
        g: 0.06,
        life: 30,
        max: 30,
        size: i % 3 === 0 ? 4 : 2,
        color: i % 2 ? "#ffb23d" : "#ffffff",
        kind: "sq",
      });
    }
    this.emit();
  }

  /* ----------------------------------------------------------------- arcade */

  has(id: PowerId) {
    return this.effects.has(id);
  }

  private speedMul() {
    if (this.has("turbo")) return 1.6;
    if (this.has("rush")) return 1.38;
    return 1;
  }

  private gravityMul() {
    if (this.has("moon")) return 0.55;
    // 1.25 keeps a large cactus clearable (6+ frame window) at the starting speed
    if (this.has("heavy")) return 1.25;
    return 1;
  }

  private jumpMul() {
    return this.has("moon") ? 0.78 : 1;
  }

  private tickEffects() {
    for (const [id, e] of this.effects) {
      e.left--;
      if (e.left <= 0) this.endEffect(id);
    }
    if (this.fireCooldown > 0) this.fireCooldown--;
    if (this.powerBanner && --this.powerBanner.t <= 0) this.powerBanner = null;
  }

  private endEffect(id: PowerId) {
    this.effects.delete(id);
    if (id === "reverse") this.clearHolds();
  }

  private clearHolds() {
    this.reverseDuck = false;
    this.reverseJump = false;
    this.duckHeld = false;
    this.ducking = false;
    this.jumpDown = false;
  }

  private rollPower(): PowerId {
    const total = POWER_LIST.reduce((t, p) => t + p.weight, 0);
    let r = Math.random() * total;
    for (const p of POWER_LIST) {
      r -= p.weight;
      if (r <= 0) return p.id;
    }
    return "magnet";
  }

  private openBox(b: MysteryBox) {
    this.mysteryBoxes = this.mysteryBoxes.filter((x) => x !== b);
    this.runBoxes++;
    const id = this.rollPower();
    this.explode(b.x + BOX_PX / 2, b.y + BOX_PX / 2, POWERS[id].color);
    this.applyPower(id);
  }

  /** Grants a blessing or curse. Public so the UI and tests can trigger outcomes. */
  applyPower(id: PowerId) {
    const def = POWERS[id];
    if (!def.good && this.effects.has("shield")) {
      this.effects.delete("shield");
      this.powerBanner = { id, t: 130, blocked: true };
      sfx.shield();
      this.emit();
      return;
    }
    if (id === "pickpocket") {
      const lost = Math.min(10, this.runCoins);
      this.runCoins -= lost;
      this.popups.push({ x: DINO_X + 18, y: this.dinoY - 92, life: 44, text: `-${lost}`, color: "#d64933" });
    } else {
      const opposite: Partial<Record<PowerId, PowerId>> = {
        moon: "heavy",
        heavy: "moon",
        turbo: "rush",
        rush: "turbo",
      };
      const other = opposite[id];
      if (other) this.endEffect(other);
      this.effects.set(id, { left: def.duration, total: def.duration });
      if (id === "reverse") this.clearHolds();
    }
    if (def.good) {
      sfx.powerUp();
    } else {
      sfx.curse();
      this.shake = Math.max(this.shake, 6);
    }
    this.powerBanner = { id, t: 130, blocked: false };
    this.emit();
  }

  /** Fires a laser that locks on to the nearest obstacle ahead. */
  fire(): boolean {
    if (this.phase !== "running" || !this.has("blaster") || this.fireCooldown > 0) return false;
    this.fireCooldown = 12;
    const feet = this.dinoY + this.diveY;
    const x = DINO_X + (this.ducking ? 84 : 63);
    const y = this.ducking ? feet - 36 : feet - 56;
    const target = this.obstacles
      .filter((o) => !o.dead && o.x + o.w > x + 10 && o.x < this.vw)
      .sort((a, b) => a.x - b.x)[0];
    let vy = 0;
    if (target) {
      const tb = this.obstacleBox(target);
      const tx = tb.x + tb.w / 2;
      const ty = tb.y + tb.h / 2;
      const frames = Math.max(3, (tx - x) / (LASER_SPEED + this.speed));
      vy = Math.max(-8, Math.min(8, (ty - y) / frames));
    }
    this.lasers.push({ x, y, vx: LASER_SPEED, vy, life: 80 });
    sfx.laser();
    for (let i = 0; i < 4; i++) {
      this.particles.push({
        x,
        y,
        vx: rnd(1, 3),
        vy: rnd(-1.2, 1.2),
        g: 0,
        life: 10,
        max: 10,
        size: 2,
        color: "#ffffff",
        kind: "sq",
      });
    }
    return true;
  }

  private updateLasers() {
    for (const l of this.lasers) {
      l.x += l.vx;
      l.y += l.vy;
      l.life--;
      const beam = { x: l.x, y: l.y - 4, w: 18, h: 8 };
      for (const o of this.obstacles) {
        if (o.dead) continue;
        if (overlap(beam, { x: o.x, y: o.y, w: o.w, h: o.h })) {
          o.dead = true;
          l.life = 0;
          this.zap(o);
          break;
        }
      }
    }
    this.lasers = this.lasers.filter((l) => l.life > 0 && l.x < this.vw + 30 && l.y > -20 && l.y < VIEW_H);
    this.obstacles = this.obstacles.filter((o) => !o.dead);
  }

  private zap(o: Obstacle) {
    const points = o.kind === "ptero" ? 25 : 10;
    this.bonus += points;
    if (o.kind === "ptero") this.runZaps++;
    this.popups.push({ x: o.x + o.w / 2 - COIN_PX / 2, y: o.y, life: 36, text: `+${points}`, color: "#ff3d6e" });
    this.explode(o.x + o.w / 2, o.y + o.h / 2, POWERS.blaster.color);
    sfx.boom();
  }

  private explode(x: number, y: number, color: string) {
    for (let i = 0; i < 14; i++) {
      const a = (Math.PI * 2 * i) / 14;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * rnd(1.2, 3.6),
        vy: Math.sin(a) * rnd(1.2, 3.6) - 0.8,
        g: 0.1,
        life: 28,
        max: 28,
        size: i % 3 === 0 ? 4 : 3,
        color: i % 2 ? color : "#ffffff",
        kind: "sq",
      });
    }
  }

  private flame() {
    const feet = this.dinoY + this.diveY;
    this.particles.push({
      x: DINO_X + 14 + rnd(-2, 4),
      y: feet - 30,
      vx: -this.speed * 0.4 + rnd(-0.6, 0.6),
      vy: rnd(2, 3.6),
      g: 0,
      life: 14,
      max: 14,
      size: Math.random() < 0.5 ? 3 : 4,
      color: Math.random() < 0.5 ? "#ff8a3d" : "#ffd95e",
      kind: "sq",
    });
  }

  private obstacleBox(o: Obstacle): Box {
    if (o.kind === "ptero") {
      return {
        x: o.x + 6,
        y: o.y + PTERO_BODY_TOP * SCALE + 1,
        w: o.w - 14,
        h: PTERO_BODY_ROWS * SCALE - 3,
      };
    }
    return { x: o.x + 5, y: o.y + 4, w: o.w - 10, h: o.h - 6 };
  }

  /* --------------------------------------------------------------- spawning */

  private spawn(): { x0: number; x1: number } | null {
    if (this.mode.olympic) return this.spawnOlympic();
    const roll = Math.random();
    const x = this.vw + 40;

    if (this.score > this.mode.pteroFrom && roll < 0.24) {
      const h = PTERO_FRAMES[0].h * SCALE;
      const bodyBottom = (PTERO_BODY_TOP + PTERO_BODY_ROWS) * SCALE;
      const base = GROUND_Y - bodyBottom;
      const levels = [base, base - 46, base - 92];
      const y = levels[Math.floor(Math.random() * levels.length)];
      this.obstacles.push({
        kind: "ptero",
        x,
        y,
        by: y,
        w: PTERO_FRAMES[0].w * SCALE,
        h,
        anim: Math.floor(Math.random() * 24),
        scored: false,
      });
      return null;
    }

    // groups only get wide once the jump arc can actually cover them
    const smallMax = this.speed < 8.6 ? 2 : 3;
    const largeMax = this.speed < 9.6 ? 1 : 2;
    const large = roll >= 0.56;
    const map = large ? CACTUS_LARGE : CACTUS_SMALL;
    const count = 1 + Math.floor(Math.random() * (large ? largeMax : smallMax));
    const w = map.w * SCALE;
    const h = map.h * SCALE;
    const step = w - (large ? 5 : 4);
    for (let i = 0; i < count; i++) {
      this.obstacles.push({
        kind: large ? "large" : "small",
        x: x + i * step,
        y: GROUND_Y - h,
        by: GROUND_Y - h,
        w,
        h,
        anim: 0,
        scored: false,
      });
    }
    return { x0: x, x1: x + (count - 1) * step + w };
  }

  /** Hazard for the active sport, sized to match its sprite. */
  private sportObstacle(): { map: PixelMap; w: number; h: number; accent: string } {
    switch (this.sport) {
      case "swimming":
        return { map: BUOY, w: 48, h: 84, accent: OLYMPIC_EVENTS.swimming.accent };
      case "gymnastics":
        return { map: POMMEL, w: POMMEL.w * SCALE, h: POMMEL.h * SCALE, accent: OLYMPIC_EVENTS.gymnastics.accent };
      case "equestrian":
        return { map: FENCE, w: FENCE.w * SCALE, h: FENCE.h * SCALE, accent: "#e8d5b0" };
      case "surfing":
        return { map: FIN, w: FIN.w * SCALE, h: FIN.h * SCALE, accent: "#bfe6f5" };
      case "skateboarding":
        return { map: CONE, w: CONE.w * SCALE, h: CONE.h * SCALE, accent: OLYMPIC_EVENTS.skateboarding.accent };
      default:
        return { map: HURDLE, w: HURDLE.w * SCALE, h: HURDLE.h * SCALE, accent: "#fdf3e7" };
    }
  }

  /**
   * Before the first torch this is a normal desert run. After it, every sport
   * uses one jumpable hazard, except swimming where the barrier hangs
   * overhead and has to be dived under.
   */
  private spawnOlympic(): { x0: number; x1: number } | null {
    const x = this.vw + 40;
    if (!this.sport) {
      const large = Math.random() > 0.5;
      const map = large ? CACTUS_LARGE : CACTUS_SMALL;
      const h = map.h * SCALE;
      const w = map.w * SCALE;
      const count = 1 + (Math.random() < 0.22 ? 1 : 0);
      const step = w - 4;
      for (let i = 0; i < count; i++) {
        this.obstacles.push({
          kind: large ? "large" : "small",
          x: x + i * step,
          y: GROUND_Y - h,
          by: GROUND_Y - h,
          w,
          h,
          anim: 0,
          scored: false,
        });
      }
      return { x0: x, x1: x + (count - 1) * step + w };
    }
    if (this.sport === "swimming") {
      const h = 84;
      const y = GROUND_Y - 136;
      this.obstacles.push({ kind: "small", x, y, by: y, w: 48, h, anim: 0, scored: false });
      return { x0: x, x1: x + 48 };
    }
    const spec = this.sportObstacle();
    const y = GROUND_Y - spec.h;
    this.obstacles.push({ kind: "small", x, y, by: y, w: spec.w, h: spec.h, anim: 0, scored: false });
    return { x0: x, x1: x + spec.w };
  }

  private addCoin(x: number, y: number) {
    const at = this.sport === "swimming" ? Math.min(y, this.baseY() - 26) : y;
    this.coins.push({ x, y: at, spin: Math.random() * 6, taken: false });
  }

  /** Mid-gap pickups: a runnable line, a jump arc, or a wave. */
  private spawnGroup(cx: number) {
    const pick = Math.random();
    if (pick < 0.4) {
      const n = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) this.addCoin(cx + i * 36, GROUND_Y - 30);
    } else if (pick < 0.75) {
      for (let i = 0; i < 5; i++) {
        this.addCoin(cx + i * 38, GROUND_Y - 28 - 72 * Math.sin((Math.PI * i) / 4));
      }
    } else {
      for (let i = 0; i < 6; i++) this.addCoin(cx + i * 34, GROUND_Y - 62 - 34 * Math.sin(i * 1.1));
    }
  }

  /** A reward arc that hangs over an obstacle, rewarding a clean jump. */
  private spawnArcOver(x0: number, x1: number) {
    const from = x0 - 54;
    const to = x1 + 54;
    const n = 5;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      this.addCoin(from + (to - from) * t, GROUND_Y - 30 - 86 * Math.sin(Math.PI * t));
    }
  }

  private collect(c: Coin) {
    c.taken = true;
    this.runCoins++;
    if (this.tick - this.lastCoinTick > 55) this.coinCombo = 0;
    this.coinCombo++;
    this.lastCoinTick = this.tick;
    sfx.coin(this.coinCombo);
    this.popups.push({ x: c.x, y: c.y - 14, life: 30, text: `+${this.mode.coinMult}` });
    for (let i = 0; i < 7; i++) {
      const a = (Math.PI * 2 * i) / 7;
      this.particles.push({
        x: c.x + COIN_PX / 2,
        y: c.y,
        vx: Math.cos(a) * rnd(1, 2.4),
        vy: Math.sin(a) * rnd(1, 2.4) - 0.6,
        g: 0.08,
        life: 18,
        max: 18,
        size: 3,
        color: "#ffc53d",
        kind: "sq",
      });
    }
  }

  /* --------------------------------------------------------------- particles */

  private puff(n: number, power: number) {
    for (let i = 0; i < n; i++) {
      this.particles.push({
        x: DINO_X + rnd(14, 34),
        y: GROUND_Y - rnd(0, 3),
        vx: -this.speed * rnd(0.15, 0.55) + rnd(-0.8, 0.8) * power,
        vy: -rnd(0.3, 1.5) * power,
        g: 0.05,
        life: 20,
        max: 20,
        size: Math.random() < 0.5 ? 2 : 3,
        color: null,
        kind: "sq",
      });
    }
  }

  private speedLine() {
    this.particles.push({
      x: this.vw + 10,
      y: rnd(24, GROUND_Y - 20),
      vx: -this.speed * rnd(1.6, 2.4),
      vy: 0,
      g: 0,
      life: 26,
      max: 26,
      size: Math.floor(rnd(24, 60)),
      color: null,
      kind: "line",
    });
  }

  private emitTrail() {
    const t = this.skin.trail;
    const mid = this.dinoY - (this.ducking ? 22 : 38);
    if (t === "sparkle" && this.tick % 2 === 0) {
      this.particles.push({
        x: DINO_X + rnd(0, 40),
        y: mid + rnd(-26, 26),
        vx: -this.speed * 0.35,
        vy: rnd(-0.4, 0.4),
        g: 0,
        life: 24,
        max: 24,
        size: Math.random() < 0.4 ? 4 : 3,
        color: Math.random() < 0.5 ? this.skin.accent : (this.skin.hatColor ?? "#ffffff"),
        kind: "sq",
      });
    } else if (t === "neon") {
      this.particles.push({
        x: DINO_X + 6,
        y: mid + rnd(-14, 14),
        vx: -this.speed * 0.95,
        vy: 0,
        g: 0,
        life: 16,
        max: 16,
        size: 4,
        color: Math.random() < 0.5 ? (this.skin.color ?? "#19d3ff") : this.skin.accent,
        kind: "sq",
      });
    } else if (t === "ember" && this.tick % 2 === 0) {
      this.particles.push({
        x: DINO_X + rnd(2, 20),
        y: mid + rnd(-8, 22),
        vx: -this.speed * 0.5,
        vy: -rnd(0.4, 1.2),
        g: -0.01,
        life: 26,
        max: 26,
        size: Math.random() < 0.5 ? 3 : 4,
        color: Math.random() < 0.5 ? this.skin.accent : (this.skin.color ?? "#e04a3a"),
        kind: "sq",
      });
    }
  }

  private updateParticles() {
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.g;
      p.life--;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  /* -------------------------------------------------------------- run ending */

  private die() {
    this.medal = Boolean(this.mode.olympic && this.sport);
    this.phase = "over";
    this.overAt = performance.now();
    this.shake = 14;
    this.hitStop = 7;
    this.ducking = false;
    sfx.crash();
    for (let i = 0; i < 18; i++) {
      const a = Math.random() * Math.PI * 2;
      this.particles.push({
        x: DINO_X + 36,
        y: this.dinoY - 36,
        vx: Math.cos(a) * rnd(1, 4.5),
        vy: Math.sin(a) * rnd(1, 4.5) - 1.5,
        g: 0.18,
        life: 40,
        max: 40,
        size: Math.random() < 0.5 ? 3 : 5,
        color: this.skin.color,
        kind: "sq",
      });
    }
    this.endRun("dead");
    this.emit();
  }

  private finishTime() {
    this.phase = "over";
    this.overAt = performance.now();
    this.timeUp = true;
    this.ducking = false;
    sfx.timeUp();
    this.endRun("time");
    this.emit();
  }

  private endRun(reason: RunSummary["reason"]) {
    if (!this.runActive) return;
    this.runActive = false;
    if (reason === "abandon" && this.score < 5 && this.runCoins === 0) return;
    this.onRunEnd({
      mode: this.mode.id,
      score: this.score,
      distanceM: Math.floor(this.distance / 26),
      pickups: this.runCoins,
      jumps: this.jumps,
      dodged: this.dodged,
      pteros: this.pteros,
      nights: this.nightsSeen,
      torches: this.runTorches,
      sports: this.sportsSeen.size,
      medal: this.medal,
      boxes: this.runBoxes,
      zaps: this.runZaps,
      noDuck: !this.duckUsed,
      reason,
      newBest: this.newBest,
      seconds: Math.round(this.runTicks / 60),
    });
  }

  /* ----------------------------------------------------------------- render */

  private render() {
    const ctx = this.ctx;
    const vw = this.vw;
    const n = this.night;
    const olympic = Boolean(this.mode.olympic);
    // The mode's automatic theme never replaces the player's saved palette.
    const rgb = olympic ? OLYMPIC_RGB : this.rgb;
    const scene = {
      width: vw,
      height: VIEW_H,
      ground: GROUND_Y,
      offset: this.groundOffset,
      frame: this.reducedMotion ? 0 : this.tick,
      night: n,
      sport: this.sport,
      ready: this.phase === "ready",
    };
    const bgRgb = mixRgb(rgb.dayBg, rgb.nightBg, n);
    const fgRgb = mixRgb(rgb.dayFg, rgb.nightFg, n);
    const bg = css(bgRgb);
    const fg = css(fgRgb);
    const fgq = css(snap(fgRgb));

    ctx.save();
    if (this.shake > 0.6) {
      ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake * 0.6);
    }

    ctx.fillStyle = bg;
    ctx.fillRect(-20, -20, vw + 40, VIEW_H + 40);

    if (olympic) drawOlympicBackdrop(ctx, scene);

    // stars and moon
    if (!olympic && n > 0.02) {
      for (const s of this.stars) {
        ctx.globalAlpha = n * (0.45 + 0.55 * Math.abs(Math.sin(s.tw)));
        ctx.drawImage(raster(STAR, fgq, s.s), Math.round(s.x), Math.round(s.y));
      }
      ctx.globalAlpha = n;
      this.drawMoon(fgq);
      ctx.globalAlpha = 1;
    }

    // clouds (olympic arenas have their own skyline)
    if (!olympic) {
      for (const c of this.clouds) {
        ctx.globalAlpha = lerp(0.5, 0.16, n) * c.s;
        ctx.drawImage(raster(CLOUD, fgq, c.s > 1 ? 3 : 2), Math.round(c.x), Math.round(c.y));
      }
    }

    // far dust
    ctx.globalAlpha = 0.26;
    ctx.fillStyle = fg;
    for (const p of this.far) {
      if (olympic) break;
      const x = (((p.x - this.farOffset) % STRIP_W) + STRIP_W) % STRIP_W;
      if (x > vw) continue;
      ctx.fillRect(Math.round(x), Math.round(p.y), p.w, p.h);
    }
    ctx.globalAlpha = 1;

    // speed lines sit behind the action
    for (const p of this.particles) {
      if (p.kind !== "line") continue;
      ctx.globalAlpha = 0.16 * (p.life / p.max);
      ctx.fillStyle = fg;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, 1);
    }
    ctx.globalAlpha = 1;

    // ground
    if (olympic) {
      drawOlympicGround(ctx, scene);
      if (this.sport === "swimming") this.drawWake();
    } else if (this.groundStrip) {
      const off = -this.groundOffset;
      this.drawTinted(this.groundStrip, off, GROUND_Y, fgq);
      this.drawTinted(this.groundStrip, off + STRIP_W, GROUND_Y, fgq);
    }

    // coins
    for (const c of this.coins) {
      const sx = Math.max(0.12, Math.abs(Math.cos(c.spin)));
      const img = raster(COIN, "#8a5a00", SCALE, "#ffc53d");
      const w = COIN_PX * sx;
      ctx.drawImage(img, Math.round(c.x + (COIN_PX - w) / 2), Math.round(c.y - COIN_PX / 2), Math.round(w), COIN_PX);
    }

    if (this.mode.olympic) this.drawTorches();

    // obstacles
    for (const o of this.obstacles) {
      if (this.mode.olympic && this.sport) {
        this.drawSportObstacle(o, fgq);
        continue;
      }
      let map: PixelMap = CACTUS_SMALL;
      if (o.kind === "large") map = CACTUS_LARGE;
      else if (o.kind === "ptero") map = PTERO_FRAMES[Math.floor(o.anim / 6) % 4];
      ctx.drawImage(raster(map, fgq, SCALE), Math.round(o.x), Math.round(o.y));
    }

    if (this.mode.arcade) {
      this.drawMysteryBoxes();
      this.drawLasers();
      this.drawArcadeBehind(fgq);
    }
    this.drawDino(fgq);
    if (this.mode.arcade) this.drawArcadeFront();

    // sparks and dust over the dino
    for (const p of this.particles) {
      if (p.kind === "line") continue;
      ctx.globalAlpha = Math.min(1, p.life / (p.max * 0.7));
      ctx.fillStyle = p.color ?? fg;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
    ctx.globalAlpha = 1;

    if (olympic && (this.phase === "over" || this.phase === "paused")) {
      ctx.fillStyle = bg;
      ctx.globalAlpha = 0.82;
      ctx.fillRect(0, 54, vw, VIEW_H - 54);
      ctx.globalAlpha = 1;
    }

    if (this.mode.arcade) this.drawFog();
    this.drawPopups();
    // during a blackout the HUD sits on near-black, so switch to a light ink
    const hudInk = this.mode.arcade && this.has("fog") && this.phase !== "over" ? "#e8e8e4" : fg;
    this.drawHud(hudInk);

    if (this.phase === "ready") this.drawReady(fg);
    if (this.phase === "over") this.drawOver(fg);
    if (this.phase === "paused") this.drawPaused(hudInk);

    ctx.restore();
  }


  /* ------------------------------------------------------------- olympics */

  private drawWake() {
    const ctx = this.ctx;
    const vw = this.vw;
    const surf = this.baseY() + 8;
    const ev = OLYMPIC_EVENTS.swimming;
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, surf + 8, vw, VIEW_H - surf - 8);
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = ev.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x <= vw; x += 8) {
      const y = surf + Math.sin((x + this.groundOffset * 2) * 0.05) * 3;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = ev.fg;
    ctx.fillRect(0, surf + 30, vw, 2);
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = "#ffffff";
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(DINO_X - 12 - i * 10, surf + 1 + (i % 2) * 4, 6, 2);
    }
    ctx.restore();
  }

  private drawSportObstacle(o: Obstacle, fgq: string) {
    const ctx = this.ctx;
    if (this.sport === "swimming") {
      const accent = OLYMPIC_EVENTS.swimming.accent;
      ctx.save();
      // ropes down from the lane rail
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = fgq;
      for (let i = 0; i < 3; i++) ctx.fillRect(Math.round(o.x + 10 + i * 14), o.y - 34, 2, 36);
      ctx.fillStyle = accent;
      ctx.fillRect(Math.round(o.x), Math.round(o.y - 3), o.w, 3);
      ctx.globalAlpha = 1;
      for (let r = 0; r < 3; r++) {
        for (let i = 0; i < 3; i++) {
          const img = raster(BUOY, fgq, 2, accent);
          ctx.drawImage(img, Math.round(o.x + 1 + i * 15), Math.round(o.y + 4 + r * 26));
        }
      }
      ctx.restore();
      return;
    }
    const spec = this.sportObstacle();
    ctx.drawImage(raster(spec.map, fgq, SCALE, spec.accent), Math.round(o.x), Math.round(o.y));
  }

  private drawTorches() {
    const ctx = this.ctx;
    const now = performance.now();
    for (const t of this.torches) {
      const bob = Math.sin(now * 0.006 + t.anim) * 4;
      const flame = Math.floor(now / 130) % 2 ? "#ff5a1f" : "#ffc53d";
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = "#ffb23d";
      ctx.beginPath();
      ctx.arc(t.x + 10, t.y + 22 + bob, 20 + Math.sin(now * 0.01) * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.drawImage(raster(TORCH, "#c9954a", SCALE, flame), Math.round(t.x), Math.round(t.y + bob));
      ctx.save();
      ctx.fillStyle = this.night > 0.5 ? OLYMPIC_THEME.night.fg : OLYMPIC_THEME.day.fg;
      ctx.globalAlpha = 0.8;
      ctx.font = this.pixelFont(7);
      ctx.textAlign = "center";
      ctx.fillText("TORCH", Math.round(t.x + 10), Math.round(t.y - 12 + bob));
      ctx.restore();
    }
  }

  private drawRings() {
    drawOlympicRings(this.ctx, this.vw / 2, 26, 0.9, this.night > 0.5);
  }

  private drawSportBanner(fg: string) {
    if (!this.sport || this.sportBanner <= 0 || this.phase !== "running") return;
    const ctx = this.ctx;
    const ev = OLYMPIC_EVENTS[this.sport];
    const a = Math.min(1, this.sportBanner / 30);
    ctx.save();
    ctx.textAlign = "center";
    ctx.globalAlpha = a;
    ctx.fillStyle = fg;
    ctx.font = this.pixelFont(19);
    ctx.fillText(ev.name.toUpperCase(), this.center(), 116);
    ctx.globalAlpha = a * 0.6;
    ctx.font = this.pixelFont(8);
    ctx.fillText("TORCH PASSED", this.center(), 136);
    ctx.globalAlpha = a * 0.45;
    ctx.font = this.pixelFont(7);
    ctx.fillText(ev.blurb.toUpperCase(), this.center(), 154);
    ctx.restore();
  }

  private drawSportDino(fgq: string) {
    const ctx = this.ctx;
    const sport = this.sport!;
    const ev = OLYMPIC_EVENTS[sport];
    const map = this.dinoMap();
    const color = this.skin.color ?? fgq;
    const w = map.w * SCALE;
    const h = map.h * SCALE;
    const x = DINO_X;
    const feet = Math.round(this.dinoY + this.diveY);
    const y = feet - h;

    // mounts sit under the rex and jump with it
    if (sport === "equestrian") {
      const horse = raster(HORSE, "#9a6b3d", 2, "#5a3a1f");
      ctx.drawImage(horse, x + 12, feet - 2);
    } else if (sport === "surfing") {
      const board = raster(SURFBOARD, "#f2b01e", 3, "#fdf3e7");
      ctx.drawImage(board, x - 2, feet + 1);
      ctx.save();
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = "#ffffff";
      for (let i = 0; i < 4; i++) ctx.fillRect(x - 14 - i * 9, feet + 4 + (i % 2) * 3, 6, 2);
      ctx.restore();
    } else if (sport === "skateboarding") {
      const board = raster(SKATEBOARD, "#2a2f36", 3, ev.accent);
      ctx.drawImage(board, x + 2, feet + 1);
    }

    const spin =
      sport === "gymnastics" && this.airborne ? Math.min(1, this.jumpT / 38) * Math.PI * 2 : 0;

    ctx.save();
    if (spin > 0) {
      ctx.translate(x + w / 2, y + h / 2);
      ctx.rotate(spin);
      ctx.translate(-(x + w / 2), -(y + h / 2));
    }
    if (this.squash > 0) {
      const k = 0.16 * this.squash;
      ctx.translate(x + w / 2, feet);
      ctx.scale(1 + k, 1 - k);
      ctx.translate(-(x + w / 2), -feet);
    }
    ctx.drawImage(raster(map, color, SCALE), x, Math.round(y));

    if (sport === "hurdles") {
      ctx.fillStyle = "#ffd95e";
      ctx.fillRect(x + 6 * SCALE, feet - 5, 7 * SCALE, 5);
      ctx.fillRect(x + 13 * SCALE, feet - 5, 7 * SCALE, 5);
      ctx.fillStyle = "#d64933";
      ctx.fillRect(x + 16 * SCALE, y + 12 * SCALE, 2 * SCALE, 7 * SCALE);
      ctx.fillStyle = "#f2b01e";
      ctx.beginPath();
      ctx.arc(x + 17 * SCALE, y + 21 * SCALE, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (sport === "swimming") {
      ctx.fillStyle = ev.accent;
      ctx.fillRect(x + 12 * SCALE, y + 1.4 * SCALE, 10 * SCALE, 1.6 * SCALE);
      ctx.fillRect(x + 11 * SCALE, y + 4 * SCALE, 3 * SCALE, 2 * SCALE);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x + 15 * SCALE, y + 3.4 * SCALE, 3 * SCALE, 2 * SCALE);
    } else if (sport === "gymnastics") {
      ctx.fillStyle = ev.accent;
      ctx.fillRect(x + 9 * SCALE, y + 13 * SCALE, 8 * SCALE, 3 * SCALE);
      ctx.fillRect(x + 11 * SCALE, y + 16 * SCALE, 5 * SCALE, 2 * SCALE);
    } else if (sport === "equestrian" || sport === "skateboarding") {
      ctx.fillStyle = ev.accent;
      ctx.fillRect(x + 14 * SCALE, y + 0.4 * SCALE, 8 * SCALE, 2.2 * SCALE);
    } else if (sport === "surfing") {
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.fillRect(x + 13 * SCALE, y + 3 * SCALE, 7 * SCALE, 1.6 * SCALE);
    }
    ctx.restore();

    if (sport === "swimming") {
      // water in front of the rex hides the legs and sells the swim
      const surf = this.baseY() + 9;
      ctx.save();
      ctx.fillStyle = this.night > 0.5 ? "#244961" : "#78b5ca";
      ctx.globalAlpha = 0.24;
      ctx.fillRect(x - 30, surf, 140, VIEW_H - surf);
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i <= 12; i++) {
        const px = x - 28 + i * 11;
        const py = surf + Math.sin((px + this.groundOffset * 2) * 0.05) * 2;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawOlympicOver(fg: string) {
    const ctx = this.ctx;
    const cx = this.center();
    const medal = raster(MEDAL, "#f2b01e", 3, "#d64933");
    ctx.save();
    ctx.globalAlpha = 0.95;
    ctx.drawImage(medal, Math.round(cx - medal.width / 2), 56);
    ctx.textAlign = "center";
    ctx.fillStyle = fg;
    ctx.font = this.pixelFont(13);
    ctx.fillText("GOLD MEDAL", cx, 116);
    ctx.font = this.pixelFont(17);
    ctx.fillText("G A M E   O V E R", cx, 146);
    if (Math.floor(this.tick / 80) % 2 === 0) {
      ctx.globalAlpha = 0.9;
      ctx.font = '14px "Hiragino Kaku Gothic ProN", "Yu Gothic", "Noto Sans JP", sans-serif';
      ctx.fillText("またプレイしてね", cx, 176);
    } else {
      ctx.globalAlpha = 0.55;
      ctx.font = this.pixelFont(8);
      ctx.fillText("PRESS SPACE OR TAP TO PLAY AGAIN", cx, 176);
    }
    const iy = 208;
    ctx.globalAlpha = 1;
    ctx.lineWidth = 3;
    ctx.strokeStyle = fg;
    ctx.strokeRect(cx - 20, iy - 16, 40, 34);
    ctx.beginPath();
    ctx.arc(cx, iy + 1, 10, Math.PI * 0.35, Math.PI * 1.85);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 4, iy - 11);
    ctx.lineTo(cx + 12, iy - 8);
    ctx.lineTo(cx + 5, iy - 2);
    ctx.closePath();
    ctx.fillStyle = fg;
    ctx.fill();
    ctx.restore();
  }

  private drawDino(fgq: string) {
    if (this.mode.olympic && this.sport) {
      this.drawSportDino(fgq);
      return;
    }
    const ctx = this.ctx;
    const map = this.dinoMap();
    const color = this.skin.color ?? fgq;
    const w = map.w * SCALE;
    const h = map.h * SCALE;
    const x = DINO_X;
    const y = Math.round(this.dinoY - h);
    const duck = map === DINO_DUCK_A || map === DINO_DUCK_B;

    ctx.save();
    if (this.ghost > 0 && Math.floor(this.tick / 3) % 2 === 0) ctx.globalAlpha = 0.35;
    if (this.squash > 0) {
      const k = 0.16 * this.squash;
      ctx.translate(x + w / 2, this.dinoY);
      ctx.scale(1 + k, 1 - k);
      ctx.translate(-(x + w / 2), -this.dinoY);
    }
    ctx.drawImage(raster(map, color, SCALE), x, y);

    const hat = this.skin.hat ? HATS[this.skin.hat] : null;
    if (hat) {
      const headCol = duck ? 24.5 : 16.5;
      const hx = Math.round(x + headCol * SCALE - (hat.w * SCALE) / 2);
      const hy = y - hat.h * SCALE + SCALE;
      ctx.drawImage(
        raster(hat, this.skin.hatColor ?? color, SCALE, this.skin.accent),
        hx,
        hy,
      );
    }
    ctx.restore();
  }


  /* --------------------------------------------------------- arcade render */

  private boxFill() {
    const cycle = ["#ff4fb8", "#ffc53d", "#19d3ff", "#21c07a"];
    return cycle[Math.floor(this.tick / 10) % cycle.length];
  }

  private drawMysteryBoxes() {
    const ctx = this.ctx;
    const fill = this.boxFill();
    for (const b of this.mysteryBoxes) {
      const bob = this.reducedMotion ? 0 : Math.round(Math.sin(b.anim) * 3);
      ctx.save();
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.arc(b.x + BOX_PX / 2, b.y + BOX_PX / 2 + bob, BOX_PX * 0.85, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.drawImage(raster(MYSTERY_BOX, "#1b1f24", SCALE, fill), Math.round(b.x), Math.round(b.y + bob));
    }
  }

  private drawLasers() {
    const ctx = this.ctx;
    ctx.save();
    ctx.lineCap = "round";
    for (const l of this.lasers) {
      const tx = l.x + 18;
      const ty = l.y + (l.vy * 18) / l.vx;
      ctx.strokeStyle = POWERS.blaster.color;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(l.x, l.y);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(l.x + 2, l.y);
      ctx.lineTo(tx, ty);
      ctx.stroke();
    }
    ctx.restore();
  }

  /** Effects that sit behind the rex: afterimages and the jetpack. */
  private drawArcadeBehind(fgq: string) {
    const ctx = this.ctx;
    const map = this.dinoMap();
    const h = map.h * SCALE;
    const feet = Math.round(this.dinoY + this.diveY);
    const fast = this.has("turbo") ? POWERS.turbo.color : this.has("rush") ? POWERS.rush.color : null;
    if (fast && this.phase === "running") {
      const img = raster(map, fast, SCALE);
      [0.32, 0.16].forEach((a, i) => {
        ctx.save();
        ctx.globalAlpha = a;
        ctx.drawImage(img, DINO_X - 16 * (i + 1), feet - h);
        ctx.restore();
      });
    }
    if (this.has("jetpack") && !this.ducking) {
      ctx.drawImage(raster(JETPACK, "#5b6470", SCALE, "#ff8a3d"), DINO_X + 9, feet - 52);
    }
    void fgq;
  }

  /** Effects over the rex: shield bubble, visor and status icons overhead. */
  private drawArcadeFront() {
    const ctx = this.ctx;
    const feet = this.dinoY + this.diveY;
    const duck = this.ducking;
    const shield = this.effects.get("shield");
    if (shield) {
      const fading = shield.left < 120 && Math.floor(this.tick / 6) % 2 === 0;
      ctx.save();
      ctx.globalAlpha = fading ? 0.3 : 0.8;
      ctx.strokeStyle = POWERS.shield.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(DINO_X + (duck ? 44 : 33), feet - (duck ? 24 : 36), duck ? 50 : 48, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha *= 0.15;
      ctx.fillStyle = POWERS.shield.color;
      ctx.fill();
      ctx.restore();
    }
    if (this.has("blaster")) {
      ctx.fillStyle = POWERS.blaster.color;
      if (duck) ctx.fillRect(DINO_X + 66, feet - 41, 21, 4);
      else ctx.fillRect(DINO_X + 36, feet - 66, 27, 4);
    }
    const overhead = (["magnet", "moon", "heavy", "reverse"] as PowerId[]).filter((id) => this.has(id));
    if (overhead.length) {
      const bob = this.reducedMotion ? 0 : Math.round(Math.sin(this.tick / 9) * 2);
      const top = feet - (duck ? 45 : 72) - 26 + bob;
      const startX = DINO_X + (duck ? 72 : 50) - (overhead.length * 22) / 2;
      overhead.forEach((id, i) => {
        const def = POWERS[id];
        const blink = !def.good && Math.floor(this.tick / 12) % 2 === 0;
        ctx.save();
        ctx.globalAlpha = blink ? 0.55 : 1;
        ctx.drawImage(raster(POWER_ICONS[id], def.color, 2, "#ffffff"), Math.round(startX + i * 22), Math.round(top));
        ctx.restore();
      });
    }
  }

  private drawFog() {
    const e = this.effects.get("fog");
    if (!e || this.phase === "over") return;
    const ctx = this.ctx;
    const fade = Math.min(1, (e.total - e.left) / 20, e.left / 30);
    const cx = DINO_X + 140;
    const cy = this.dinoY - 40;
    const g = ctx.createRadialGradient(cx, cy, 60, cx, cy, 250);
    g.addColorStop(0, "rgba(6,8,12,0)");
    g.addColorStop(0.5, "rgba(6,8,12,0.72)");
    g.addColorStop(1, "rgba(6,8,12,0.97)");
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.vw, VIEW_H);
    ctx.restore();
  }

  private drawEffectChips(fg: string) {
    const list = [...this.effects.entries()];
    if (!list.length || this.phase === "over") return;
    const ctx = this.ctx;
    const size = 26;
    const gap = 8;
    const total = list.length * size + (list.length - 1) * gap;
    let x = Math.round(this.vw / 2 - total / 2);
    const y = 54;
    for (const [id, e] of list) {
      const def = POWERS[id];
      const ending = e.left < 90 && Math.floor(this.tick / 6) % 2 === 0;
      ctx.globalAlpha = ending ? 0.45 : 1;
      ctx.fillStyle = def.color;
      ctx.fillRect(x, y, size, size);
      if (!def.good) {
        ctx.strokeStyle = "#1b1f24";
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 2]);
        ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);
        ctx.setLineDash([]);
      }
      ctx.drawImage(raster(POWER_ICONS[id], "#15181c", 2, "#ffffff"), x + 4, y + 4);
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = fg;
      ctx.fillRect(x, y + size + 3, size, 3);
      ctx.globalAlpha = 1;
      ctx.fillStyle = def.color;
      ctx.fillRect(x, y + size + 3, Math.max(1, Math.round((size * e.left) / e.total)), 3);
      x += size + gap;
    }
    ctx.globalAlpha = 1;
  }

  private drawPowerBanner(fg: string) {
    const b = this.powerBanner;
    if (!b || this.phase !== "running") return;
    const ctx = this.ctx;
    const def = POWERS[b.id];
    const cx = this.center();
    const a = Math.min(1, b.t / 25);
    const rise = this.reducedMotion ? 1 : Math.min(1, (130 - b.t) / 10);
    const hint =
      b.id === "blaster"
        ? this.touch
          ? "TAP FIRE TO SHOOT"
          : "PRESS F OR X TO SHOOT"
        : b.id === "jetpack"
          ? this.touch
            ? "HOLD JUMP TO FLY"
            : "HOLD SPACE TO FLY"
          : def.desc;
    ctx.save();
    ctx.textAlign = "center";
    ctx.globalAlpha = a;
    ctx.fillStyle = b.blocked ? POWERS.shield.color : def.good ? def.color : "#d64933";
    ctx.font = this.pixelFont(16);
    ctx.fillText(b.blocked ? "SHIELD BLOCKED IT" : def.name.toUpperCase(), cx, 108 + (1 - rise) * 8);
    ctx.globalAlpha = a * 0.75;
    ctx.fillStyle = fg;
    ctx.font = this.pixelFont(8);
    const label = b.blocked ? `${def.name} curse avoided` : `${def.good ? "Power-up" : "Curse"}: ${hint}`;
    ctx.fillText(label.toUpperCase(), cx, 132);
    ctx.restore();
  }

  private dinoMap(): PixelMap {
    if (this.phase === "over") return DINO_DEAD;
    if (this.ducking) return this.runFrame ? DINO_DUCK_A : DINO_DUCK_B;
    if (this.airborne) return DINO_IDLE;
    if (this.phase === "ready" || this.phase === "paused") return this.blink > 0 ? DINO_BLINK : DINO_IDLE;
    return this.runFrame ? DINO_RUN_A : DINO_RUN_B;
  }

  /** Re-tint the white ground strip with source-in compositing, cached per colour. */
  private drawTinted(strip: HTMLCanvasElement, x: number, y: number, color: string) {
    let t = this.tintCache.get(color);
    if (!t) {
      t = document.createElement("canvas");
      t.width = strip.width;
      t.height = strip.height;
      const c = t.getContext("2d")!;
      c.drawImage(strip, 0, 0);
      c.globalCompositeOperation = "source-in";
      c.fillStyle = color;
      c.fillRect(0, 0, t.width, t.height);
      this.tintCache.set(color, t);
      if (this.tintCache.size > 40) this.tintCache.delete(this.tintCache.keys().next().value as string);
    }
    this.ctx.drawImage(t, Math.round(x), y, t.width / this.dpr, t.height / this.dpr);
  }

  private drawMoon(fgq: string) {
    const ctx = this.ctx;
    const img = raster(MOON, fgq, SCALE);
    const x = Math.round(this.vw * 0.64);
    const y = 38;
    const phase = this.mode.night === "always" ? 0.5 : (this.score % 700) / 700;
    const lit = 1 - Math.abs(phase * 2 - 1);
    ctx.save();
    ctx.globalAlpha *= 0.28;
    ctx.drawImage(img, x, y);
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, img.width * Math.max(0.06, lit), img.height);
    ctx.clip();
    ctx.drawImage(img, x, y);
    ctx.restore();
  }

  private pixelFont(size: number) {
    return `${size}px ${this.fontsReady ? '"Press Start 2P"' : "monospace"}`;
  }

  private drawPopups() {
    const ctx = this.ctx;
    ctx.save();
    ctx.font = this.pixelFont(10);
    ctx.textAlign = "center";
    for (const p of this.popups) {
      ctx.globalAlpha = Math.min(1, p.life / 14);
      ctx.fillStyle = p.color ?? "#ffc53d";
      ctx.fillText(p.text, Math.round(p.x + COIN_PX / 2), Math.round(p.y));
    }
    ctx.restore();
  }

  private drawHud(fg: string) {
    const ctx = this.ctx;
    const vw = this.vw;
    ctx.save();
    ctx.textBaseline = "top";

    // right: HI and score
    ctx.font = this.pixelFont(15);
    ctx.textAlign = "right";
    const pad = (v: number) => String(Math.floor(v)).padStart(5, "0");
    const blinking = this.flash > 0 && Math.floor(this.flash / 8) % 2 === 0;
    ctx.fillStyle = fg;
    if (this.mode.records) {
      ctx.globalAlpha = 0.55;
      ctx.fillText(`HI ${pad(this.hi)}`, vw - 130, 26);
    }
    ctx.globalAlpha = blinking ? 0.15 : 1;
    ctx.fillText(pad(this.score), vw - 30, 26);

    // left: mode, sport, torch count and coins
    ctx.textAlign = "left";
    ctx.globalAlpha = 0.5;
    ctx.font = this.pixelFont(8);
    ctx.fillText(this.mode.name.toUpperCase(), 24, 24);
    let row = 40;
    if (this.mode.olympic) {
      ctx.globalAlpha = 0.7;
      ctx.font = this.pixelFont(7);
      ctx.fillText(this.sport ? OLYMPIC_EVENTS[this.sport].name.toUpperCase() : "TORCH HUNT", 24, 36);
      row = 58;
      ctx.globalAlpha = 1;
      const torchIcon = raster(TORCH, "#c9954a", 1.5, "#ffb23d");
      ctx.drawImage(torchIcon, 24, row - 8);
      ctx.font = this.pixelFont(11);
      ctx.fillStyle = fg;
      ctx.fillText(`x${this.runTorches}`, 24 + torchIcon.width + 5, row - 1);
      row += 26;
    }
    ctx.globalAlpha = 1;
    ctx.drawImage(raster(COIN, "#8a5a00", 2, "#ffc53d"), 24, row);
    ctx.font = this.pixelFont(12);
    ctx.fillStyle = fg;
    const mult = this.mode.coinMult > 1 ? `  x${this.mode.coinMult}` : "";
    ctx.fillText(`${this.runCoins}${mult}`, 48, row + 3);

    if (this.mode.timeLimit && this.phase !== "ready") {
      const s = Math.max(0, Math.ceil(this.ticksLeft / 60));
      const low = s <= 10 && this.phase === "running";
      ctx.globalAlpha = low && Math.floor(this.tick / 10) % 2 === 0 ? 0.35 : 1;
      ctx.fillStyle = low ? "#d64933" : fg;
      ctx.font = this.pixelFont(12);
      ctx.fillText(`0:${String(s).padStart(2, "0")}`, 24, 66);
    }
    if (this.mode.olympic) {
      this.drawRings();
      this.drawSportBanner(fg);
    }
    if (this.mode.arcade) {
      this.drawEffectChips(fg);
      this.drawPowerBanner(fg);
    }
    ctx.restore();
  }

  private center() {
    return this.vw / 2 + 40;
  }

  private drawReady(fg: string) {
    const ctx = this.ctx;
    const cx = this.center();
    ctx.save();
    if (this.mode.arcade) {
      const bob = this.reducedMotion ? 0 : Math.round(Math.sin(this.tick / 12) * 3);
      ctx.drawImage(raster(MYSTERY_BOX, "#1b1f24", SCALE, this.boxFill()), Math.round(cx - BOX_PX / 2), 66 + bob);
    }
    ctx.fillStyle = fg;
    ctx.textAlign = "center";
    if (this.mode.olympic) {
      ctx.font = this.pixelFont(19);
      ctx.fillText("ON YOUR MARKS.", cx, 98);
      ctx.font = this.pixelFont(10);
      ctx.fillText(this.touch ? "TAP TO START YOUR RUN" : "PRESS SPACE TO START YOUR RUN", cx, 122);
      ctx.globalAlpha = 0.6;
      ctx.font = this.pixelFont(7);
      ctx.fillText("RUN INTO A TORCH TO ENTER AN EVENT", cx, 139);
      ctx.restore();
      return;
    }
    ctx.globalAlpha = 0.92;
    ctx.font = this.pixelFont(17);
    ctx.fillText(this.touch ? "TAP  TO  RUN" : "PRESS  SPACE  TO  RUN", cx, 128);
    ctx.globalAlpha = 0.5;
    ctx.font = this.pixelFont(9);
    ctx.fillText(
      this.touch ? "JUMP AND DUCK PADS BELOW" : "UP / SPACE  JUMP     DOWN  DUCK     P  PAUSE",
      cx,
      152,
    );
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = this.mode.accent;
    ctx.font = this.pixelFont(9);
    ctx.fillText(
      this.mode.olympic
        ? "COLLECT THE TORCH TO PICK A SPORT"
        : this.mode.arcade
          ? "RUN INTO ? BOXES. SOME ARE CURSED"
          : `MODE: ${this.mode.name.toUpperCase()}`,
      cx,
      178,
    );
    ctx.restore();
  }

  private drawOver(fg: string) {
    if (this.mode.olympic && this.sport) {
      this.drawOlympicOver(fg);
      return;
    }
    const ctx = this.ctx;
    const cx = this.center();
    ctx.save();
    ctx.textAlign = "center";
    ctx.fillStyle = fg;
    ctx.font = this.pixelFont(21);
    ctx.fillText(this.timeUp ? "T I M E   U P" : "G A M E   O V E R", cx, 104);

    if (this.newBest) {
      ctx.font = this.pixelFont(9);
      ctx.globalAlpha = 0.5 + 0.5 * Math.abs(Math.sin(this.tick / 9));
      ctx.fillText("N E W   R E C O R D", cx, 126);
      ctx.globalAlpha = 1;
    }

    const cy = 158;
    ctx.strokeStyle = fg;
    ctx.lineWidth = 3;
    ctx.strokeRect(cx - 22, cy - 20, 44, 40);
    ctx.beginPath();
    ctx.arc(cx, cy, 12, Math.PI * 0.35, Math.PI * 1.85);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 5, cy - 14);
    ctx.lineTo(cx + 14, cy - 10);
    ctx.lineTo(cx + 6, cy - 3);
    ctx.closePath();
    ctx.fillStyle = fg;
    ctx.fill();
    ctx.restore();
  }

  private drawPaused(fg: string) {
    const ctx = this.ctx;
    const cx = this.center();
    ctx.save();
    ctx.fillStyle = fg;
    ctx.globalAlpha = 0.06;
    ctx.fillRect(0, 0, this.vw, VIEW_H);
    ctx.globalAlpha = 1;
    ctx.textAlign = "center";
    ctx.font = this.pixelFont(18);
    ctx.fillText("P A U S E D", cx, 132);
    ctx.globalAlpha = 0.5;
    ctx.font = this.pixelFont(9);
    ctx.fillText(this.touch ? "TAP  TO  RESUME" : "PRESS  P  TO  RESUME", cx, 156);
    ctx.restore();
  }
}
