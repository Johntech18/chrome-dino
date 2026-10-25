import { expect, test, type Page } from "@playwright/test";

/** Runs a headless engine scenario inside the real browser (real canvas, real modules). */
async function engine<T>(page: Page, fn: string): Promise<T> {
  await page.goto("/");
  return page.evaluate(async (body) => {
    const enginePath = "/src/game/engine.ts";
    const audioPath = "/src/game/sfx.ts";
    const { DinoGame } = await import(enginePath);
    const { sfx } = await import(audioPath);
    sfx.enabled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const make = (mode = "arcade"): any => {
      const g = new DinoGame(document.createElement("canvas"));
      g.resize(900);
      g.setMode(mode);
      g.press("pointer");
      g.release();
      for (let i = 0; i < 60; i++) g.step();
      g.obstacles = [];
      g.coins = [];
      g.mysteryBoxes = [];
      g.nextGap = 1e9;
      g.nextBox = 1e9;
      return g;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const apex = (g: any) => {
      g.press("key");
      let top = 0;
      for (let i = 0; i < 120; i++) {
        g.step();
        top = Math.max(top, 246 - g.dinoY);
        if (!g.airborne) break;
      }
      g.release();
      return Math.round(top);
    };
    const cactus = (x: number) => ({ kind: "large", x, y: 171, by: 171, w: 36, h: 75, anim: 0, scored: false });
    const ptero = (x: number, y = 158) => ({ kind: "ptero", x, y, by: y, w: 84, h: 69, anim: 0, scored: false });
    return new Function("make", "apex", "cactus", "ptero", `return (async () => { ${body} })()`)(make, apex, cactus, ptero);
  }, fn);
}

test("Arcade mode is listed and explains itself", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: /Arcade/ }).click();
  await expect(page.getByRole("tab", { name: /Arcade/ })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("arcade-strip")).toContainText("Grab a ? box");
  await expect(page.getByText("Mystery box guide", { exact: true })).toBeVisible();
  await expect(page.getByText("BLESSINGS", { exact: true })).toBeVisible();
  await expect(page.getByText("CURSES", { exact: true })).toBeVisible();
});

test("blessings: magnet, jetpack, blaster, turbo, shield, moon boots", async ({ page }) => {
  const r = await engine<Record<string, unknown>>(page, `
    const out = {};
    // magnet pulls a coin the rex could never reach from the ground
    let g = make(); g.coins = [{ x: 380, y: 120, spin: 0, taken: false }];
    for (let i = 0; i < 40; i++) g.step();
    out.noMagnet = g.runCoins;
    g = make(); g.applyPower("magnet"); g.coins = [{ x: 380, y: 120, spin: 0, taken: false }];
    for (let i = 0; i < 40; i++) g.step();
    out.magnet = g.runCoins;

    // jetpack: holding jump climbs to the ceiling and stays airborne
    g = make(); g.applyPower("jetpack"); g.press("key");
    for (let i = 0; i < 70; i++) g.step();
    out.jetAltitude = Math.round(246 - g.dinoY);
    out.jetAirborne = g.airborne;
    g.release(); for (let i = 0; i < 200; i++) g.step();
    out.jetLanded = !g.airborne;

    // blaster locks on to a mid pterodactyl and shoots it down
    g = make();
    out.fireWithout = g.fire();
    g.applyPower("blaster"); g.obstacles = [ptero(520)];
    const before = g.score;
    out.fired = g.fire();
    for (let i = 0; i < 40; i++) g.step();
    out.pteroLeft = g.obstacles.length; out.zaps = g.runZaps; out.zapBonus = g.bonus;
    out.scoreJump = g.score - before;
    // ...and a cactus
    g.fireCooldown = 0; g.obstacles = [cactus(500)]; g.fire();
    for (let i = 0; i < 40; i++) g.step();
    out.cactusLeft = g.obstacles.length;

    // turbo is faster and smashes through
    g = make(); const base = g.speed; g.applyPower("turbo"); g.step();
    out.turboRatio = +(g.speed / base).toFixed(2);
    g.obstacles = [cactus(80)]; g.step();
    out.turboAlive = g.phase; out.turboSmashed = g.obstacles.length;

    // shield absorbs one hit, then blocks a curse on a fresh shield
    g = make(); g.applyPower("shield"); g.obstacles = [cactus(80)]; g.step();
    out.shieldAlive = g.phase; out.shieldUsed = !g.has("shield");
    g.applyPower("shield"); g.applyPower("heavy");
    out.curseBlocked = !g.has("heavy") && !g.has("shield");

    // moon boots jump higher than normal
    out.normalApex = apex(make());
    g = make(); g.applyPower("moon"); out.moonApex = apex(g);
    return out;
  `);
  expect(r.noMagnet).toBe(0);
  expect(r.magnet).toBe(1);
  expect(r.jetAltitude as number).toBeGreaterThanOrEqual(108); // flight ceiling sits just under the HUD
  expect(r.jetAirborne).toBe(true);
  expect(r.jetLanded).toBe(true);
  expect(r.fireWithout).toBe(false);
  expect(r.fired).toBe(true);
  expect(r.pteroLeft).toBe(0);
  expect(r.zaps).toBe(1);
  expect(r.zapBonus).toBe(25);
  expect(r.scoreJump as number).toBeGreaterThanOrEqual(25);
  expect(r.cactusLeft).toBe(0);
  expect(r.turboRatio).toBe(1.6);
  expect(r.turboAlive).toBe("running");
  expect(r.turboSmashed).toBe(0);
  expect(r.shieldAlive).toBe("running");
  expect(r.shieldUsed).toBe(true);
  expect(r.curseBlocked).toBe(true);
  expect(r.moonApex as number).toBeGreaterThan((r.normalApex as number) + 10);
});

