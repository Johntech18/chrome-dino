import type { Phase } from "../game/engine";
import { MODES } from "../game/content";
import type { RunReport as Report } from "../game/save";
import { CoinGlyph } from "./SpriteTile";
import { IconCheck, IconTrophy } from "./icons";

function Stat({ k, v }: { k: string; v: string | number }) {
  return (
    <div className="min-w-0">
      <div className="font-pixel text-[7px] tracking-[0.14em] text-paper/35">{k}</div>
      <div className="mt-1.5 truncate font-display text-[22px] leading-none font-extrabold text-paper tabular-nums">
        {v}
      </div>
    </div>
  );
}

export function RunReport({ report, phase }: { report: Report | null; phase: Phase }) {
  const show = report && phase === "over" && report.run.reason !== "abandon";

  if (!show) {
    return (
      <div className="mt-4 rounded-xl border border-dashed border-white/10 px-4 py-3 font-body text-[12px] text-paper/35">
        Finish a run to see your report. Coins, quest progress and records land here.
      </div>
    );
  }

  const { run, mult } = report;
  const mode = MODES[run.mode];

  return (
    <section
      key={`${run.score}-${run.pickups}-${run.seconds}-${run.jumps}`}
      aria-live="polite"
      className="animate-rise mt-4 overflow-hidden rounded-xl border border-white/12 bg-white/[0.04]"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/8 px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <span className="h-2 w-2 rounded-full" style={{ background: mode.accent }} />
          <span className="font-pixel text-[8.5px] tracking-[0.14em] text-paper/70">RUN REPORT</span>
          <span className="font-body text-[11.5px] text-paper/40">
            {mode.name} · {run.reason === "time" ? "time up" : "crashed"}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {run.medal && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f2b01e] px-2.5 py-1 font-pixel text-[7.5px] text-ink">
              GOLD MEDAL
            </span>
          )}
          {report.newBest && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber px-2.5 py-1 font-pixel text-[7.5px] text-ink">
              <IconTrophy className="h-3 w-3" /> NEW RECORD
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-4 px-4 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
          <Stat k="SCORE" v={String(run.score).padStart(5, "0")} />
          <Stat k="DISTANCE" v={`${run.distanceM} m`} />
          <Stat k="PICKUPS" v={run.pickups} />
          {run.mode === "olympics" ? (
            <Stat k="TORCHES" v={run.torches} />
          ) : run.mode === "arcade" ? (
            <Stat k="BOXES / ZAPS" v={`${run.boxes ?? 0} / ${run.zaps ?? 0}`} />
          ) : (
            <Stat k="JUMPS" v={run.jumps} />
          )}
        </div>

        <div className="rounded-lg bg-black/25 px-4 py-3 ring-1 ring-white/8">
          <div className="flex items-center gap-2">
            <CoinGlyph scale={2} />
            <span className="font-display text-[26px] leading-none font-extrabold text-amber tabular-nums">
              +{report.total}
            </span>
          </div>
          <div className="mt-1.5 font-body text-[10.5px] leading-snug text-paper/45 tabular-nums">
            {run.pickups} pickups{mult > 1 ? ` x${mult}` : ""}
            {report.bonus > 0 ? ` + ${report.bonus} score bonus` : ""}
            {report.torchBonus > 0 ? ` + ${report.torchBonus} torch bonus` : ""}
            {report.medalBonus > 0 ? ` + ${report.medalBonus} medal bonus` : ""}
            {!report.counted ? " (practice mode)" : ""}
          </div>
        </div>
      </div>

      {(report.questsDone.length > 0 || report.challengesDone.length > 0) && (
        <div className="flex flex-col gap-1.5 border-t border-white/8 px-4 py-3">
          {report.questsDone.map((q) => (
            <div key={q} className="flex items-center gap-2 font-body text-[12px] text-live">
              <IconCheck className="h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0">
                Quest ready to claim: <span className="text-paper/85">{q}</span>
              </span>
            </div>
          ))}
          {report.challengesDone.map((c) => (
            <div key={c} className="flex items-center gap-2 font-body text-[12px] text-amber">
              <IconTrophy className="h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0">
                Challenge complete: <span className="text-paper/85">{c}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
