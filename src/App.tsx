import { useCallback, useEffect, useRef, useState } from "react";
import { DinoGame, type Snapshot } from "./game/engine";
import { MODES, MODE_LIST, SKIN_MAP, SKINS, THEMES, THEME_MAP, type ModeId } from "./game/content";
import {
  applyRun,
  buy,
  claimBonus,
  claimChallenge,
  claimQuest,
  ensureDaily,
  equip,
  loadSave,
  persist,
  type RunReport as Report,
  type SaveData,
  type ShopKind,
} from "./game/save";
import { sfx } from "./game/sfx";
import { DINO_RUN_A } from "./game/sprites";
import { GameStage } from "./components/GameStage";
import { OlympicHeading, OlympicRings } from "./components/OlympicIdentity";
import { Hub } from "./components/Hub";
import { RunReport } from "./components/RunReport";
import { SidePanel } from "./components/SidePanel";
import { CoinGlyph, SpriteTile } from "./components/SpriteTile";
import { type Toast, Toasts } from "./components/Toasts";
import { IconMute, IconPause, IconPlay, IconRestart, IconSound } from "./components/icons";
import { useReveal } from "./utils/useReveal";

const initialSnap: Snapshot = {
  phase: "ready",
  mode: "classic",
  score: 0,
  hi: 0,
  speed: 6.2,
  speedMin: 6.2,
  speedMax: 14.6,
  night: 0,
  distance: 0,
  milestone: 0,
  newBest: false,
  runCoins: 0,
  coinMult: 1,
  timeLeft: null,
  timeUp: false,
  sport: null,
  torches: 0,
  effects: [],
  boxes: 0,
  zaps: 0,
};

const TICKER = [
  "ERR_INTERNET_DISCONNECTED",
  "no internet",
  "check your network cables",
  "ERR_NAME_NOT_RESOLVED",
  "reconnect the modem",
  "offline mode engaged",
  "run, dinosaur, run",
  "olympic torch spotted",
  "six sports, one dinosaur",
];

const NOTES: { span: string; big: string; unit: string; title: string; body: string }[] = [
  {
    span: "sm:col-span-3",
    big: "16.67",
    unit: "ms",
    title: "Fixed timestep",
    body: "Physics run on a locked 60 Hz accumulator, decoupled from the display refresh rate. A 144 Hz monitor does not make the rex jump higher.",
  },
  {
    span: "sm:col-span-3",
    big: "64",
    unit: "px",
    title: "Guaranteed hop",
    body: "Hold jump for the full arc or let go early for a short hop. Either way you always clear at least 64px, and a jump pressed 7 frames before landing is buffered.",
  },
  {
    span: "sm:col-span-2",
    big: "7",
    unit: "modes",
    title: "Rule sets",
    body: "Classic, Arcade, Sprint, Turbo, Lunar, Olympics and Zen each swap speed, gravity, clock and coin multiplier without touching the core loop. Arcade adds 11 box outcomes, Olympics adds six sports.",
  },
  {
    span: "sm:col-span-2",
    big: "x12",
    unit: "combo",
    title: "Coin chain pitch",
    body: "Pickups inside a 55 frame window climb the scale by a semitone each, for twelve steps. Arcs hang over obstacles to reward clean jumps.",
  },
  {
    span: "sm:col-span-2",
    big: "0",
    unit: "images",
    title: "Zero image assets",
    body: "Every sprite is a typed string grid, rasterised once per colour. Skins and themes are just different inks.",
  },
];

