import { type RefObject, useEffect, useRef, useState } from "react";
import type { Snapshot } from "../game/engine";
import { MODES, OLYMPIC_EVENTS, OLYMPIC_LIST, POWERS } from "../game/content";
import { DINO_IDLE, MYSTERY_BOX, POWER_ICONS, PTERO_UP, TORCH } from "../game/sprites";
import { OlympicRings } from "./OlympicIdentity";
import { CoinGlyph, SpriteTile } from "./SpriteTile";
import { IconRestart, IconSignalOff } from "./icons";

type Props = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  snap: Snapshot;
  onPress: () => void;
  onRelease: () => void;
  onFire: () => void;
  onDuckDown: () => void;
  onDuckUp: () => void;
  onRestart: () => void;
};

const pad = (n: number) => String(Math.floor(n)).padStart(5, "0");

export function GameStage({ canvasRef, snap, onPress, onRelease, onFire, onDuckDown, onDuckUp, onRestart }: Props) {
  const [spin, setSpin] = useState(false);
  const eventListRef = useRef<HTMLDivElement>(null);
  const mode = MODES[snap.mode];
  const olympic = snap.mode === "olympics";
  const event = snap.sport ? OLYMPIC_EVENTS[snap.sport] : null;
  const arcade = snap.mode === "arcade";
  // timers freeze when a run ends, so only show effects while the run is live
  const liveEffects = snap.phase === "running" || snap.phase === "paused" ? snap.effects : [];
  const active = new Set(liveEffects.map((e) => e.id));
  const armed = arcade && active.has("blaster") && snap.phase === "running";
  const reversed = arcade && active.has("reverse") && snap.phase === "running";
  useEffect(() => {
    const list = eventListRef.current;
    const active = list?.querySelector<HTMLElement>('[aria-current="step"]');
    if (!list || !active) return;
    const item = active.getBoundingClientRect();
    const viewport = list.getBoundingClientRect();
    list.scrollLeft += item.left - viewport.left - (viewport.width - item.width) / 2;
  }, [snap.sport]);

  const reload = () => {
    setSpin(true);
    window.setTimeout(() => setSpin(false), 620);
    onRestart();
  };

  return (
    <div className={`game-stage relative ${olympic ? "game-stage--olympic" : ""}`} data-testid="game-stage">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-10 -top-14 bottom-0 -z-10 opacity-70 blur-3xl"
        style={{
          background: `radial-gradient(60% 60% at 50% 40%, ${mode.accent}29, transparent 70%)`,
          transition: "background 900ms linear",
        }}
      />

      <div className="game-shell overflow-hidden rounded-[14px] border border-white/12 bg-[#20242b] shadow-[0_36px_90px_-30px_rgba(0,0,0,0.9)]">
        {olympic && (
          <div className="olympic-masthead">
            <div className="olympic-masthead-brand">
              <OlympicRings className="olympic-masthead-rings" />
              <div>
                <strong>THE SUMMER GAMES</strong>
                <span>TOKYO 2020 / DINO EDITION</span>
              </div>
            </div>
            <button className="olympic-restart" type="button" onClick={reload} aria-label="Restart Olympic run">
              <IconRestart className={`h-4 w-4 ${spin ? "animate-reload" : ""}`} />
              <span>NEW RUN</span>
            </button>
          </div>
        )}
        {/* tab strip */}
        <div className={`${olympic ? "hidden" : "flex"} items-end gap-2 bg-[#191c22] px-3 pt-2.5`}>
          <div className="flex gap-1.5 pr-1 pb-3 sm:pr-2">
            <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
            <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
            <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          </div>
          <div className="relative flex max-w-[240px] min-w-0 flex-1 items-center gap-2 rounded-t-lg bg-[#20242b] px-3 py-2 text-[12px] text-paper/80">
            <SpriteTile map={DINO_IDLE} scale={1} color="#ffc53d" className="shrink-0" />
            <span className="truncate font-body">No internet</span>
          </div>
          <div className="hidden items-center gap-2 rounded-t-lg px-3 py-2 text-[12px] text-paper/30 md:flex">
            <SpriteTile map={PTERO_UP} scale={1} color="#6b7280" className="shrink-0 opacity-60" />
            <span className="truncate">chrome://dino/records</span>
          </div>
        </div>

        {/* toolbar */}
        <div className={`${olympic ? "hidden" : "flex"} items-center gap-1.5 px-2.5 py-2 sm:gap-2 sm:px-3`}>
          <div className="hidden items-center gap-1 text-paper/45 sm:flex">
            {["M15 5l-7 7 7 7", "M9 5l7 7-7 7"].map((d, i) => (
              <span key={i} className="grid h-7 w-7 place-items-center">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d={d} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            ))}
          </div>
          <button
            type="button"
            onClick={reload}
            aria-label="Reload and restart run"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-paper/55 transition hover:bg-white/10 hover:text-paper sm:h-7 sm:w-7"
          >
            <IconRestart className={`h-4 w-4 ${spin ? "animate-reload" : ""}`} />
          </button>

          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-[#15181d] px-3 py-1.5 ring-1 ring-white/8 ring-inset">
            <IconSignalOff className="h-3.5 w-3.5 shrink-0 text-rust" />
            <span className="truncate font-body text-[12px] text-paper/55">
              <span className="text-paper/30">https://</span>
              <span className="hidden sm:inline">www.</span>the-internet.com
              <span className="text-paper/30">/</span>
              <span className="text-paper/80">{mode.id}</span>
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <CoinGlyph scale={1} />
            <span className="font-pixel text-[10px] text-amber tabular-nums">{snap.runCoins}</span>
          </div>
        </div>

        {/* page content */}
        <div key="play-content" className="game-content border-t border-black/40 bg-paper">
          <div className="venue-strip flex items-center justify-between gap-3 border-b border-ink/8 px-3 py-2 sm:px-4">
            <div className="flex min-w-0 items-center gap-2">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className={`relative inline-flex h-2 w-2 rounded-full ${olympic ? "bg-live" : "bg-rust"}`} />
              </span>
              <span className="truncate font-body text-[10.5px] tracking-[0.16em] text-ink/55 uppercase sm:text-[11px] sm:tracking-[0.18em]">
                {olympic ? "OLYMPIC STADIUM" : "This site can't be reached"}
              </span>
            </div>
            <span className="hidden font-pixel text-[9px] text-ink/45 md:block">
              {olympic ? (event ? event.name.toUpperCase() : "THE TORCH RELAY") : "ERR_INTERNET_DISCONNECTED"}
            </span>
          </div>

          <div
            className={`${olympic ? "olympic-playfield" : "scanlines"} relative w-full cursor-pointer touch-manipulation select-none`}
            role="application"
            aria-label={event?.dive ? "Olympic swimming. Tap or press space to dive." : "Dino runner play field. Tap or press space to jump."}
            tabIndex={0}
            onContextMenu={(e) => e.preventDefault()}
            onPointerDown={(e) => {
              e.preventDefault();
              onPress();
            }}
            onPointerUp={onRelease}
            onPointerCancel={onRelease}
          >
            <canvas ref={canvasRef} className="block h-auto w-full outline-none" data-theme={olympic ? "olympic-stadium" : "equipped"} />
          </div>

          {/* touch pads */}
          <div
            className={`touch-pads grid ${armed ? "grid-cols-3" : "grid-cols-2"} gap-px border-t border-ink/10 bg-ink/10 select-none lg:hidden`}
          >
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                onPress();
              }}
              onPointerUp={onRelease}
              onPointerLeave={onRelease}
              onPointerCancel={onRelease}
              onContextMenu={(e) => e.preventDefault()}
              aria-label={snap.mode === "olympics" && snap.sport === "swimming" ? "Dive under the buoys" : "Jump"}
              className={`touch-none py-5 font-pixel text-[11px] tracking-[0.12em] transition active:bg-amber ${
                reversed ? "bg-[#f7d9d4] text-rust" : "bg-paper text-ink/75"
              }`}
            >
              {snap.mode === "olympics" && snap.sport === "swimming" ? "▼ DIVE" : reversed ? "▲ JUMP ⇄" : "▲ JUMP"}
            </button>
            {armed && (
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  onFire();
                }}
                onContextMenu={(e) => e.preventDefault()}
                aria-label="Fire laser"
                className="touch-none bg-[#ffe0e8] py-5 font-pixel text-[11px] tracking-[0.12em] text-[#c4123f] transition active:bg-[#ff3d6e] active:text-white"
              >
                ✦ FIRE
              </button>
            )}
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                onDuckDown();
              }}
              onPointerUp={onDuckUp}
              onPointerLeave={onDuckUp}
              onPointerCancel={onDuckUp}
              onContextMenu={(e) => e.preventDefault()}
              aria-label={snap.mode === "olympics" && snap.sport ? "Ducking is disabled during Olympic events" : "Duck"}
              disabled={snap.mode === "olympics" && Boolean(snap.sport)}
              className={`touch-none py-5 font-pixel text-[11px] tracking-[0.12em] transition active:bg-amber disabled:text-ink/30 ${
                reversed ? "bg-[#f7d9d4] text-rust" : "bg-paper text-ink/75"
              }`}
            >
              {snap.mode === "olympics" && snap.sport ? "NO DUCK" : reversed ? "▼ DUCK ⇄" : "▼ DUCK"}
            </button>
          </div>
        </div>

        {/* olympic event strip */}
        {olympic && (
          <div className="olympic-event-strip" aria-label="Olympic events">
            <div ref={eventListRef} className="olympic-event-list no-scrollbar">
            {OLYMPIC_LIST.map((e, index) => {
              const on = snap.sport === e.id;
              return (
                <span
                  key={e.id}
                  className={`olympic-event ${on ? "is-active" : ""}`}
                  aria-current={on ? "step" : undefined}
                >
                  <small>{String(index + 1).padStart(2, "0")}</small>
                  {e.name}
                </span>
              );
            })}
            </div>
            <span className="olympic-torch-count">
              <SpriteTile map={TORCH} scale={1} color="#c9954a" accent="#ffb23d" />
              <span className="tabular-nums">{snap.torches}</span>
              <span>torches</span>
            </span>
          </div>
        )}

        {/* arcade power-up strip */}
        {arcade && (
          <div
            className="flex min-h-[52px] items-center gap-2 border-t border-white/8 px-3 py-2 sm:px-4"
            aria-label="Active power-ups"
            data-testid="arcade-strip"
          >
            <SpriteTile map={MYSTERY_BOX} scale={2} color="#1b1f24" accent="#ff4fb8" className="shrink-0" />
            {liveEffects.length === 0 ? (
              <span className="font-body text-[11.5px] text-paper/45">
                Grab a <span className="text-[#ff4fb8]">?</span> box. Most are power-ups, some are curses.
              </span>
            ) : (
              <div className="no-scrollbar flex min-w-0 flex-1 gap-2 overflow-x-auto">
                {liveEffects.map((e) => {
                  const def = POWERS[e.id];
                  return (
                    <span
                      key={e.id}
                      className={`flex shrink-0 items-center gap-2 rounded-md px-2 py-1.5 ${
                        def.good ? "bg-white/[0.06]" : "bg-rust/15 ring-1 ring-rust/40 ring-inset"
                      }`}
                    >
                      <SpriteTile map={POWER_ICONS[e.id]} scale={2} color={def.color} accent="#ffffff" />
                      <span className="flex flex-col gap-1">
                        <span className={`font-body text-[11px] leading-none font-medium ${def.good ? "text-paper/85" : "text-rust"}`}>
                          {def.name}
                        </span>
                        <span className="h-1 w-14 overflow-hidden rounded-full bg-white/10">
                          <span
                            className="block h-full rounded-full"
                            style={{ width: `${(e.left / e.total) * 100}%`, background: def.color }}
                          />
                        </span>
                      </span>
                      <span className="font-pixel text-[8px] text-paper/50 tabular-nums">{Math.ceil(e.left / 60)}s</span>
                    </span>
                  );
                })}
              </div>
            )}
            <span className="ml-auto hidden shrink-0 font-body text-[11px] text-paper/40 sm:block">
              <span className="text-paper/75 tabular-nums">{snap.boxes}</span> boxes
            </span>
          </div>
        )}

        {/* status bar */}
        <div className="stage-status flex flex-wrap items-center gap-x-4 gap-y-1.5 px-3 py-2.5 text-[11px] text-paper/45 sm:gap-x-5 sm:px-4">
          <span className="font-pixel text-[9px] text-paper/70">{pad(snap.score)}</span>
          <span className="font-body">
            <span className="text-paper/35">dist</span>{" "}
            <span className="text-paper/85 tabular-nums">{Math.floor(snap.distance / 26).toLocaleString()} m</span>
          </span>
          <span className="font-body">
            <span className="text-paper/35">speed</span>{" "}
            <span className="text-paper/85 tabular-nums">{snap.speed.toFixed(1)}</span>
          </span>
          {snap.timeLeft !== null && (
            <span className="font-body">
              <span className="text-paper/35">clock</span>{" "}
              <span className="text-paper/85 tabular-nums">{snap.timeLeft}s</span>
            </span>
          )}
          {snap.mode === "olympics" && (
            <span className="font-body">
              <span className="text-paper/35">event</span>{" "}
              <span className="text-paper/85">{snap.sport ? OLYMPIC_EVENTS[snap.sport].name : "torch hunt"}</span>
            </span>
          )}
          <span className="ml-auto flex items-center gap-1.5 font-body">
            <span className={`h-1.5 w-1.5 rounded-full ${snap.night > 0.5 ? "bg-amber" : "bg-live"}`} />
            {snap.night > 0.5 ? "night" : "day"}
          </span>
        </div>
      </div>
    </div>
  );
}
