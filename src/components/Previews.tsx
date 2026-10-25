import { useEffect, useRef } from "react";
import type { SkinDef, ThemeDef } from "../game/content";
import { CACTUS_SMALL, CLOUD, DINO_IDLE, HATS, MOON, PTERO_UP, raster } from "../game/sprites";

function useCanvas(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void, deps: unknown[]) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = w * dpr;
    cv.height = h * dpr;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    draw(ctx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

const W = 168;
const H = 84;

/** The skin standing on a miniature ground line, drawn in the active theme. */
export function SkinPreview({ skin, theme }: { skin: SkinDef; theme: ThemeDef }) {
  const ref = useCanvas(
    W,
    H,
    (ctx) => {
      ctx.fillStyle = theme.day.bg;
      ctx.fillRect(0, 0, W, H);
      const fg = theme.day.fg;
      ctx.globalAlpha = 0.35;
      ctx.drawImage(raster(CLOUD, fg, 2), 96, 10);
      ctx.drawImage(raster(CLOUD, fg, 1), 20, 22);
      ctx.globalAlpha = 1;
      ctx.fillStyle = fg;
      ctx.fillRect(0, 70, W, 2);
      for (let i = 0; i < 12; i++) ctx.fillRect(8 + i * 14, 76 + (i % 3) * 2, 4 + (i % 4), 1);

      const color = skin.color ?? fg;
      const sc = 2;
      const dx = 56;
      const dy = 70 - DINO_IDLE.h * sc;
      ctx.drawImage(raster(DINO_IDLE, color, sc), dx, dy);
      if (skin.hat) {
        const hat = HATS[skin.hat];
        ctx.drawImage(
          raster(hat, skin.hatColor ?? color, sc, skin.accent),
          Math.round(dx + 16.5 * sc - (hat.w * sc) / 2),
          dy - hat.h * sc + sc,
        );
      }
      // little trail hint
      ctx.fillStyle = skin.trail === "dust" ? fg : skin.accent;
      ctx.globalAlpha = 0.55;
      for (let i = 0; i < 4; i++) ctx.fillRect(dx - 8 - i * 7, 50 + ((i * 7) % 18), 3, 3);
      ctx.globalAlpha = 1;
    },
    [skin, theme],
  );
  return <canvas ref={ref} style={{ width: W, height: H }} className="block h-auto w-full rounded-md" />;
}

/** Day and night halves of a theme side by side. */
export function ThemePreview({ theme }: { theme: ThemeDef }) {
  const ref = useCanvas(
    W,
    H,
    (ctx) => {
      const half = W / 2;
      const panes = [
        { x: 0, p: theme.day, night: false },
        { x: half, p: theme.night, night: true },
      ];
      for (const pane of panes) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(pane.x, 0, half, H);
        ctx.clip();
        ctx.fillStyle = pane.p.bg;
        ctx.fillRect(pane.x, 0, half, H);
        ctx.fillStyle = pane.p.fg;
        ctx.fillRect(pane.x, 70, half, 2);
        for (let i = 0; i < 6; i++) ctx.fillRect(pane.x + 6 + i * 14, 76 + (i % 3) * 2, 4 + (i % 4), 1);
        if (pane.night) {
          ctx.globalAlpha = 0.9;
          ctx.drawImage(raster(MOON, pane.p.fg, 2), pane.x + 50, 8);
          ctx.globalAlpha = 0.8;
          [[8, 12], [30, 28], [18, 44]].forEach(([sx, sy]) => ctx.fillRect(pane.x + sx, sy, 2, 2));
          ctx.globalAlpha = 1;
          ctx.drawImage(raster(PTERO_UP, pane.p.fg, 1), pane.x + 8, 20);
          ctx.drawImage(raster(DINO_IDLE, pane.p.fg, 1), pane.x + 30, 70 - DINO_IDLE.h);
        } else {
          ctx.globalAlpha = 0.35;
          ctx.drawImage(raster(CLOUD, pane.p.fg, 2), pane.x + 30, 10);
          ctx.globalAlpha = 1;
          ctx.drawImage(raster(CACTUS_SMALL, pane.p.fg, 2), pane.x + 52, 70 - CACTUS_SMALL.h * 2);
          ctx.drawImage(raster(DINO_IDLE, pane.p.fg, 1), pane.x + 12, 70 - DINO_IDLE.h);
        }
        ctx.restore();
      }
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.fillRect(half - 0.5, 0, 1, H);
    },
    [theme],
  );
  return <canvas ref={ref} style={{ width: W, height: H }} className="block h-auto w-full rounded-md" />;
}