let toastId = 1;

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<DinoGame | null>(null);
  const modeTabsRef = useRef<HTMLDivElement>(null);
  const pageRef = useReveal<HTMLDivElement>();
  const saveRef = useRef<SaveData>(null as unknown as SaveData);

  const [save, setSave] = useState<SaveData>(() => {
    const s = ensureDaily(loadSave());
    saveRef.current = s;
    return s;
  });
  const [snap, setSnap] = useState<Snapshot>(() => ({
    ...initialSnap,
    mode: save.mode,
    hi: save.modeBest[save.mode],
    speed: MODES[save.mode].speedStart,
    speedMin: MODES[save.mode].speedStart,
    speedMax: MODES[save.mode].speedMax,
  }));
  const [report, setReport] = useState<Report | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [sound, setSound] = useState(true);
  const [mounted, setMounted] = useState(false);

  const commit = useCallback((next: SaveData) => {
    saveRef.current = next;
    setSave(next);
  }, []);

  const toast = useCallback((text: string, tone: Toast["tone"] = "info") => {
    const id = toastId++;
    setToasts((t) => [...t.slice(-2), { id, text, tone }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3400);
  }, []);

  /* ---------------------------------------------------------- game wiring */
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const game = new DinoGame(cv);
    gameRef.current = game;
    // dev-only hook so browser tests can grant specific power-ups
    if (import.meta.env.DEV) (window as unknown as { __dinoGame?: DinoGame }).__dinoGame = game;

    const s0 = saveRef.current;
    game.setTheme(THEME_MAP[s0.equipped.theme] ?? THEMES[0]);
    game.setSkin(SKIN_MAP[s0.equipped.skin] ?? SKINS[0]);
    game.setMode(s0.mode);
    game.setHi(s0.modeBest[s0.mode]);
    setMounted(true);

    game.onSnapshot = (s) => setSnap(s);
    game.onRunEnd = (run) => {
      const { save: next, report: rep } = applyRun(saveRef.current, run);
      commit(next);
      game.setHi(next.modeBest[run.mode]);
      setReport(rep);
      rep.questsDone.forEach((q) => toast(`Quest ready: ${q}`, "good"));
      rep.challengesDone.forEach((c) => toast(`Challenge complete: ${c}`, "gold"));
    };

    const parent = cv.parentElement;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) game.resize(w);
    });
    if (parent) {
      ro.observe(parent);
      game.resize(parent.clientWidth);
    }
    game.start();

    const jumpKeys = new Set(["Space", "ArrowUp", "KeyW", "Enter"]);
    const blurFocused = () => {
      const a = document.activeElement;
      if (a instanceof HTMLButtonElement) a.blur();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (jumpKeys.has(e.code)) {
        e.preventDefault();
        blurFocused();
        if (!e.repeat) game.press("key");
      } else if (e.code === "ArrowDown" || e.code === "KeyS") {
        e.preventDefault();
        game.setDuck(true);
      } else if (e.code === "KeyF" || e.code === "KeyX") {
        e.preventDefault();
        game.fire();
      } else if (e.code === "KeyP" || e.code === "Escape") {
        e.preventDefault();
        game.togglePause();
      } else if (e.code === "KeyR") {
        e.preventDefault();
        game.press("key");
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "ArrowDown" || e.code === "KeyS") game.setDuck(false);
      if (jumpKeys.has(e.code)) {
        e.preventDefault();
        game.release();
      }
    };
    const onHide = () => {
      if (document.hidden) game.pause();
    };
    const onBlur = () => game.pause();

    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("keyup", onKeyUp, { passive: false });
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onHide);

    // roll the daily quests over if the tab stays open past midnight
    const day = window.setInterval(() => {
      const next = ensureDaily(saveRef.current);
      if (next !== saveRef.current) commit(next);
    }, 30000);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onHide);
      window.clearInterval(day);
      ro.disconnect();
      game.destroy();
      gameRef.current = null;
    };
  }, [commit, toast]);

  // equipped cosmetics flow into the engine
  useEffect(() => {
    const g = gameRef.current;
    if (!g) return;
    g.setTheme(THEME_MAP[save.equipped.theme] ?? THEMES[0]);
    g.setSkin(SKIN_MAP[save.equipped.skin] ?? SKINS[0]);
  }, [save.equipped.theme, save.equipped.skin, mounted]);

  useEffect(() => {
    persist(save);
  }, [save]);

  useEffect(() => {
    const olympic = snap.mode === "olympics";
    document.title = olympic ? "T-REX OLYMPICS | Tokyo 2020" : "T-REX RUNNER | No Internet";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", olympic ? "#101f34" : "#15181c");
  }, [snap.mode]);

  useEffect(() => {
    const tabs = modeTabsRef.current;
    if (!tabs) return;
    const revealActive = () => {
      const active = tabs.querySelector<HTMLElement>('[aria-selected="true"]');
      if (!active) return;
      const item = active.getBoundingClientRect();
      const viewport = tabs.getBoundingClientRect();
      tabs.scrollLeft += item.left - viewport.left - (viewport.width - item.width) / 2;
    };
    const observer = new ResizeObserver(revealActive);
    observer.observe(tabs);
    revealActive();
    return () => observer.disconnect();
  }, [snap.mode]);

  /* ------------------------------------------------------------- handlers */
  const press = useCallback(() => gameRef.current?.press("pointer"), []);
  const releasePress = useCallback(() => gameRef.current?.release(), []);
  const fire = useCallback(() => gameRef.current?.fire(), []);
  const duckDown = useCallback(() => gameRef.current?.setDuck(true), []);
  const duckUp = useCallback(() => gameRef.current?.setDuck(false), []);
  const restart = useCallback(() => gameRef.current?.restart(), []);

  const toggleSound = useCallback(() => {
    setSound((v) => {
      sfx.setEnabled(!v);
      return !v;
    });
  }, []);

  const selectMode = useCallback(
    (id: ModeId) => {
      const g = gameRef.current;
      if (!g || g.mode.id === id) return;
      g.setMode(id);
      g.setHi(saveRef.current.modeBest[id]);
      commit({ ...saveRef.current, mode: id });
      setReport(null);
      toast(`${MODES[id].name} mode: ${MODES[id].tagline}`, "info");
    },
    [commit, toast],
  );

  const gained = (before: SaveData, after: SaveData) => after.coins - before.coins;

  const onClaimQuest = useCallback(
    (i: number) => {
      const prev = saveRef.current;
      const next = claimQuest(prev, i);
      if (next === prev) return;
      commit(next);
      sfx.claim();
      toast(`+${gained(prev, next)} coins from quest`, "gold");
    },
    [commit, toast],
  );

  const onClaimBonus = useCallback(() => {
    const prev = saveRef.current;
    const next = claimBonus(prev);
    if (next === prev) return;
    commit(next);
    sfx.claim();
    toast(`+${gained(prev, next)} coins daily sweep bonus`, "gold");
  }, [commit, toast]);

  const onClaimChallenge = useCallback(
    (id: string) => {
      const prev = saveRef.current;
      const next = claimChallenge(prev, id);
      if (next === prev) return;
      commit(next);
      sfx.claim();
      toast(`+${gained(prev, next)} coins from challenge`, "gold");
    },
    [commit, toast],
  );

  const onBuy = useCallback(
    (kind: ShopKind, id: string) => {
      const { save: next, ok } = buy(saveRef.current, kind, id);
      if (!ok) {
        sfx.deny();
        toast("Not enough coins yet. Keep running!", "bad");
        return;
      }
      commit(next);
      sfx.buy();
      const name = kind === "skin" ? SKIN_MAP[id].name : THEME_MAP[id].name;
      toast(`Unlocked and equipped: ${name}`, "good");
    },
    [commit, toast],
  );

  const onEquip = useCallback(
    (kind: ShopKind, id: string) => {
      commit(equip(saveRef.current, kind, id));
      sfx.claim();
    },
    [commit],
  );

  const paused = snap.phase === "paused";
  const mode = MODES[snap.mode];
  const olympic = snap.mode === "olympics";

  return (
    <div
      ref={pageRef}
      data-theme={olympic ? "olympic-stadium" : "default"}
      className={`relative min-h-screen overflow-x-hidden bg-ink text-paper ${olympic ? "olympics-theme" : ""}`}
    >
      {/* ambient background */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="bg-grid absolute inset-0 opacity-70" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 78% at 78% -8%, rgba(45,91,255,0.20), transparent 58%), radial-gradient(90% 60% at 6% 104%, rgba(255,197,61,0.11), transparent 62%)",
          }}
        />
        <div className="bg-noise absolute inset-0 opacity-[0.05] mix-blend-overlay" />
      </div>

      {/* header */}
      <header className="site-header sticky top-0 z-40 border-b border-white/10 bg-ink/82 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1400px] items-center gap-2 px-4 py-2.5 sm:gap-4 sm:px-5 sm:py-3 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-paper/[0.06] ring-1 ring-white/10">
              <SpriteTile map={DINO_RUN_A} scale={1} color="#ffc53d" />
            </div>
            <div className="hidden leading-none sm:block">
              <div className="font-display text-[15px] font-extrabold tracking-[-0.01em]">T-REX RUNNER</div>
              <div className="mt-1 font-pixel text-[7.5px] tracking-[0.18em] text-paper/35">
                {olympic ? "THE OLYMPIC EDITION" : "CHROME OFFLINE REPLICA"}
              </div>
            </div>
          </div>

          <div
            key={save.coins}
            className="animate-pop flex items-center gap-2 rounded-full border border-amber/30 bg-amber/10 px-3 py-1.5"
            aria-label={`${save.coins} coins`}
          >
            <CoinGlyph scale={2} />
            <span className="font-pixel text-[11px] text-amber tabular-nums">{save.coins.toLocaleString()}</span>
          </div>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            {olympic ? (
              <span className="hidden items-center gap-2.5 pr-2 md:flex">
                <OlympicRings className="h-6 w-12" inverse />
                <span className="font-pixel text-[8px] tracking-[0.12em] text-paper/70">TOKYO 2020</span>
              </span>
            ) : (
              <span className="hidden items-center gap-2 rounded-full border border-rust/35 bg-rust/10 px-3 py-1.5 md:flex">
                <span className="animate-live h-1.5 w-1.5 rounded-full bg-rust" />
                <span className="font-pixel text-[8px] tracking-[0.12em] text-rust/90">OFFLINE</span>
              </span>
            )}

            <button
              type="button"
              onClick={() => gameRef.current?.togglePause()}
              disabled={!mounted || snap.phase === "ready" || snap.phase === "over"}
              aria-label={paused ? "Resume" : "Pause"}
              className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-paper/70 transition hover:border-white/25 hover:bg-white/10 hover:text-paper disabled:cursor-not-allowed disabled:opacity-30"
            >
              {paused ? <IconPlay className="h-4 w-4" /> : <IconPause className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={restart}
              aria-label="Restart run"
              className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-paper/70 transition hover:border-amber/50 hover:bg-amber/15 hover:text-amber"
            >
              <IconRestart className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={toggleSound}
              aria-label={sound ? "Mute" : "Unmute"}
              className={`grid h-9 w-9 place-items-center rounded-lg border transition ${
                sound
                  ? "border-live/40 bg-live/12 text-live"
                  : "border-white/10 bg-white/[0.04] text-paper/45 hover:text-paper"
              }`}
            >
              {sound ? <IconSound className="h-4 w-4" /> : <IconMute className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* ticker */}
      {!olympic && <div className="relative overflow-hidden border-b border-white/10 bg-rust/[0.07] py-1.5">
        <div className="animate-marquee flex w-max whitespace-nowrap">
          {[0, 1].map((dup) => (
            <div key={dup} className="flex gap-8 pr-8">
              {TICKER.map((t, i) => (
                <span key={`${dup}-${i}`} className="flex items-center gap-8">
                  <span className="font-pixel text-[8.5px] tracking-[0.14em] text-paper/45">{t.toUpperCase()}</span>
                  <span className="text-rust/50">✕</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>}

      <main className="mx-auto max-w-[1400px] px-4 pt-8 pb-16 sm:px-5 sm:pt-10 sm:pb-20 lg:px-8">
        {/* headline */}
        {olympic ? <OlympicHeading /> : <div className="mb-6 grid items-end gap-5 sm:mb-8 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <div className="mb-3 flex items-center gap-3 sm:mb-4">
              <span className="font-pixel text-[8.5px] tracking-[0.16em] text-volt sm:text-[9px]">chrome://dino</span>
              <span className="h-px w-10 bg-white/15 sm:w-16" />
              <span className="font-pixel text-[8px] tracking-[0.16em] text-paper/30">7 MODES · QUESTS · SHOP</span>
            </div>
            <h1 className="font-display text-[clamp(2.5rem,9.5vw,6.4rem)] leading-[0.86] font-extrabold tracking-[-0.045em]">
              The internet
              <br />
              is <span className="text-rust">down</span>.{" "}
              <span className="relative inline-block align-middle">
                <span className="absolute -inset-x-3 -inset-y-1 -z-10 bg-amber/15 blur-md" />
                <span className="text-amber">Run.</span>
              </span>
            </h1>
          </div>
          <p className="max-w-[44ch] font-body text-[14px] leading-relaxed text-paper/50 sm:text-[14.5px] lg:pb-3 lg:text-right">
            The little game Chrome hides behind its offline screen, rebuilt with seven game modes, power-up boxes, the Tokyo torch
            relay, daily quests, permanent challenges, a coin economy and a wardrobe of skins and themes.
          </p>
        </div>}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_318px]">
          <div className="min-w-0">
            {/* quick mode switcher */}
            <div
              ref={modeTabsRef}
              role="tablist"
              aria-label="Game mode"
              className="no-scrollbar -mx-4 mb-3 flex gap-2 overflow-x-auto px-4 sm:-mx-5 sm:px-5 lg:mx-0 lg:px-0"
            >
              {MODE_LIST.map((m) => {
                const on = m.id === snap.mode;
                return (
                  <button
                    key={m.id}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => selectMode(m.id)}
                    className={`flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 font-display text-[13px] font-bold transition ${
                      on ? "border-transparent text-ink" : "border-white/12 bg-white/[0.04] text-paper/65 hover:border-white/30 hover:text-paper"
                    }`}
                    style={on ? { background: m.accent } : undefined}
                  >
                    {m.id === "olympics" ? (
                      <OlympicRings className="h-4 w-7" inverse={!on} />
                    ) : (
                      <span className="h-2 w-2 rounded-full" style={{ background: on ? "#15181c" : m.accent }} />
                    )}
                    {m.name}
                    {m.coinMult > 1 && (
                      <span className={`font-pixel text-[7px] ${on ? "text-ink/70" : "text-amber"}`}>x{m.coinMult}</span>
                    )}
                  </button>
                );
              })}
            </div>

            <GameStage
              canvasRef={canvasRef}
              snap={snap}
              onPress={press}
              onRelease={releasePress}
              onFire={fire}
              onDuckDown={duckDown}
              onDuckUp={duckUp}
              onRestart={restart}
            />

            <RunReport report={report} phase={snap.phase} />

            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-white/10 bg-white/[0.028] px-4 py-3">
              <div className="flex items-center gap-2.5">
                <span className="font-pixel text-[8px] tracking-[0.14em] text-paper/35">STATE</span>
                <span
                  className={`font-display text-[13px] font-bold tracking-wide uppercase ${
                    snap.phase === "running"
                      ? "text-live"
                      : snap.phase === "over"
                        ? "text-rust"
                        : snap.phase === "paused"
                          ? "text-amber"
                          : "text-paper/60"
                  }`}
                >
                  {snap.phase === "ready" ? "idle" : snap.phase}
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="font-pixel text-[8px] tracking-[0.14em] text-paper/35">MILESTONE</span>
                <span className="font-display text-[13px] font-bold text-paper/80 tabular-nums">
                  {snap.milestone * 100}
                </span>
              </div>
              <div className="font-body text-[11.5px] text-paper/40 sm:ml-auto">
                {olympic ? (
                  "Olympic Stadium theme / automatically applied"
                ) : mode.arcade ? (
                  <>
                    boxes opened <span className="text-paper/75 tabular-nums">{snap.boxes}</span> · pterodactyls zapped{" "}
                    <span className="text-paper/75 tabular-nums">{snap.zaps}</span>
                  </>
                ) : mode.pteroFrom < 1e8 ? (
                  <>
                    pterodactyls from <span className="text-paper/75 tabular-nums">{mode.pteroFrom}</span> pts
                  </>
                ) : (
                  "no pterodactyls in this mode"
                )}
              </div>
            </div>

            <Hub
              save={save}
              activeMode={snap.mode}
              onMode={selectMode}
              onClaimQuest={onClaimQuest}
              onClaimBonus={onClaimBonus}
              onClaimChallenge={onClaimChallenge}
              onBuy={onBuy}
              onEquip={onEquip}
            />
          </div>

          <SidePanel snap={snap} stats={save.stats} />
        </div>

        {/* notes */}
        <section className="mt-16 sm:mt-20">
          <div className="reveal mb-6 flex items-end justify-between gap-6 border-b border-white/10 pb-4">
            <h2 className="font-display text-[clamp(1.6rem,3.6vw,2.6rem)] leading-none font-extrabold tracking-[-0.035em]">
              Under the hood
            </h2>
            <p className="hidden max-w-[38ch] font-body text-[12.5px] leading-relaxed text-paper/40 sm:block">
              Numbers lifted straight out of the engine. Tune them and the whole feel of the run changes.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-6">
            {NOTES.map((n, i) => (
              <article
                key={n.title}
                style={{ transitionDelay: `${i * 70}ms` }}
                className={`reveal group relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.028] p-5 transition-colors duration-300 hover:border-volt/45 hover:bg-volt/[0.07] ${n.span}`}
              >
                <div
                  aria-hidden
                  className="absolute -right-6 -bottom-10 font-display text-[110px] leading-none font-extrabold text-white/[0.035] transition-transform duration-500 group-hover:scale-110"
                >
                  {i + 1}
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-display text-[38px] leading-none font-extrabold tracking-[-0.03em] text-paper tabular-nums">
                    {n.big}
                  </span>
                  <span className="font-pixel text-[8.5px] text-amber/80">{n.unit}</span>
                </div>
                <h3 className="mt-3 font-display text-[15px] font-bold tracking-tight text-paper/90">{n.title}</h3>
                <p className="mt-1.5 max-w-[46ch] font-body text-[12.5px] leading-relaxed text-paper/45">{n.body}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-black/25">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-6 gap-y-3 px-4 py-7 sm:px-5 lg:px-8">
          <SpriteTile map={DINO_RUN_A} scale={2} color="#2f363e" className="opacity-70" />
          <div className="min-w-0">
            <div className="font-display text-[13px] font-bold text-paper/70">Built with the Canvas 2D API</div>
            <div className="mt-1 font-body text-[11.5px] text-paper/35">
              Sprites typed by hand · audio synthesised with WebAudio · progress kept in localStorage
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              window.scrollTo({ top: 0, behavior: "smooth" });
              gameRef.current?.press("pointer");
            }}
            className="rounded-lg border border-white/14 bg-white/[0.05] px-4 py-2.5 font-pixel text-[9px] tracking-[0.12em] text-paper/80 transition hover:-translate-y-0.5 hover:border-amber/50 hover:bg-amber/12 hover:text-amber sm:ml-auto"
          >
            PLAY AGAIN ↑
          </button>
        </div>
      </footer>

      <Toasts toasts={toasts} />
    </div>
  );
}
