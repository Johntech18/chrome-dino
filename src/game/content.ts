import type { HatId } from "./sprites";

/* ------------------------------------------------------------------ MODES */

/* -------------------------------------------------------------- OLYMPICS */

export type SportId =
  | "hurdles"
  | "swimming"
  | "gymnastics"
  | "equestrian"
  | "surfing"
  | "skateboarding";

export interface OlympicEvent {
  id: SportId;
  name: string;
  blurb: string;
  bg: string;
  fg: string;
  accent: string;
  /** True for the event where the action is a dive instead of a jump. */
  dive?: boolean;
}

export const OLYMPIC_EVENTS: Record<SportId, OlympicEvent> = {
  hurdles: {
    id: "hurdles",
    name: "Hurdles",
    blurb: "Stadium track, white rails.",
    bg: "#e2643f",
    fg: "#2a1512",
    accent: "#fdf3e7",
  },
  swimming: {
    id: "swimming",
    name: "Swimming",
    blurb: "Dive under the lane buoys.",
    bg: "#bfe6f5",
    fg: "#0a3d52",
    accent: "#ff8a3d",
    dive: true,
  },
  gymnastics: {
    id: "gymnastics",
    name: "Gymnastics",
    blurb: "Somersault the pommel horse.",
    bg: "#f3e3c3",
    fg: "#3f3020",
    accent: "#d64933",
  },
  equestrian: {
    id: "equestrian",
    name: "Equestrian",
    blurb: "Ride the fences.",
    bg: "#dfe9cf",
    fg: "#2f4227",
    accent: "#a86a2c",
  },
  surfing: {
    id: "surfing",
    name: "Surfing",
    blurb: "Hop the shark fins.",
    bg: "#8fd8e8",
    fg: "#0a3d52",
    accent: "#ffd95e",
  },
  skateboarding: {
    id: "skateboarding",
    name: "Skateboarding",
    blurb: "Ollie the cones.",
    bg: "#dfe3e8",
    fg: "#2a2f36",
    accent: "#f2a616",
  },
};

export const OLYMPIC_LIST = Object.values(OLYMPIC_EVENTS);

/* ----------------------------------------------------------------- ARCADE */

export type PowerId =
  | "magnet"
  | "jetpack"
  | "blaster"
  | "turbo"
  | "shield"
  | "moon"
  | "heavy"
  | "reverse"
  | "fog"
  | "rush"
  | "pickpocket";

export interface PowerDef {
  id: PowerId;
  name: string;
  desc: string;
  /** Blessings help, curses hurt. */
  good: boolean;
  /** Frames at 60 fps. 0 means the effect is instant. */
  duration: number;
  color: string;
  /** Relative chance of rolling this outcome from a box. */
  weight: number;
}

export const POWER_LIST: PowerDef[] = [
  { id: "magnet", name: "Coin Magnet", desc: "Pulls nearby coins to you", good: true, duration: 540, color: "#ffc53d", weight: 12 },
  { id: "jetpack", name: "Jetpack", desc: "Hold jump to fly", good: true, duration: 360, color: "#ff8a3d", weight: 10 },
  { id: "blaster", name: "Laser Blaster", desc: "Press F or FIRE to shoot", good: true, duration: 480, color: "#ff3d6e", weight: 12 },
  { id: "turbo", name: "Turbo", desc: "Faster and unstoppable", good: true, duration: 240, color: "#19d3ff", weight: 8 },
  { id: "shield", name: "Shield", desc: "Blocks one hit or curse", good: true, duration: 1200, color: "#21c07a", weight: 10 },
  { id: "moon", name: "Moon Boots", desc: "Low gravity, high jumps", good: true, duration: 480, color: "#8a63ff", weight: 9 },
  { id: "heavy", name: "Heavy Gravity", desc: "Short, heavy jumps", good: false, duration: 360, color: "#8a8f98", weight: 8 },
  { id: "reverse", name: "Reversed", desc: "Jump and duck are swapped", good: false, duration: 300, color: "#d64933", weight: 8 },
  { id: "fog", name: "Blackout", desc: "You can barely see ahead", good: false, duration: 360, color: "#4b5563", weight: 8 },
  { id: "rush", name: "Rush", desc: "Speed up with no protection", good: false, duration: 300, color: "#f2542d", weight: 7 },
  { id: "pickpocket", name: "Pickpocket", desc: "Lose up to 10 run coins", good: false, duration: 0, color: "#b8860b", weight: 6 },
];

