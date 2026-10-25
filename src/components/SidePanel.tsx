import type { ReactNode } from "react";
import { MODES, POWER_LIST } from "../game/content";
import type { Snapshot } from "../game/engine";
import type { SaveData } from "../game/save";
import {
  CACTUS_LARGE,
  CACTUS_SMALL,
  DINO_DUCK_A,
  DINO_IDLE,
  HURDLE,
  MEDAL,
  MYSTERY_BOX,
  POWER_ICONS,
  PTERO_UP,
  TORCH,
} from "../game/sprites";
import { CoinGlyph, SpriteTile } from "./SpriteTile";
import { IconBolt, IconTrophy } from "./icons";

const pad = (n: number) => String(Math.floor(n)).padStart(5, "0");

function Card({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <section
      className={`group relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.028] p-4 transition-colors duration-300 hover:border-white/22 hover:bg-white/[0.05] ${className}`}
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="h-1 w-1 rounded-full bg-amber" />
        <h3 className="font-pixel text-[8.5px] tracking-[0.16em] text-paper/45 uppercase">{label}</h3>
      </div>
      {children}
    </section>
  );
}

function BestTile({ snap }: { snap: Snapshot }) {
  const mode = MODES[snap.mode];
  const isNew = snap.phase === "over" && snap.newBest && snap.score > 0;
  return (
    <section className={`relative overflow-hidden rounded-xl border border-amber/25 bg-gradient-to-br from-amber/12 to-transparent p-4 ${snap.mode === "olympics" ? "olympic-scoreboard" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <IconTrophy className="h-3.5 w-3.5 shrink-0 text-amber" />
            <span className="truncate font-pixel text-[8px] tracking-[0.14em] text-amber/70 uppercase">
              {snap.mode === "olympics" ? "Olympic best" : `Best in ${mode.name}`}
            </span>
          </div>
          <div className="mt-2 font-display text-[48px] leading-[0.8] font-extrabold tracking-[-0.03em] text-paper tabular-nums sm:text-[56px]">
            {mode.records ? pad(snap.hi) : "n/a"}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-pixel text-[8px] tracking-[0.16em] text-paper/35 uppercase">Now</div>
          <div className="mt-2 font-display text-[26px] leading-none font-bold text-paper/70 tabular-nums">
            {pad(snap.phase === "ready" ? 0 : snap.score)}
          </div>
        </div>
      </div>
      {isNew && (
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber px-2.5 py-1 font-pixel text-[8px] text-ink">
          NEW RECORD
        </div>
      )}
    </section>
  );
}

function SpeedGauge({ snap }: { snap: Snapshot }) {
  const span = Math.max(0.1, snap.speedMax - snap.speedMin);
  const pct = Math.min(1, Math.max(0, (snap.speed - snap.speedMin) / span));
  return (
    <Card label="Velocity">
      <div className="flex items-end justify-between gap-3">
        <div className="flex items-baseline gap-1.5">
          <span className="font-display text-[42px] leading-[0.82] font-extrabold tracking-tight text-paper tabular-nums">
            {snap.speed.toFixed(1)}
          </span>
          <span className="font-body text-[11px] text-paper/40">px/frame</span>
        </div>
        <IconBolt
          className={`h-5 w-5 transition-colors duration-500 ${
            pct > 0.66 ? "text-rust" : pct > 0.33 ? "text-amber" : "text-paper/25"
          }`}
        />
      </div>
      <div className="relative mt-3 h-2.5 w-full overflow-hidden rounded-full bg-white/8">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-200 ease-linear"
          style={{
            width: `${pct * 100}%`,
            background: "linear-gradient(90deg,#21c07a 0%,#ffc53d 58%,#d64933 100%)",
          }}
        />
      </div>
      <div className="mt-1.5 flex justify-between font-body text-[10px] text-paper/30 tabular-nums">
        <span>{snap.speedMin.toFixed(1)}</span>
        <span>cap {snap.speedMax.toFixed(1)}</span>
      </div>
    </Card>
  );
}

function History({ stats }: { stats: SaveData["stats"] }) {
  const max = Math.max(...stats.history, 10);
  return (
    <Card label="Last runs">
      <div className="flex h-24 items-end gap-[5px]">
        {Array.from({ length: 14 }).map((_, i) => {
          const v = stats.history[stats.history.length - 14 + i];
          const has = typeof v === "number";
          const hp = has ? Math.max(6, (v / max) * 100) : 4;
          return (
            <div
              key={i}
              title={has ? `${v} pts` : "no run yet"}
              className={`flex-1 rounded-t-[2px] transition-all duration-500 ${
                has ? (v === stats.best ? "bg-amber hover:bg-paper" : "bg-paper/28 hover:bg-paper/55") : "bg-white/6"
              }`}
              style={{ height: `${hp}%` }}
            />
          );
        })}
      </div>
      <div className="mt-2.5 grid grid-cols-3 gap-2 border-t border-white/8 pt-2.5">
        {[
          ["runs", stats.runs],
          ["best", stats.best],
          ["metres", stats.distance],
        ].map(([k, v]) => (
          <div key={k as string}>
            <div className="font-display text-[19px] leading-none font-bold text-paper tabular-nums">
              {(v as number).toLocaleString()}
            </div>
            <div className="mt-1 font-body text-[10px] tracking-wide text-paper/35 uppercase">{k as string}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Lifetime({ stats }: { stats: SaveData["stats"] }) {
  const rows: [string, number][] = [
    ["Coins earned", stats.coinsEarned],
    ["Coins picked up", stats.coinsCollected],
    ["Jumps", stats.jumps],
    ["Pterodactyls dodged", stats.pteros],
    ["Nights survived", stats.nights],
  ];
  return (
    <Card label="Lifetime">
      <ul className="flex flex-col gap-2">
        {rows.map(([k, v]) => (
          <li key={k} className="flex items-center justify-between gap-3 font-body text-[12px]">
            <span className="flex items-center gap-2 text-paper/45">
              {k === "Coins earned" && <CoinGlyph scale={1} />}
              {k}
            </span>
            <span className="font-display text-[14px] font-bold text-paper tabular-nums">{v.toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

const BESTIARY = [
  { map: CACTUS_SMALL, name: "Cereus minor", note: "Clusters of 1 to 3" },
  { map: CACTUS_LARGE, name: "Cereus major", note: "75px tall, needs a full jump" },
  { map: PTERO_UP, name: "Pterodactyl", note: "Three altitudes, duck or hop" },
] as const;

const OLYMPIC_GUIDE = [
  { map: TORCH, name: "Carry the flame", note: "Run into a torch to change event" },
  { map: HURDLE, name: "Six sporting events", note: "Jump on land, dive in the pool" },
  { map: MEDAL, name: "Go for gold", note: "Finish an event to earn a medal" },
] as const;

function Bestiary({ olympic = false }: { olympic?: boolean }) {
  return (
    <Card label={olympic ? "The Olympic field guide" : "Field guide"}>
      <ul className="flex flex-col gap-2.5">
        {(olympic ? OLYMPIC_GUIDE : BESTIARY).map((b) => (
          <li
            key={b.name}
            className="flex items-center gap-3 rounded-lg border border-white/6 bg-black/20 px-2.5 py-2 transition-transform duration-300 hover:translate-x-1 hover:border-amber/40"
          >
            <div className="grid h-11 w-14 shrink-0 place-items-center rounded-md bg-paper/[0.04] ring-1 ring-white/6 ring-inset">
              <SpriteTile map={b.map} scale={1} color={olympic ? "#e6be72" : "#ededea"} accent={olympic ? "#ee7052" : undefined} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-display text-[13.5px] font-semibold text-paper/90">{b.name}</div>
              <div className="truncate font-body text-[10.5px] text-paper/40">{b.note}</div>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function PowerGuide({ snap }: { snap: Snapshot }) {
  const active = new Set(snap.effects.map((e) => e.id));
  const groups = [
    { label: "Blessings", good: true },
    { label: "Curses", good: false },
  ];
  return (
    <Card label="Mystery box guide">
      <div className="mb-3 flex items-center gap-3 rounded-lg bg-black/20 px-2.5 py-2">
        <SpriteTile map={MYSTERY_BOX} scale={2} color="#1b1f24" accent="#ff4fb8" />
        <p className="font-body text-[11px] leading-snug text-paper/50">
          Every box rolls one outcome. A shield blocks the next hit or curse.
        </p>
      </div>
      {groups.map((g) => (
        <div key={g.label} className="mb-2.5 last:mb-0">
          <div className={`mb-1.5 font-pixel text-[7px] tracking-[0.14em] ${g.good ? "text-live" : "text-rust"}`}>
            {g.label.toUpperCase()}
          </div>
          <ul className="flex flex-col gap-1.5">
            {POWER_LIST.filter((p) => p.good === g.good).map((p) => (
              <li
                key={p.id}
                className={`flex items-center gap-2.5 rounded-md px-1.5 py-1 transition-colors ${
                  active.has(p.id) ? "bg-white/10" : ""
                }`}
              >
                <SpriteTile map={POWER_ICONS[p.id]} scale={2} color={p.color} accent="#ffffff" className="shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-display text-[12.5px] font-semibold text-paper/90">{p.name}</div>
                  <div className="truncate font-body text-[10.5px] text-paper/40">{p.desc}</div>
                </div>
                {p.duration > 0 && (
                  <span className="shrink-0 font-pixel text-[7px] text-paper/35">{Math.round(p.duration / 60)}s</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </Card>
  );
}

const KEYS = [
  { k: "SPACE", d: "jump or start" },
  { k: "UP", d: "jump (hold for height)" },
  { k: "DOWN", d: "duck and fast fall" },
  { k: "P", d: "pause" },
];

function KeyLegend({ snap }: { snap: Snapshot }) {
  const inEvent = snap.mode === "olympics" && Boolean(snap.sport);
  const keys = inEvent ? [
    { k: "SPACE", d: snap.sport === "swimming" ? "dive under the buoys" : "jump over obstacles" },
    { k: "UP", d: snap.sport === "swimming" ? "dive" : "jump (hold for height)" },
    { k: "P", d: "pause" },
  ] : snap.mode === "arcade" ? [...KEYS.slice(0, 3), { k: "F / X", d: "fire laser (with blaster)" }, KEYS[3]] : KEYS;
  return (
    <Card label="Controls">
      <ul className="flex flex-col gap-2">
        {keys.map((k) => (
          <li key={k.k} className="flex items-center gap-3">
            <kbd className="min-w-[56px] rounded-md border border-b-[3px] border-white/14 bg-white/[0.06] px-2 py-1 text-center font-pixel text-[8px] text-paper/85">
              {k.k}
            </kbd>
            <span className="font-body text-[11.5px] text-paper/45">{k.d}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 border-t border-white/8 pt-2.5 font-body text-[11px] leading-relaxed text-paper/35">
        {inEvent
          ? "Your action changes with the event. The touch pad becomes DIVE in the pool. Ducking is disabled during events."
          : "Release jump early for a short hop. Jumps pressed just before landing are buffered. On touch devices use the pads under the play field."}
      </p>
    </Card>
  );
}

export function SidePanel({ snap, stats }: { snap: Snapshot; stats: SaveData["stats"] }) {
  const olympic = snap.mode === "olympics";
  return (
    <aside className="flex flex-col gap-4 lg:sticky lg:top-[92px]">
      <BestTile snap={snap} />
      <SpeedGauge snap={snap} />
      <History stats={stats} />
      <Lifetime stats={stats} />
      {snap.mode === "arcade" ? <PowerGuide snap={snap} /> : <Bestiary olympic={olympic} />}
      <KeyLegend snap={snap} />
      <div className="hidden items-center gap-3 rounded-xl border border-white/10 bg-white/[0.028] px-4 py-3 lg:flex">
        <SpriteTile map={olympic ? TORCH : DINO_DUCK_A} scale={1} color={olympic ? "#c9954a" : "#6b7280"} accent="#e6be72" />
        <p className="font-body text-[10.5px] leading-relaxed text-paper/40">
          {olympic
            ? "Olympic Stadium is applied automatically. Your saved theme returns when you switch to another mode."
            : "Ducking shrinks your hitbox from 72px to 45px. That is the whole trick for the middle pterodactyl."}
        </p>
      </div>
      <div className="hidden justify-center lg:flex">
        <SpriteTile map={DINO_IDLE} scale={1} color="#3a4048" className="animate-bob opacity-60" />
      </div>
    </aside>
  );
}
