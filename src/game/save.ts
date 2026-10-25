import {
  CHALLENGES,
  CHALLENGE_MAP,
  DAILY_BONUS,
  MODES,
  QUEST_MAP,
  QUEST_POOL,
  SKIN_MAP,
  THEME_MAP,
  type ModeId,
  type RunSummary,
} from "./content";

const KEY = "dino.save.v2";

export interface QuestState {
  id: string;
  tier: 0 | 1 | 2;
  progress: number;
  claimed: boolean;
}

export interface SaveData {
  v: 2;
  coins: number;
  mode: ModeId;
  modeBest: Record<ModeId, number>;
  owned: { skins: string[]; themes: string[] };
  equipped: { skin: string; theme: string };
  stats: {
    runs: number;
    best: number;
    distance: number;
    jumps: number;
    pteros: number;
    nights: number;
    coinsCollected: number;
    coinsEarned: number;
    history: number[];
  };
  quests: { day: string; list: QuestState[]; bonusClaimed: boolean };
  challenges: Record<string, { best: number; claimed: boolean }>;
}

export interface RunReport {
  run: RunSummary;
  mult: number;
  fromPickups: number;
  bonus: number;
  torchBonus: number;
  medalBonus: number;
  total: number;
  newBest: boolean;
  counted: boolean;
  questsDone: string[];
  challengesDone: string[];
}

/* ---------------------------------------------------------------- helpers */

export function todayKey(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rollDaily(day: string): QuestState[] {
  const rnd = mulberry32(hashStr(day));
  const pool = [...QUEST_POOL];
  const out: QuestState[] = [];
  for (let i = 0; i < 3; i++) {
    const idx = Math.floor(rnd() * pool.length);
    const [def] = pool.splice(idx, 1);
    // spread difficulty so a day always has an easy, a medium and a hard goal
    const order = [0, 1, 2].sort(() => rnd() - 0.5);
    out.push({ id: def.id, tier: order[i] as 0 | 1 | 2, progress: 0, claimed: false });
  }
  return out.sort((a, b) => a.tier - b.tier);
}

export function defaultSave(): SaveData {
  const day = todayKey();
  return {
    v: 2,
    coins: 0,
    mode: "classic",
    modeBest: { classic: 0, arcade: 0, sprint: 0, turbo: 0, lunar: 0, olympics: 0, zen: 0 },
    owned: { skins: ["classic"], themes: ["classic"] },
    equipped: { skin: "classic", theme: "classic" },
    stats: {
      runs: 0,
      best: 0,
      distance: 0,
      jumps: 0,
      pteros: 0,
      nights: 0,
      coinsCollected: 0,
      coinsEarned: 0,
      history: [],
    },
    quests: { day, list: rollDaily(day), bonusClaimed: false },
    challenges: {},
  };
}

export function loadSave(): SaveData {
  const base = defaultSave();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as Partial<SaveData>;
      return {
        ...base,
        ...s,
        modeBest: { ...base.modeBest, ...(s.modeBest ?? {}) },
        owned: {
          skins: Array.from(new Set([...base.owned.skins, ...(s.owned?.skins ?? [])])),
          themes: Array.from(new Set([...base.owned.themes, ...(s.owned?.themes ?? [])])),
        },
        equipped: { ...base.equipped, ...(s.equipped ?? {}) },
        stats: { ...base.stats, ...(s.stats ?? {}) },
        quests: s.quests ?? base.quests,
        challenges: s.challenges ?? {},
        v: 2,
      };
    }
    // migrate the v1 keys so earlier records are not lost
    const hi = Number(localStorage.getItem("dino.hi") || 0) || 0;
    const old = localStorage.getItem("dino.stats");
    if (hi) base.modeBest.classic = hi;
    if (old) {
      const o = JSON.parse(old) as { runs?: number; best?: number; distance?: number; history?: number[] };
      base.stats.runs = o.runs ?? 0;
      base.stats.best = o.best ?? 0;
      base.stats.distance = o.distance ?? 0;
      base.stats.history = Array.isArray(o.history) ? o.history : [];
    }
  } catch {
    /* ignore */
  }
  return base;
}