export const POWERS = Object.fromEntries(POWER_LIST.map((p) => [p.id, p])) as Record<PowerId, PowerDef>;

export type ModeId = "classic" | "arcade" | "sprint" | "turbo" | "lunar" | "olympics" | "zen";

export interface ModeDef {
  id: ModeId;
  name: string;
  tagline: string;
  rules: string[];
  accent: string;
  speedStart: number;
  speedMax: number;
  accel: number;
  gravity: number;
  jumpV: number;
  jumpK: number;
  pteroFrom: number;
  coinMult: number;
  coinChance: number;
  /** Max coins one run can pay out from pickups. */
  coinCap?: number;
  timeLimit?: number;
  invincible?: boolean;
  records: boolean;
  night: "cycle" | "always";
  /** Olympics mode: torches swap the world into a sport. */
  olympic?: boolean;
  /** Arcade mode: mystery boxes grant power-ups and curses. */
  arcade?: boolean;
}

export const MODE_LIST: ModeDef[] = [
  {
    id: "classic",
    name: "Classic",
    tagline: "The original endless run.",
    rules: ["Speed ramps forever", "Pterodactyls from 340 pts", "Night every 700 pts"],
    accent: "#2d5bff",
    speedStart: 6.2,
    speedMax: 14.6,
    accel: 0.0016,
    gravity: 0.62,
    jumpV: -11.9,
    jumpK: 0.07,
    pteroFrom: 340,
    coinMult: 1,
    coinChance: 0.22,
    records: true,
    night: "cycle",
  },
  {
    id: "arcade",
    name: "Arcade",
    tagline: "Mystery boxes. Blessings and curses.",
    rules: [
      "Run or jump into ? boxes for a random power-up",
      "Magnet, jetpack, lasers, turbo, shield, moon boots",
      "About 1 in 3 boxes is cursed",
      "Lasers lock on to pterodactyls and cacti",
    ],
    accent: "#ff4fb8",
    speedStart: 6.4,
    speedMax: 15,
    accel: 0.0018,
    gravity: 0.62,
    jumpV: -11.9,
    jumpK: 0.07,
    pteroFrom: 200,
    coinMult: 1,
    coinChance: 0.26,
    records: true,
    night: "cycle",
    arcade: true,
  },
  {
    id: "sprint",
    name: "Sprint",
    tagline: "60 seconds. Bank everything.",
    rules: ["Hard 60 second clock", "Starts fast, pteros from 220", "Coins pay x2"],
    accent: "#21c07a",
    speedStart: 8.2,
    speedMax: 13.8,
    accel: 0.0024,
    gravity: 0.62,
    jumpV: -11.9,
    jumpK: 0.07,
    pteroFrom: 220,
    coinMult: 2,
    coinChance: 0.15,
    timeLimit: 60,
    records: true,
    night: "cycle",
  },
  {
    id: "turbo",
    name: "Turbo",
    tagline: "Hardcore. Blink and it is over.",
    rules: ["Starts at 9.5, caps at 16.5", "Pterodactyls from 160 pts", "Coins pay x2"],
    accent: "#d64933",
    speedStart: 9.5,
    speedMax: 16.5,
    accel: 0.0028,
    gravity: 0.62,
    jumpV: -11.9,
    jumpK: 0.07,
    pteroFrom: 160,
    coinMult: 2,
    coinChance: 0.14,
    records: true,
    night: "cycle",
  },
  {
    id: "olympics",
    name: "Olympics",
    tagline: "Grab the torch. Change the sport.",
    rules: [
      "Colored torches appear mid-run",
      "Run into one to switch to a random sport",
      "Six events, every finish earns a medal",
      "In the pool, tap to dive under the buoys",
    ],
    accent: "#e6be72",
    speedStart: 6.6,
    speedMax: 14.4,
    accel: 0.0017,
    gravity: 0.62,
    jumpV: -11.9,
    jumpK: 0.07,
    pteroFrom: 1e9,
    coinMult: 2,
    coinChance: 0.24,
    records: true,
    night: "cycle",
    olympic: true,
  },
  {
    id: "lunar",
    name: "Lunar",
    tagline: "Low gravity. Always night.",
    rules: ["Floaty 50 frame jumps", "Permanent night sky", "Slam down with the duck key"],
    accent: "#8a63ff",
    speedStart: 6.2,
    speedMax: 13,
    accel: 0.0016,
    gravity: 0.34,
    jumpV: -8.4,
    jumpK: 0.05,
    pteroFrom: 300,
    coinMult: 1,
    coinChance: 0.2,
    records: true,
    night: "always",
  },
  {
    id: "zen",
    name: "Zen",
    tagline: "No crashes. Just vibes.",
    rules: ["Obstacles cannot hurt you", "Calm speed cap of 8.4", "No records, quests or bonus. Pickups pay up to 20"],
    accent: "#ffc53d",
    speedStart: 5.4,
    speedMax: 8.4,
    accel: 0.0005,
    gravity: 0.62,
    jumpV: -11.9,
    jumpK: 0.07,
    pteroFrom: 1e9,
    coinMult: 1,
    coinChance: 0.3,
    coinCap: 20,
    invincible: true,
    records: false,
    night: "cycle",
  },
];

