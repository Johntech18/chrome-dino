import { useState, type ReactNode } from "react";
import {
  CHALLENGES,
  DAILY_BONUS,
  MODE_LIST,
  QUEST_MAP,
  SKINS,
  SKIN_MAP,
  THEMES,
  THEME_MAP,
  type ModeId,
} from "../game/content";
import { questDone, unclaimedCounts, type SaveData, type ShopKind } from "../game/save";
import { CoinGlyph } from "./SpriteTile";
import { SkinPreview, ThemePreview } from "./Previews";
import { IconBag, IconBolt, IconCheck, IconLock, IconTarget, IconTrophy } from "./icons";

type Tab = "modes" | "quests" | "challenges" | "shop";

type Props = {
  save: SaveData;
  activeMode: ModeId;
  onMode: (id: ModeId) => void;
  onClaimQuest: (i: number) => void;
  onClaimBonus: () => void;
  onClaimChallenge: (id: string) => void;
  onBuy: (kind: ShopKind, id: string) => void;
  onEquip: (kind: ShopKind, id: string) => void;
};

const TABS: { id: Tab; label: string; icon: (c: string) => ReactNode }[] = [
  { id: "modes", label: "Modes", icon: (c) => <IconBolt className={c} /> },
  { id: "quests", label: "Quests", icon: (c) => <IconTarget className={c} /> },
  { id: "challenges", label: "Challenges", icon: (c) => <IconTrophy className={c} /> },
  { id: "shop", label: "Shop", icon: (c) => <IconBag className={c} /> },
];

const card =
  "rounded-xl border border-white/10 bg-white/[0.028] transition-colors duration-300 hover:border-white/20";

function Bar({ value, max, color = "#ffc53d" }: { value: number; max: number; color?: string }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/8">
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

function Reward({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber/12 px-2.5 py-1 ring-1 ring-amber/25 ring-inset">
      <CoinGlyph scale={1} />
      <span className="font-pixel text-[9px] text-amber tabular-nums">{n}</span>
    </span>
  );
}

function ClaimButton({
  ready,
  claimed,
  onClick,
}: {
  ready: boolean;
  claimed: boolean;
  onClick: () => void;
}) {
  if (claimed) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-live/12 px-3 py-2 font-pixel text-[8px] tracking-[0.1em] text-live">
        <IconCheck className="h-3 w-3" /> CLAIMED
      </span>
    );
  }
  return (
    <button
      type="button"
      disabled={!ready}
      onClick={onClick}
      className={`rounded-lg px-3 py-2 font-pixel text-[8px] tracking-[0.1em] transition ${
        ready
          ? "animate-pop-loop bg-amber text-ink hover:-translate-y-0.5 hover:bg-white"
          : "cursor-not-allowed bg-white/6 text-paper/30"
      }`}
    >
      {ready ? "CLAIM" : "LOCKED"}
    </button>
  );
}

/* ------------------------------------------------------------------ MODES */

function Modes({ save, activeMode, onMode }: Pick<Props, "save" | "activeMode" | "onMode">) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {MODE_LIST.map((m) => {
        const on = m.id === activeMode;
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onMode(m.id)}
            className={`${card} group relative flex flex-col gap-3 p-4 text-left ${
              on ? "!border-transparent" : ""
            }`}
            style={on ? { boxShadow: `inset 0 0 0 2px ${m.accent}`, background: `${m.accent}14` } : undefined}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: m.accent }} />
                  <h4 className="font-display text-[17px] font-extrabold tracking-tight text-paper">{m.name}</h4>
                </div>
                <p className="mt-1 font-body text-[12px] text-paper/50">{m.tagline}</p>
              </div>
              {on && (
                <span
                  className="shrink-0 rounded-full px-2 py-1 font-pixel text-[7.5px] text-ink"
                  style={{ background: m.accent }}
                >
                  ACTIVE
                </span>
              )}
            </div>
            <ul className="flex flex-col gap-1.5">
              {m.rules.map((r) => (
                <li key={r} className="flex gap-2 font-body text-[11.5px] leading-snug text-paper/55">
                  <span className="mt-[5px] h-1 w-1 shrink-0 rounded-full bg-paper/30" />
                  {r}
                </li>
              ))}
            </ul>
            <div className="mt-auto flex items-center justify-between border-t border-white/8 pt-3">
              <div>
                <div className="font-pixel text-[7px] tracking-[0.14em] text-paper/35">BEST</div>
                <div className="mt-1 font-display text-[18px] leading-none font-bold text-paper tabular-nums">
                  {m.records ? String(save.modeBest[m.id]).padStart(5, "0") : "n/a"}
                </div>
              </div>
              <div className="text-right">
                <div className="font-pixel text-[7px] tracking-[0.14em] text-paper/35">COINS</div>
                <div className="mt-1 font-display text-[18px] leading-none font-bold text-amber tabular-nums">
                  x{m.coinMult}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ----------------------------------------------------------------- QUESTS */