export function persist(s: SaveData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export function ensureDaily(s: SaveData): SaveData {
  const day = todayKey();
  if (s.quests.day === day) return s;
  return { ...s, quests: { day, list: rollDaily(day), bonusClaimed: false } };
}

/* -------------------------------------------------------------- run intake */

export function applyRun(prev: SaveData, run: RunSummary): { save: SaveData; report: RunReport } {
  const s = ensureDaily(structuredClone(prev));
  const mode = MODES[run.mode];
  const mult = mode.coinMult;
  const fromPickups = Math.min(run.pickups * mult, mode.coinCap ?? Infinity);
  const bonus = mode.records ? Math.floor(run.score / 100) : 0;
  const torchBonus = run.torches * 10;
  const medalBonus = run.medal ? 25 : 0;
  const total = fromPickups + bonus + torchBonus + medalBonus;

  s.coins += total;
  s.stats.coinsEarned += total;
  s.stats.coinsCollected += run.pickups;

  const report: RunReport = {
    run,
    mult,
    fromPickups,
    bonus,
    torchBonus,
    medalBonus,
    total,
    newBest: false,
    counted: mode.records,
    questsDone: [],
    challengesDone: [],
  };

  if (!mode.records) return { save: s, report };

  s.stats.runs += 1;
  s.stats.best = Math.max(s.stats.best, run.score);
  s.stats.distance += run.distanceM;
  s.stats.jumps += run.jumps;
  s.stats.pteros += run.pteros;
  s.stats.nights += run.nights;
  s.stats.history = [...s.stats.history, run.score].slice(-14);

  if (run.score > s.modeBest[run.mode]) {
    s.modeBest[run.mode] = run.score;
    report.newBest = run.score > 0;
  }

  // daily quests
  for (const q of s.quests.list) {
    const def = QUEST_MAP[q.id];
    const target = def.targets[q.tier];
    const was = q.progress >= target;
    switch (def.metric) {
      case "coins":
        q.progress += run.pickups;
        break;
      case "jumps":
        q.progress += run.jumps;
        break;
      case "meters":
        q.progress += run.distanceM;
        break;
      case "runs":
        q.progress += 1;
        break;
      case "score":
        q.progress = Math.max(q.progress, run.score);
        break;
      case "pteros":
        q.progress += run.pteros;
        break;
      case "torches":
        q.progress += run.torches;
        break;
      case "boxes":
        q.progress += run.boxes ?? 0;
        break;
      case "nights":
        q.progress += run.nights;
        break;
      case "modeRuns":
        if (def.mode === run.mode) q.progress += 1;
        break;
    }
    if (!was && q.progress >= target) report.questsDone.push(def.label(target));
  }

  // permanent challenges
  for (const c of CHALLENGES) {
    if (c.mode !== "any" && c.mode !== run.mode) continue;
    if (c.noDuck && !run.noDuck) continue;
    const values: Record<typeof c.metric, number> = {
      score: run.score,
      coins: run.pickups,
      pteros: run.pteros,
      torches: run.torches,
      boxes: run.boxes ?? 0,
      zaps: run.zaps ?? 0,
    };
    const value = values[c.metric];
    const cur = s.challenges[c.id] ?? { best: 0, claimed: false };
    const was = cur.best >= c.target;
    cur.best = Math.max(cur.best, value);
    s.challenges[c.id] = cur;
    if (!was && cur.best >= c.target) report.challengesDone.push(c.title);
  }

  return { save: s, report };
}

/* ---------------------------------------------------------------- actions */

export function questDone(q: QuestState) {
  return q.progress >= QUEST_MAP[q.id].targets[q.tier];
}

export function claimQuest(prev: SaveData, index: number): SaveData {
  const s = structuredClone(prev);
  const q = s.quests.list[index];
  if (!q || q.claimed || !questDone(q)) return prev;
  q.claimed = true;
  s.coins += QUEST_MAP[q.id].rewards[q.tier];
  return s;
}

export function claimBonus(prev: SaveData): SaveData {
  if (prev.quests.bonusClaimed || !prev.quests.list.every((q) => q.claimed)) return prev;
  const s = structuredClone(prev);
  s.quests.bonusClaimed = true;
  s.coins += DAILY_BONUS;
  return s;
}

export function claimChallenge(prev: SaveData, id: string): SaveData {
  const def = CHALLENGE_MAP[id];
  const cur = prev.challenges[id];
  if (!def || !cur || cur.claimed || cur.best < def.target) return prev;
  const s = structuredClone(prev);
  s.challenges[id].claimed = true;
  s.coins += def.reward;
  return s;
}

export type ShopKind = "skin" | "theme";

export function buy(prev: SaveData, kind: ShopKind, id: string): { save: SaveData; ok: boolean } {
  const price = kind === "skin" ? SKIN_MAP[id]?.price : THEME_MAP[id]?.price;
  const list = kind === "skin" ? prev.owned.skins : prev.owned.themes;
  if (price === undefined || list.includes(id) || prev.coins < price) return { save: prev, ok: false };
  const s = structuredClone(prev);
  s.coins -= price;
  if (kind === "skin") {
    s.owned.skins.push(id);
    s.equipped.skin = id;
  } else {
    s.owned.themes.push(id);
    s.equipped.theme = id;
  }
  return { save: s, ok: true };
}

export function equip(prev: SaveData, kind: ShopKind, id: string): SaveData {
  const list = kind === "skin" ? prev.owned.skins : prev.owned.themes;
  if (!list.includes(id)) return prev;
  const s = structuredClone(prev);
  if (kind === "skin") s.equipped.skin = id;
  else s.equipped.theme = id;
  return s;
}

export function unclaimedCounts(s: SaveData) {
  const quests =
    s.quests.list.filter((q) => questDone(q) && !q.claimed).length +
    (!s.quests.bonusClaimed && s.quests.list.every((q) => q.claimed) ? 1 : 0);
  const challenges = CHALLENGES.filter((c) => {
    const cur = s.challenges[c.id];
    return cur && cur.best >= c.target && !cur.claimed;
  }).length;
  return { quests, challenges };
}