export const MODES = Object.fromEntries(MODE_LIST.map((m) => [m.id, m])) as Record<ModeId, ModeDef>;

/* ----------------------------------------------------------------- THEMES */

export interface ThemeDef {
  id: string;
  name: string;
  price: number;
  day: { bg: string; fg: string };
  night: { bg: string; fg: string };
}

export const THEMES: ThemeDef[] = [
  {
    id: "classic",
    name: "Classic",
    price: 0,
    day: { bg: "#ededea", fg: "#1b1f24" },
    night: { bg: "#12161b", fg: "#e8e8e4" },
  },
  {
    id: "handheld",
    name: "Handheld",
    price: 150,
    day: { bg: "#b8d36a", fg: "#1d3a14" },
    night: { bg: "#1d3a14", fg: "#b8d36a" },
  },
  {
    id: "sunset",
    name: "Sunset",
    price: 200,
    day: { bg: "#ffd9b8", fg: "#5a1f2e" },
    night: { bg: "#2a1033", fg: "#ff9e7a" },
  },
  {
    id: "glacier",
    name: "Glacier",
    price: 250,
    day: { bg: "#dff3ff", fg: "#0e2a47" },
    night: { bg: "#07162b", fg: "#7fd1ff" },
  },
  {
    id: "candy",
    name: "Candy",
    price: 300,
    day: { bg: "#ffe3f1", fg: "#7a1d57" },
    night: { bg: "#2b0a20", fg: "#ff8fd0" },
  },
  {
    id: "terminal",
    name: "Terminal",
    price: 400,
    day: { bg: "#06120b", fg: "#3dff8a" },
    night: { bg: "#000000", fg: "#3dff8a" },
  },
];

export const THEME_MAP = Object.fromEntries(THEMES.map((t) => [t.id, t])) as Record<string, ThemeDef>;

/* ------------------------------------------------------------------ SKINS */

export type TrailId = "dust" | "sparkle" | "neon" | "ember";

export interface SkinDef {
  id: string;
  name: string;
  blurb: string;
  price: number;
  /** null means "use the theme ink". */
  color: string | null;
  accent: string;
  hat: HatId | null;
  hatColor?: string;
  trail: TrailId;
}

export const SKINS: SkinDef[] = [
  {
    id: "classic",
    name: "Original",
    blurb: "Plain old reliable.",
    price: 0,
    color: null,
    accent: "#ffc53d",
    hat: null,
    trail: "dust",
  },
  {
    id: "tophat",
    name: "Gentleman",
    blurb: "Top hat, no manners.",
    price: 200,
    color: null,
    accent: "#d64933",
    hat: "tophat",
    trail: "dust",
  },
  {
    id: "party",
    name: "Party Rex",
    blurb: "Every run is a birthday.",
    price: 250,
    color: "#ff5fa8",
    accent: "#ffc53d",
    hat: "party",
    hatColor: "#2d5bff",
    trail: "sparkle",
  },
  {
    id: "crimson",
    name: "Crimson",
    blurb: "Leaves embers behind.",
    price: 300,
    color: "#e04a3a",
    accent: "#ffb23d",
    hat: null,
    trail: "ember",
  },
  {
    id: "cyber",
    name: "Cyber",
    blurb: "Neon streak trail.",
    price: 400,
    color: "#19d3ff",
    accent: "#8a63ff",
    hat: null,
    trail: "neon",
  },
  {
    id: "wizard",
    name: "Wizard",
    blurb: "Sparkles and a pointy hat.",
    price: 500,
    color: "#8a63ff",
    accent: "#ffc53d",
    hat: "wizard",
    hatColor: "#4b2fbf",
    trail: "sparkle",
  },
  {
    id: "champion",
    name: "Champion",
    blurb: "Laurels not included.",
    price: 900,
    color: "#f2b01e",
    accent: "#2f7d4f",
    hat: "crown",
    hatColor: "#ffd95e",
    trail: "sparkle",
  },
  {
    id: "royal",
    name: "Royal",
    blurb: "Gold plated, crown included.",
    price: 700,
    color: "#f2b01e",
    accent: "#d64933",
    hat: "crown",
    hatColor: "#ffd95e",
    trail: "sparkle",
  },
];