test("curses: heavy gravity, reversed controls, blackout, rush, pickpocket", async ({ page }) => {
  const r = await engine<Record<string, unknown>>(page, `
    const out = {};
    out.normalApex = apex(make());
    let g = make(); g.applyPower("heavy"); out.heavyApex = apex(g);

    // heavy jumps are short but a well timed jump still clears a large cactus
    g = make(); g.applyPower("heavy"); g.obstacles = [cactus(420)];
    let jumped = false;
    for (let i = 0; i < 160 && g.phase === "running"; i++) {
      const o = g.obstacles[0];
      if (o && !jumped && o.x - 128 <= g.speed * 9) { jumped = true; g.press("key"); }
      g.step();
    }
    out.heavyCleared = g.phase;

    // reversed: the jump input ducks and the duck input jumps
    g = make(); g.applyPower("reverse");
    g.press("key"); g.step();
    out.jumpKeyDucks = g.ducking && !g.airborne;
    g.release(); g.step();
    out.releaseStandsUp = !g.ducking;
    g.setDuck(true); g.step();
    out.duckKeyJumps = g.airborne;
    g.setDuck(false);
    for (let i = 0; i < 320; i++) g.step();
    out.reverseExpired = !g.has("reverse");
    g.press("key"); g.step();
    out.normalAfter = g.airborne;

    // blackout darkens the road ahead
    const sample = (game) => { game.render(); const c = game.canvas; const d = c.getContext("2d").getImageData(c.width - 6, Math.round(c.height * 0.5), 1, 1).data; return d[0] + d[1] + d[2]; };
    g = make(); const clear = sample(g);
    g.applyPower("fog"); for (let i = 0; i < 30; i++) g.step();
    out.fogDarker = sample(g) < clear * 0.25;

    // rush speeds you up without protection
    g = make(); const base = g.speed; g.applyPower("rush"); g.step();
    out.rushRatio = +(g.speed / base).toFixed(2);
    g.obstacles = [cactus(80)]; g.step();
    out.rushDies = g.phase;

    // pickpocket takes up to 10 run coins
    g = make(); g.runCoins = 15; g.applyPower("pickpocket"); out.afterPick = g.runCoins;
    g.runCoins = 4; g.applyPower("pickpocket"); out.afterPickSmall = g.runCoins;

    // opposite effects replace each other
    g = make(); g.applyPower("moon"); g.applyPower("heavy");
    out.opposites = !g.has("moon") && g.has("heavy");
    return out;
  `);
  expect(r.heavyApex as number).toBeLessThanOrEqual((r.normalApex as number) - 15);
  expect(r.heavyCleared).toBe("running");
  expect(r.jumpKeyDucks).toBe(true);
  expect(r.releaseStandsUp).toBe(true);
  expect(r.duckKeyJumps).toBe(true);
  expect(r.reverseExpired).toBe(true);
  expect(r.normalAfter).toBe(true);
  expect(r.fogDarker).toBe(true);
  expect(r.rushRatio).toBe(1.38);
  expect(r.rushDies).toBe("over");
  expect(r.afterPick).toBe(5);
  expect(r.afterPickSmall).toBe(0);
  expect(r.opposites).toBe(true);
});

