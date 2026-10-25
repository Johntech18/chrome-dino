export type Toast = { id: number; text: string; tone: "gold" | "good" | "bad" | "info" };

const tones: Record<Toast["tone"], string> = {
  gold: "border-amber/50 bg-[#2a2210] text-amber",
  good: "border-live/50 bg-[#10241b] text-live",
  bad: "border-rust/50 bg-[#2a1511] text-rust",
  info: "border-white/20 bg-[#1b1f26] text-paper",
};

export function Toasts({ toasts }: { toasts: Toast[] }) {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 flex flex-col items-center gap-2 px-4"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`animate-toast max-w-full rounded-lg border px-4 py-2.5 font-body text-[13px] font-medium shadow-[0_14px_40px_-12px_rgba(0,0,0,0.8)] ${tones[t.tone]}`}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}