function Quests({ save, onClaimQuest, onClaimBonus }: Pick<Props, "save" | "onClaimQuest" | "onClaimBonus">) {
  const list = save.quests.list;
  const claimed = list.filter((q) => q.claimed).length;
  const allClaimed = claimed === list.length;
  const tierName = ["EASY", "MEDIUM", "HARD"];
  const tierColor = ["#21c07a", "#ffc53d", "#d64933"];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-body text-[12.5px] text-paper/45">
          Three fresh quests every day. Progress counts in every mode except Zen.
        </p>
        <span className="font-pixel text-[8.5px] tracking-[0.12em] text-paper/45">
          {claimed}/{list.length} CLAIMED
        </span>
      </div>
      {list.map((q, i) => {
        const def = QUEST_MAP[q.id];
        const target = def.targets[q.tier];
        const done = questDone(q);
        return (
          <div key={`${q.id}-${i}`} className={`${card} flex flex-col gap-3 p-4 sm:flex-row sm:items-center`}>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className="rounded px-1.5 py-0.5 font-pixel text-[7px] text-ink"
                  style={{ background: tierColor[q.tier] }}
                >
                  {tierName[q.tier]}
                </span>
                <h4 className="truncate font-display text-[15px] font-bold text-paper">{def.label(target)}</h4>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex-1">
                  <Bar value={q.progress} max={target} color={done ? "#21c07a" : "#2d5bff"} />
                </div>
                <span className="w-[74px] shrink-0 text-right font-body text-[11px] text-paper/45 tabular-nums">
                  {Math.min(q.progress, target)} / {target}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 sm:justify-end">
              <Reward n={def.rewards[q.tier]} />
              <ClaimButton ready={done} claimed={q.claimed} onClick={() => onClaimQuest(i)} />
            </div>
          </div>
        );
      })}
      <div
        className={`${card} flex items-center justify-between gap-3 border-dashed p-4 ${
          allClaimed && !save.quests.bonusClaimed ? "!border-amber/50 bg-amber/[0.06]" : ""
        }`}
      >
        <div className="min-w-0">
          <h4 className="font-display text-[15px] font-bold text-paper">Daily sweep bonus</h4>
          <p className="mt-0.5 font-body text-[11.5px] text-paper/45">Claim all three quests to unlock it.</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Reward n={DAILY_BONUS} />
          <ClaimButton ready={allClaimed} claimed={save.quests.bonusClaimed} onClick={onClaimBonus} />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- CHALLENGES */

function Challenges({ save, onClaimChallenge }: Pick<Props, "save" | "onClaimChallenge">) {
  const done = CHALLENGES.filter((c) => save.challenges[c.id]?.claimed).length;
  const tierColor = { 1: "#21c07a", 2: "#ffc53d", 3: "#d64933" } as const;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-body text-[12.5px] text-paper/45">
          Permanent single-run goals. Hit the target once and the reward is yours.
        </p>
        <span className="font-pixel text-[8.5px] tracking-[0.12em] text-paper/45">
          {done}/{CHALLENGES.length} CLAIMED
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {CHALLENGES.map((c) => {
          const cur = save.challenges[c.id] ?? { best: 0, claimed: false };
          const complete = cur.best >= c.target;
          return (
            <div key={c.id} className={`${card} flex flex-col gap-3 p-4 ${complete && !cur.claimed ? "!border-amber/45" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: tierColor[c.tier] }} />
                    <h4 className="truncate font-display text-[15px] font-bold text-paper">{c.title}</h4>
                  </div>
                  <p className="mt-1 font-body text-[12px] leading-snug text-paper/50">{c.desc}</p>
                </div>
                {!complete && <IconLock className="h-4 w-4 shrink-0 text-paper/25" />}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded bg-white/6 px-1.5 py-0.5 font-pixel text-[7px] text-paper/55">
                  {c.mode === "any" ? "ANY MODE" : c.mode.toUpperCase()}
                </span>
                {c.noDuck && (
                  <span className="rounded bg-white/6 px-1.5 py-0.5 font-pixel text-[7px] text-paper/55">NO DUCK</span>
                )}
              </div>
              <div>
                <Bar value={cur.best} max={c.target} color={complete ? "#21c07a" : "#2d5bff"} />
                <div className="mt-1.5 flex justify-between font-body text-[10.5px] text-paper/40 tabular-nums">
                  <span>best {cur.best}</span>
                  <span>goal {c.target}</span>
                </div>
              </div>
              <div className="mt-auto flex items-center justify-between gap-3">
                <Reward n={c.reward} />
                <ClaimButton
                  ready={complete}
                  claimed={cur.claimed}
                  onClick={() => onClaimChallenge(c.id)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- SHOP */

function Price({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <CoinGlyph scale={1} />
      <span className="tabular-nums">{n}</span>
    </span>
  );
}

function ShopButton({
  owned,
  equipped,
  price,
  coins,
  onBuy,
  onEquip,
}: {
  owned: boolean;
  equipped: boolean;
  price: number;
  coins: number;
  onBuy: () => void;
  onEquip: () => void;
}) {
  const base = "w-full rounded-lg px-3 py-2.5 font-pixel text-[8px] tracking-[0.1em] transition";
  if (equipped) {
    return (
      <div className={`${base} flex items-center justify-center gap-1.5 bg-live/14 text-live`}>
        <IconCheck className="h-3 w-3" /> EQUIPPED
      </div>
    );
  }
  if (owned) {
    return (
      <button type="button" onClick={onEquip} className={`${base} bg-white/8 text-paper hover:bg-white/16`}>
        EQUIP
      </button>
    );
  }
  const afford = coins >= price;
  return (
    <button
      type="button"
      onClick={onBuy}
      className={`${base} flex items-center justify-center gap-1.5 ${
        afford ? "bg-amber text-ink hover:-translate-y-0.5 hover:bg-white" : "bg-white/6 text-paper/45 hover:bg-white/10"
      }`}
    >
      BUY <Price n={price} />
    </button>
  );
}

function Shop({ save, onBuy, onEquip }: Pick<Props, "save" | "onBuy" | "onEquip">) {
  const theme = THEME_MAP[save.equipped.theme] ?? THEMES[0];
  const skin = SKIN_MAP[save.equipped.skin] ?? SKINS[0];
  return (
    <div className="flex flex-col gap-8">
      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <h4 className="font-display text-[18px] font-extrabold tracking-tight text-paper">Skins</h4>
          <span className="font-body text-[11.5px] text-paper/40">Colour, hats and trail effects</span>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
          {SKINS.map((s) => (
            <div key={s.id} className={`${card} flex flex-col gap-3 p-3`}>
              <div className="overflow-hidden rounded-md ring-1 ring-white/10">
                <SkinPreview skin={s} theme={theme} />
              </div>
              <div className="min-w-0">
                <h5 className="truncate font-display text-[14px] font-bold text-paper">{s.name}</h5>
                <p className="truncate font-body text-[11px] text-paper/40">{s.blurb}</p>
              </div>
              <div className="mt-auto">
                <ShopButton
                  owned={save.owned.skins.includes(s.id)}
                  equipped={save.equipped.skin === s.id}
                  price={s.price}
                  coins={save.coins}
                  onBuy={() => onBuy("skin", s.id)}
                  onEquip={() => onEquip("skin", s.id)}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <h4 className="font-display text-[18px] font-extrabold tracking-tight text-paper">Themes</h4>
          <span className="font-body text-[11.5px] text-paper/40">Day and night palettes</span>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
          {THEMES.map((t) => (
            <div key={t.id} className={`${card} flex flex-col gap-3 p-3`}>
              <div className="overflow-hidden rounded-md ring-1 ring-white/10">
                <ThemePreview theme={t} />
              </div>
              <h5 className="truncate font-display text-[14px] font-bold text-paper">{t.name}</h5>
              <div className="mt-auto">
                <ShopButton
                  owned={save.owned.themes.includes(t.id)}
                  equipped={save.equipped.theme === t.id}
                  price={t.price}
                  coins={save.coins}
                  onBuy={() => onBuy("theme", t.id)}
                  onEquip={() => onEquip("theme", t.id)}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
      <p className="font-body text-[11px] text-paper/50">
        {save.mode === "olympics"
          ? `Olympic Stadium is active automatically. ${theme.name} is saved for your other modes. Skin: ${skin.name}.`
          : `Wearing: ${skin.name} on ${theme.name}.`}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------- HUB */

export function Hub(props: Props) {
  const [tab, setTab] = useState<Tab>("modes");
  const counts = unclaimedCounts(props.save);
  const badge: Record<Tab, number> = {
    modes: 0,
    quests: counts.quests,
    challenges: counts.challenges,
    shop: 0,
  };

  return (
    <section className="mt-6" aria-label="Game hub">
      <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 lg:mx-0 lg:px-0">
        {TABS.map((t) => {
          const on = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-pressed={on}
              className={`relative flex shrink-0 items-center gap-2 rounded-lg border px-4 py-2.5 font-display text-[13.5px] font-bold transition ${
                on
                  ? "border-amber bg-amber text-ink"
                  : "border-white/10 bg-white/[0.04] text-paper/65 hover:border-white/25 hover:text-paper"
              }`}
            >
              {t.icon("h-4 w-4")}
              {t.label}
              {badge[t.id] > 0 && (
                <span className="absolute -top-1.5 -right-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-rust px-1 font-pixel text-[8px] text-white">
                  {badge[t.id]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        {tab === "modes" && <Modes save={props.save} activeMode={props.activeMode} onMode={props.onMode} />}
        {tab === "quests" && (
          <Quests save={props.save} onClaimQuest={props.onClaimQuest} onClaimBonus={props.onClaimBonus} />
        )}
        {tab === "challenges" && <Challenges save={props.save} onClaimChallenge={props.onClaimChallenge} />}
        {tab === "shop" && <Shop save={props.save} onBuy={props.onBuy} onEquip={props.onEquip} />}
      </div>
    </section>
  );
}