test("boxes spawn on their own, open on contact, and roll fair odds", async ({ page }) => {
  const r = await engine<Record<string, unknown>>(page, `
    const out = {};
    const g = make(); g.nextBox = 600;
    let spawned = null;
    for (let i = 0; i < 400 && !spawned; i++) { g.obstacles = []; g.step(); spawned = g.mysteryBoxes[0] ?? null; }
    out.spawned = !!spawned;
    out.boxHeights = spawned ? spawned.y : null;
    // a low box is collected just by running into it
    g.mysteryBoxes = [{ x: 90, y: 246 - 62, anim: 0 }]; g.step();
    out.opened = g.runBoxes;
    out.gotSomething = g.effects.size > 0 || g.powerBanner !== null;
    // a high box needs a jump
    g.mysteryBoxes = [{ x: 90, y: 246 - 140, anim: 0 }]; g.step();
    out.highWhileRunning = g.runBoxes;
    // the boxes never grant duplicates of state that cannot coexist
    const counts = {};
    let good = 0;
    for (let i = 0; i < 6000; i++) { const id = g.rollPower(); counts[id] = (counts[id] || 0) + 1; }
    const { POWERS } = await import("/src/game/content.ts");
    for (const [id, n] of Object.entries(counts)) if (POWERS[id].good) good += n;
    out.outcomes = Object.keys(counts).length;
    out.goodShare = +(good / 6000).toFixed(2);
    // the run summary reports boxes and zaps
    let summary = null;
    g.onRunEnd = (s) => (summary = s);
    g.obstacles = [cactus(80)]; g.effects.clear(); g.ghost = 0; g.step();
    out.summary = summary && { boxes: summary.boxes, zaps: summary.zaps, mode: summary.mode };
    return out;
  `);
  expect(r.spawned).toBe(true);
  expect([184, 106]).toContain(r.boxHeights);
  expect(r.opened).toBe(1);
  expect(r.gotSomething).toBe(true);
  expect(r.highWhileRunning).toBe(1);
  expect(r.outcomes).toBe(11);
  expect(r.goodShare as number).toBeGreaterThan(0.57);
  expect(r.goodShare as number).toBeLessThan(0.68);
  expect(r.summary).toEqual({ boxes: 1, zaps: 0, mode: "arcade" });
});

test("arcade runs feed quests, challenges and the coin economy", async ({ page }) => {
  await page.goto("/");
  const r = await page.evaluate(async () => {
    const savePath = "/src/game/save.ts";
    const { applyRun, defaultSave } = await import(savePath);
    const s = defaultSave();
    s.quests.list = [{ id: "boxes", tier: 0, progress: 0, claimed: false }, ...s.quests.list.slice(1)];
    const run = {
      mode: "arcade", score: 640, distanceM: 400, pickups: 12, jumps: 40, dodged: 20, pteros: 2,
      nights: 0, torches: 0, sports: 0, medal: false, boxes: 5, zaps: 3, noDuck: false,
      reason: "dead", newBest: true, seconds: 50,
    };
    const { save, report } = applyRun(s, run);
    return {
      best: save.modeBest.arcade,
      total: report.total,
      quest: report.questsDone,
      challenges: report.challengesDone,
    };
  });
  expect(r.best).toBe(640);
  expect(r.total).toBe(12 + 6);
  expect(r.quest).toEqual(["Open 3 Arcade mystery boxes"]);
  expect(r.challenges).toEqual(expect.arrayContaining(["Lucky Dip", "Sky Sniper"]));
});

test("keyboard: F fires only while the blaster is active", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: /Arcade/ }).click();
  await page.keyboard.press("Space");
  await page.waitForTimeout(100);
  const lasers = () => page.evaluate(() => (window as unknown as { __dinoGame: { lasers: unknown[] } }).__dinoGame.lasers.length);
  await page.keyboard.press("KeyF");
  expect(await lasers()).toBe(0);
  await page.evaluate(() => (window as unknown as { __dinoGame: { applyPower: (id: string) => void } }).__dinoGame.applyPower("blaster"));
  await page.keyboard.press("KeyF");
  expect(await lasers()).toBeGreaterThanOrEqual(1);
  await expect(page.getByTestId("arcade-strip")).toContainText("Laser Blaster");
});

for (const width of [320, 390]) {
  test(`touch at ${width}px: FIRE pad, swapped pads and no overflow`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width, height: 860 }, hasTouch: true });
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:4173/");
    await page.getByRole("tab", { name: /Arcade/ }).tap();
    await page.getByRole("button", { name: "Jump", exact: true }).tap();
    await expect(page.getByRole("button", { name: "Fire laser" })).toHaveCount(0);
    await page.evaluate(() => (window as unknown as { __dinoGame: { applyPower: (id: string) => void } }).__dinoGame.applyPower("blaster"));
    const fire = page.getByRole("button", { name: "Fire laser" });
    await expect(fire).toBeVisible();
    await fire.tap();
    const fired = await page.evaluate(() => (window as unknown as { __dinoGame: { fireCooldown: number; lasers: unknown[] } }).__dinoGame);
    expect(fired.lasers.length + fired.fireCooldown).toBeGreaterThan(0);
    await page.evaluate(() => (window as unknown as { __dinoGame: { applyPower: (id: string) => void } }).__dinoGame.applyPower("reverse"));
    await expect(page.getByRole("button", { name: "Jump", exact: true })).toContainText("⇄");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await context.close();
  });
}
