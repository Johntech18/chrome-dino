import type { SportId, ThemeDef } from "./content";

export const OLYMPIC_COLORS = {
  blue: "#0085c7",
  yellow: "#f4bd46",
  black: "#243449",
  green: "#17946c",
  red: "#df4755",
  navy: "#173350",
  paper: "#f5f3eb",
} as const;

export const OLYMPIC_THEME: ThemeDef = {
  id: "olympic-stadium",
  name: "Olympic Stadium",
  price: 0,
  day: { bg: OLYMPIC_COLORS.paper, fg: OLYMPIC_COLORS.navy },
  night: { bg: "#192d49", fg: "#edf2ee" },
};

const colors = Object.values(OLYMPIC_COLORS).slice(0, 5);
const wrap = (x: number, width: number) => ((x % width) + width) % width;

type Scene = {
  width: number;
  height: number;
  ground: number;
  offset: number;
  frame: number;
  night: number;
  sport: SportId | null;
  ready: boolean;
};

export function drawOlympicRings(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale = 1,
  dark = false,
) {
  const rings: [number, number, string][] = [
    [-19, 0, OLYMPIC_COLORS.blue],
    [0, 0, dark ? "#eef2ed" : OLYMPIC_COLORS.black],
    [19, 0, OLYMPIC_COLORS.red],
    [-9.5, 9, OLYMPIC_COLORS.yellow],
    [9.5, 9, OLYMPIC_COLORS.green],
  ];
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.lineWidth = 2 * scale;
  for (const [dx, dy, color] of rings) {
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.arc(x + dx * scale, y + dy * scale, 9 * scale, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function flag(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number, color: string) {
  ctx.fillStyle = "#8395a2";
  ctx.fillRect(x, y, 2, 34);
  // Columns give the flag a gentle pixel-art ripple without moving the pole.
  for (let i = 0; i < 7; i++) {
    const dy = Math.round(Math.sin(frame / 24 + i * 0.65) * 2);
    ctx.fillStyle = color;
    ctx.fillRect(x + 2 + i * 3, y + dy, 3, 12);
    ctx.fillStyle = "#ffffff";
    ctx.globalAlpha = 0.24;
    ctx.fillRect(x + 2 + i * 3, y + dy + 4, 3, 3);
    ctx.globalAlpha = 1;
  }
}

function cauldron(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number) {
  ctx.fillStyle = "#738594";
  ctx.fillRect(x + 9, y + 19, 8, 25);
  ctx.fillRect(x + 3, y + 41, 20, 4);
  ctx.fillStyle = OLYMPIC_COLORS.navy;
  ctx.fillRect(x, y + 12, 26, 7);
  ctx.fillRect(x + 4, y + 19, 18, 4);
  const phase = Math.floor(frame / 12) % 3;
  ctx.fillStyle = "#e97e3e";
  ctx.fillRect(x + 5, y + 1, 16, 11);
  ctx.fillRect(x + 8, y - 7 - phase * 2, 8, 11);
  ctx.fillRect(x + 3, y - phase, 4, 9);
  ctx.fillStyle = OLYMPIC_COLORS.yellow;
  ctx.fillRect(x + 9, y + 4, 9, 8);
  ctx.fillRect(x + 12, y - 4 + phase, 4, 9);
  ctx.fillStyle = "#fff1c3";
  ctx.fillRect(x + 12, y + 7, 4, 5);
}

export function drawOlympicBackdrop(ctx: CanvasRenderingContext2D, scene: Scene) {
  const { width, ground, frame, night, sport, offset } = scene;
  const dark = night > 0.5;
  const surf = sport === "surfing";
  const pool = sport === "swimming";
  ctx.save();
  ctx.globalAlpha = 1;

  // Keep the sky quiet for scores and prompts; scenery stays below the HUD.
  if (surf) {
    ctx.fillStyle = dark ? "#526784" : "#f2d18d";
    ctx.fillRect(width - 130, 92, 24, 24);
    ctx.fillRect(width - 126, 88, 16, 32);
    ctx.fillStyle = dark ? "#254b68" : "#b7dae0";
    ctx.fillRect(0, 152, width, 58);
    for (let i = 0; i < 13; i++) {
      const x = Math.round(wrap(i * 92 - offset * 0.25, width + 92) - 46);
      ctx.fillStyle = dark ? "#58788d" : "#e5f3ed";
      ctx.fillRect(x, 165 + (i % 3) * 14, 30, 2);
    }
  } else {
    const standTop = 154;
    ctx.fillStyle = dark ? "#304760" : "#d9e0df";
    ctx.fillRect(0, standTop - 4, width, 42);
    ctx.fillStyle = dark ? "#41576b" : "#c9d3d5";
    for (let row = 0; row < 3; row++) {
      ctx.fillRect(0, standTop + row * 12 + 8, width, 3);
      for (let col = 0; col < Math.ceil(width / 14); col++) {
        if ((col + row * 3) % 7 === 0) continue;
        const x = col * 14 + (row % 2) * 6;
        const y = standTop + row * 12;
        ctx.fillStyle = dark ? "#76848a" : "#ead5ba";
        ctx.fillRect(x + 2, y, 3, 3);
        ctx.fillStyle = colors[(col * 3 + row) % colors.length];
        ctx.globalAlpha = dark ? 0.55 : 0.52;
        ctx.fillRect(x, y + 3, 7, 5);
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = dark ? "#41576b" : "#c9d3d5";
    }
    // Aisles separate the crowd into stadium sections.
    ctx.fillStyle = dark ? "#263b54" : "#e7e9e3";
    for (let x = 108; x < width; x += 194) ctx.fillRect(x, standTop - 4, 12, 42);
  }

  const flagColors = [OLYMPIC_COLORS.blue, OLYMPIC_COLORS.red, OLYMPIC_COLORS.green];
  [42, 145, width - 36].forEach((x, i) => flag(ctx, x, 119, frame + i * 24, flagColors[i]));
  cauldron(ctx, width - 62, 143, frame);

  // The venue wall carries the same five-color identity in every event.
  ctx.fillStyle = dark ? "#253d59" : "#fffdf5";
  ctx.fillRect(0, 190, width, 24);
  ctx.fillStyle = dark ? "#465972" : "#d7dcd5";
  ctx.fillRect(0, 189, width, 2);
  const blockWidth = width / 5;
  colors.forEach((color, i) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.floor(i * blockWidth), 212, Math.ceil(blockWidth), 3);
  });
  drawOlympicRings(ctx, width * 0.48, 198, 0.35, dark);
  ctx.fillStyle = dark ? "#c3cdd1" : "#526674";
  ctx.font = "bold 8px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("TOKYO 2020", width * 0.27, 203);
  ctx.fillText("FASTER. HIGHER. STRONGER.", width * 0.72, 203);

  const surfaces: Partial<Record<SportId, [string, string]>> = {
    swimming: ["#98cedb", "#285773"],
    surfing: ["#9bcfd9", "#2a5673"],
    equestrian: ["#cedcbb", "#3c544b"],
    gymnastics: ["#ccdbdf", "#3e566d"],
    skateboarding: ["#d4dad7", "#4a5969"],
  };
  const surface = (sport && surfaces[sport]) || ["#dca18a", "#78514e"];
  ctx.fillStyle = surface[dark ? 1 : 0];
  ctx.fillRect(0, 215, width, ground - 215);
  ctx.fillStyle = dark ? "#7d8c95" : "#f8efdd";
  ctx.fillRect(0, 221, width, 2);
  if (pool || surf) {
    ctx.fillStyle = dark ? "#7ca6b9" : "#e4f3ed";
    for (let x = -50; x < width; x += 46) {
      ctx.fillRect(Math.round(x - wrap(offset * 0.5, 46)), 232, 23, 2);
    }
  }
  ctx.restore();
}

export function drawOlympicGround(ctx: CanvasRenderingContext2D, scene: Scene) {
  const { width, height, ground, offset, night, sport, ready } = scene;
  const dark = night > 0.5;
  const water = sport === "swimming" || sport === "surfing";
  const surfaces: Partial<Record<SportId, [string, string]>> = {
    swimming: ["#78b5ca", "#244961"],
    surfing: ["#79b9cc", "#244961"],
    equestrian: ["#b4c99a", "#324c40"],
    gymnastics: ["#6e9bbd", "#2b4766"],
    skateboarding: ["#aebbbd", "#394b5d"],
  };
  const surface = (sport && surfaces[sport]) || ["#c77a63", "#644343"];
  ctx.save();
  ctx.fillStyle = surface[dark ? 1 : 0];
  ctx.fillRect(0, ground, width, height - ground);
  ctx.fillStyle = dark ? "#bbc5c7" : "#fff5e5";
  ctx.fillRect(0, ground, width, 2);
  if (sport === "equestrian") {
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = dark ? "#8fba87" : "#597c42";
    for (let x = -50; x < width + 50; x += 42) {
      const px = Math.round(x - wrap(offset, 42));
      const y = ground + 15 + (Math.abs(x) % 19);
      ctx.fillRect(px, y, 2, 5);
      ctx.fillRect(px + 4, y + 2, 2, 3);
    }
    ctx.restore();
    return;
  }
  if (sport === "gymnastics" || sport === "skateboarding") {
    ctx.globalAlpha = sport === "gymnastics" ? 0.7 : 0.3;
    ctx.fillRect(0, ground + 38, width, 2);
    const scroll = wrap(offset, 220);
    for (let x = -220; x < width + 220; x += 220) {
      ctx.fillRect(Math.round(x - scroll), ground + 2, 2, height - ground);
    }
    ctx.restore();
    return;
  }
  ctx.globalAlpha = 0.6;
  ctx.fillRect(0, ground + 27, width, 2);
  const spacing = water ? 56 : 140;
  const scroll = ready ? 0 : wrap(offset, spacing);
  for (let x = -spacing; x < width + spacing; x += spacing) {
    const px = Math.round(x - scroll);
    ctx.fillRect(px, ground + (water ? 16 : 42), water ? 22 : 30, 2);
    if (!water) ctx.fillRect(px + 30, ground + 28, 2, 24);
  }
  if (ready && !sport) {
    ctx.globalAlpha = 0.9;
    for (let y = ground + 3; y < height; y += 6) {
      ctx.fillRect(28 + ((y - ground) % 12 < 6 ? 0 : 6), y, 6, 6);
    }
  }
  ctx.restore();
}