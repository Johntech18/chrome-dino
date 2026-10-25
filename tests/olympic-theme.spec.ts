import { expect, test, type Page } from "@playwright/test";

async function seed(page: Page, mode = "classic", theme = "terminal") {
  await page.addInitScript(({ mode, theme }) => {
    if (!localStorage.getItem("dino.save.v2")) {
      localStorage.setItem("dino.save.v2", JSON.stringify({
        v: 2,
        mode,
        coins: 275,
        equipped: { theme, skin: "classic" },
        owned: { themes: ["classic", theme], skins: ["classic"] },
        modeBest: { olympics: 425, classic: 200 },
      }));
    }
  }, { mode, theme });
}

async function skyPixel(page: Page) {
  return page.locator('[role="application"] canvas').evaluate((element) => {
    const canvas = element as HTMLCanvasElement;
    return Array.from(canvas.getContext("2d")!.getImageData(2, 2, 1, 1).data);
  });
}

test("Olympics applies its theme immediately and preserves the saved palette", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await seed(page);
  await page.goto("/");
  await expect.poll(() => skyPixel(page)).toEqual([6, 18, 11, 255]);
  await page.locator('[role="application"] canvas').evaluate((el) => el.setAttribute("data-mount", "original"));

  await page.getByRole("tab", { name: /Olympics/ }).click();
  await expect(page.locator(".olympics-theme")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("OLYMPICS");
  await expect(page.locator(".olympic-masthead")).toBeVisible();
  await expect(page.getByText("OLYMPIC STADIUM", { exact: true })).toBeVisible();
  await expect.poll(() => skyPixel(page)).toEqual([245, 243, 235, 255]);
  await expect(page.locator('[role="application"] canvas')).toHaveAttribute("data-mount", "original");
  await expect(page).toHaveTitle("T-REX OLYMPICS | Tokyo 2020");

  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("dino.save.v2")!));
  expect(saved.equipped.theme).toBe("terminal");
  expect(saved.coins).toBe(275);
  expect(saved.modeBest.olympics).toBe(425);

  await page.getByRole("tab", { name: "Classic", exact: true }).click();
  await expect(page.locator(".olympics-theme")).toHaveCount(0);
  await expect.poll(() => skyPixel(page)).toEqual([6, 18, 11, 255]);
  await expect(page.locator('[role="application"] canvas')).toHaveAttribute("data-mount", "original");
  await expect(page).toHaveTitle("T-REX RUNNER | No Internet");
  expect(errors).toEqual([]);
});

test("the saved Olympics mode reloads with its stadium and records intact", async ({ page }) => {
  await seed(page, "olympics", "glacier");
  await page.goto("/");
  await expect.poll(() => skyPixel(page)).toEqual([245, 243, 235, 255]);
  await page.reload();
  await expect(page.locator(".olympics-theme")).toBeVisible();
  await expect(page.locator(".olympic-scoreboard")).toContainText("00425");
  await expect(page.locator(".olympic-event")).toHaveCount(6);
  await page.getByRole("button", { name: "Shop", exact: true }).click();
  await expect(page.getByText(/Olympic Stadium is active automatically/)).toBeVisible();
});

for (const width of [320, 390, 768]) {
  test(`the stadium and touch controls fit a ${width}px screen`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: true });
    const page = await context.newPage();
    await seed(page, "olympics");
    await page.goto("http://127.0.0.1:4173/");
    await expect.poll(() => skyPixel(page)).toEqual([245, 243, 235, 255]);
    const dimensions = await page.evaluate(() => ({
      page: document.documentElement.scrollWidth,
      screen: window.innerWidth,
      stage: document.querySelector(".game-stage")!.getBoundingClientRect().width,
    }));
    expect(dimensions.page).toBeLessThanOrEqual(dimensions.screen);
    expect(dimensions.stage).toBeLessThan(width);
    const selected = await page.getByRole("tab", { name: /Olympics/ }).boundingBox();
    expect(selected!.x).toBeGreaterThanOrEqual(0);
    expect(selected!.x + selected!.width).toBeLessThanOrEqual(width);
    await expect(page.getByRole("button", { name: "Jump", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Jump", exact: true }).tap();
    await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeEnabled();
    await page.getByRole("button", { name: "Pause", exact: true }).tap();
    await expect(page.getByRole("button", { name: "Resume", exact: true })).toBeEnabled();
    await page.getByRole("button", { name: "Resume", exact: true }).tap();
    await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeEnabled();
    await context.close();
  });
}

test("all six events render in the stadium theme without changing their mechanics", async ({ page }) => {
  await page.goto("/");
  const results = await page.evaluate(async () => {
    const enginePath = "/src/game/engine.ts";
    const contentPath = "/src/game/content.ts";
    const audioPath = "/src/game/sfx.ts";
    const { DinoGame } = await import(enginePath);
    const { OLYMPIC_LIST } = await import(contentPath);
    const { sfx } = await import(audioPath);
    sfx.enabled = false;

    return OLYMPIC_LIST.map(({ id }: { id: string }) => {
      const canvas = document.createElement("canvas");
      const game = new DinoGame(canvas);
      game.resize(480);
      game.setMode("olympics");
      game.press("pointer");
      const torch = { x: 90, y: 182, anim: 0 };
      game.torches = [torch];
      game.collectTorch(torch);
      const torchCollected = game.runTorches === 1 && game.sport !== null;
      game.sport = id;
      game.dinoY = game.baseY();
      game.sportBanner = 0;
      game.spawnOlympic();
      game.obstacles[0].x = 430;
      game.render();
      const sky = Array.from(canvas.getContext("2d")!.getImageData(2, 2, 1, 1).data);
      game.press("pointer");
      const actionWorks = id === "swimming" ? game.diveT === 0 : game.airborne;
      game.night = 1;
      game.render();
      const nightSky = Array.from(canvas.getContext("2d")!.getImageData(2, 2, 1, 1).data);
      return { id, sky, nightSky, actionWorks, torchCollected };
    });
  });
  expect(results).toHaveLength(6);
  for (const event of results) {
    expect(event.sky, event.id).toEqual([245, 243, 235, 255]);
    expect(event.nightSky, event.id).toEqual([25, 45, 73, 255]);
    expect(event.actionWorks, event.id).toBe(true);
    expect(event.torchCollected, event.id).toBe(true);
  }
});

test("decorative theme motion respects reduced-motion preferences", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await seed(page, "olympics");
  await page.goto("/");
  await expect(page.locator(".olympic-heading")).toHaveCSS("animation-name", "none");
  await expect(page.locator(".olympic-heading-rings circle").first()).toHaveCSS("animation-name", "none");
});