export const SKIN_MAP = Object.fromEntries(SKINS.map((s) => [s.id, s])) as Record<string, SkinDef>;

/* ------------------------------------------------------------ RUN SUMMARY */

export interface RunSummary {
  mode: ModeId;
  score: number;
  distanceM: number;
  pickups: number;
  jumps: number;
  dodged: number;
  pteros: number;
  nights: number;
  torches: number;
  sports: number;
  medal: boolean;
  /** Arcade: boxes opened and pterodactyls shot down. */
  boxes: number;
  zaps: number;
  noDuck: boolean;
  reason: "dead" | "time" | "abandon";
  newBest: boolean;
  seconds: number;
}

/* ----------------------------------------------------------------- QUESTS */

export type QuestMetric =
  | "torches"
  | "boxes"
  | "coins"
  | "jumps"
  | "meters"
  | "runs"
  | "score"
  | "pteros"
  | "nights"
  | "modeRuns";

export interface QuestDef {
  id: string;
  metric: QuestMetric;
  mode?: ModeId;
  label: (n: number) => string;
  targets: [number, number, number];
  rewards: [number, number, number];
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

export const QUEST_POOL: QuestDef[] = [
  {
    id: "coins",
    metric: "coins",
    label: (n) => `Collect ${n} coins`,
    targets: [30, 60, 100],
    rewards: [25, 45, 80],
  },
  {
    id: "jumps",
    metric: "jumps",
    label: (n) => `Jump ${n} times`,
    targets: [40, 90, 160],
    rewards: [20, 40, 70],
  },
  {
    id: "meters",
    metric: "meters",
    label: (n) => `Run ${n} metres`,
    targets: [600, 1400, 2600],
    rewards: [25, 50, 90],
  },
  {
    id: "runs",
    metric: "runs",
    label: (n) => `Finish ${n} runs`,
    targets: [3, 5, 8],
    rewards: [20, 35, 60],
  },
  {
    id: "score",
    metric: "score",
    label: (n) => `Score ${n} in a single run`,
    targets: [250, 500, 900],
    rewards: [30, 60, 110],
  },
  {
    id: "pteros",
    metric: "pteros",
    label: (n) => `Dodge ${n} pterodactyls`,
    targets: [3, 6, 10],
    rewards: [30, 55, 95],
  },
  {
    id: "nights",
    metric: "nights",
    label: (n) => `Reach nightfall ${n} ${plural(n, "time", "times")}`,
    targets: [1, 2, 3],
    rewards: [35, 60, 100],
  },
  {
    id: "torches",
    metric: "torches",
    label: (n) => `Collect ${n} Olympic ${plural(n, "torch", "torches")}`,
    targets: [1, 2, 3],
    rewards: [30, 50, 80],
  },
  {
    id: "boxes",
    metric: "boxes",
    label: (n) => `Open ${n} Arcade mystery ${plural(n, "box", "boxes")}`,
    targets: [3, 6, 10],
    rewards: [25, 45, 80],
  },
  {
    id: "sprint",
    metric: "modeRuns",
    mode: "sprint",
    label: (n) => `Play ${n} Sprint ${plural(n, "run", "runs")}`,
    targets: [1, 2, 3],
    rewards: [30, 50, 80],
  },
  {
    id: "turbo",
    metric: "modeRuns",
    mode: "turbo",
    label: (n) => `Play ${n} Turbo ${plural(n, "run", "runs")}`,
    targets: [1, 2, 3],
    rewards: [35, 60, 100],
  },
  {
    id: "lunar",
    metric: "modeRuns",
    mode: "lunar",
    label: (n) => `Play ${n} Lunar ${plural(n, "run", "runs")}`,
    targets: [1, 2, 3],
    rewards: [30, 50, 80],
  },
];

export const QUEST_MAP = Object.fromEntries(QUEST_POOL.map((q) => [q.id, q])) as Record<string, QuestDef>;

export const DAILY_BONUS = 75;

/* ------------------------------------------------------------- CHALLENGES */

export type ChallengeMetric = "score" | "coins" | "pteros" | "torches" | "boxes" | "zaps";

export interface ChallengeDef {
  id: string;
  title: string;
  desc: string;
  mode: ModeId | "any";
  metric: ChallengeMetric;
  target: number;
  reward: number;
  noDuck?: boolean;
  tier: 1 | 2 | 3;
}

export const CHALLENGES: ChallengeDef[] = [
  {
    id: "first-steps",
    title: "First Steps",
    desc: "Score 200 in any mode.",
    mode: "any",
    metric: "score",
    target: 200,
    reward: 25,
    tier: 1,
  },
  {
    id: "pocket-change",
    title: "Pocket Change",
    desc: "Collect 15 coins in a single run.",
    mode: "any",
    metric: "coins",
    target: 15,
    reward: 30,
    tier: 1,
  },
  {
    id: "wing-spotter",
    title: "Wing Spotter",
    desc: "Dodge 6 pterodactyls in one run.",
    mode: "any",
    metric: "pteros",
    target: 6,
    reward: 70,
    tier: 2,
  },
  {
    id: "sprint-star",
    title: "Sprint Star",
    desc: "Score 450 in Sprint mode.",
    mode: "sprint",
    metric: "score",
    target: 450,
    reward: 100,
    tier: 2,
  },
  {
    id: "torchbearer",
    title: "Torchbearer",
    desc: "Collect 3 Olympic torches in a single run.",
    mode: "olympics",
    metric: "torches",
    target: 3,
    reward: 150,
    tier: 2,
  },
  {
    id: "lucky-dip",
    title: "Lucky Dip",
    desc: "Open 5 mystery boxes in one Arcade run.",
    mode: "arcade",
    metric: "boxes",
    target: 5,
    reward: 80,
    tier: 2,
  },
  {
    id: "sky-sniper",
    title: "Sky Sniper",
    desc: "Shoot down 3 pterodactyls in one Arcade run.",
    mode: "arcade",
    metric: "zaps",
    target: 3,
    reward: 150,
    tier: 3,
  },
  {
    id: "olympian",
    title: "Olympian",
    desc: "Score 800 in Olympics mode.",
    mode: "olympics",
    metric: "score",
    target: 800,
    reward: 200,
    tier: 3,
  },
  {
    id: "moon-hop",
    title: "Moon Hopper",
    desc: "Score 600 in Lunar mode.",
    mode: "lunar",
    metric: "score",
    target: 600,
    reward: 100,
    tier: 2,
  },
  {
    id: "purist",
    title: "The Purist",
    desc: "Score 500 in Classic without ever ducking.",
    mode: "classic",
    metric: "score",
    target: 500,
    reward: 90,
    noDuck: true,
    tier: 2,
  },
  {
    id: "night-owl",
    title: "Night Owl",
    desc: "Survive the first night: 1400 in Classic.",
    mode: "classic",
    metric: "score",
    target: 1400,
    reward: 150,
    tier: 3,
  },
  {
    id: "turbo-tamer",
    title: "Turbo Tamer",
    desc: "Score 700 in Turbo mode.",
    mode: "turbo",
    metric: "score",
    target: 700,
    reward: 180,
    tier: 3,
  },
  {
    id: "coin-baron",
    title: "Coin Baron",
    desc: "Collect 60 coins in a single run.",
    mode: "any",
    metric: "coins",
    target: 60,
    reward: 200,
    tier: 3,
  },
  {
    id: "marathon",
    title: "Marathon",
    desc: "Score 3000 in Classic.",
    mode: "classic",
    metric: "score",
    target: 3000,
    reward: 400,
    tier: 3,
  },
];

export const CHALLENGE_MAP = Object.fromEntries(CHALLENGES.map((c) => [c.id, c])) as Record<
  string,
  ChallengeDef
>;
