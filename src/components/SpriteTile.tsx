import { useEffect, useRef } from "react";
import { COIN as COIN_MAP, type PixelMap, raster } from "../game/sprites";

type Props = {
  map: PixelMap;
  scale?: number;
  color?: string;
  accent?: string;
  className?: string;
  title?: string;
};

/** Renders a pixel map straight from the game's sprite atlas into a canvas. */
export function SpriteTile({ map, scale = 2, color = "#ededea", accent, className, title }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = map.w * scale * dpr;
    cv.height = map.h * scale * dpr;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.drawImage(raster(map, color, scale, accent), 0, 0);
  }, [map, scale, color, accent]);

  return (
    <canvas
      ref={ref}
      title={title}
      aria-label={title}
      role={title ? "img" : "presentation"}
      className={className}
      style={{ width: map.w * scale, height: map.h * scale, imageRendering: "pixelated" }}
    />
  );
}

/** The gold coin used across the UI. */
export function CoinGlyph({ scale = 2, className }: { scale?: number; className?: string }) {
  return <SpriteTile map={COIN_MAP} scale={scale} color="#8a5a00" accent="#ffc53d" className={className} />;
}
