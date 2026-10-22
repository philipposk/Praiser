import { test, expect } from "@playwright/test";

/**
 * Smoke specs run against `pnpm dev` with `PRAISER_USE_GROQ_STUB=true`. The
 * stub returns canned replies so these don't hit Groq, OpenRouter, NVIDIA, or
 * ElevenLabs and don't need any API keys.
 */

test.describe("Praiser smoke", () => {
  test.beforeEach(async ({ page }) => {
    // Block any outbound Vercel Blob calls so the settings layer falls back
    // to defaults cleanly in CI.
    await page.route("**/api/settings**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ settings: { version: 2 } }),
      }),
    );
    await page.goto("/");
  });

  test("renders empty state with greeting and 4 starter cards", async ({ page }) => {
    await expect(page.locator(".empty-greet")).toBeVisible();
    const starters = page.locator(".starter");
    await expect(starters).toHaveCount(4);
  });

  test("send a message via composer and receive stub reply", async ({ page }) => {
    const textarea = page.locator(".composer textarea");
    await textarea.fill("Tell me about my friend");
    await textarea.press("Enter");

    // The user message bubble appears.
    await expect(page.locator(".msg.user").first()).toContainText(
      "Tell me about my friend",
    );

    // The assistant message bubble shows up (stub returns canned text).
    await expect(page.locator(".msg.assistant").first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("theme picker saves Light/Dark/Auto to localStorage", async ({ page }) => {
    // Open settings drawer.
    await page.locator(".side-link", { hasText: /settings|ρυθμίσεις/i }).click();
    await expect(page.locator(".drawer h2")).toBeVisible();

    // Pick Dark.
    await page.getByRole("radio", { name: /^(dark|σκούρο)$/i }).click();

    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    // localStorage should reflect the choice (used by FOUC-free boot script).
    const stored = await page.evaluate(() => localStorage.getItem("praiser-theme"));
    expect(stored).toBe("dark");

    // Back to Auto: follows the device (Playwright defaults to light).
    await page.getByRole("radio", { name: /^(auto|αυτόματο)$/i }).click();
    await expect(page.locator("html")).not.toHaveAttribute("data-theme", "dark");
    expect(await page.evaluate(() => localStorage.getItem("praiser-theme"))).toBe("auto");
  });

  test("new visitor follows a dark device with no flash", async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: "dark" });
    const p = await ctx.newPage();
    await p.route(/_next\/static\/chunks\/.*\.js/, (r) => r.abort());
    await p.goto("/", { waitUntil: "domcontentloaded" });
    await expect(p.locator("html")).toHaveAttribute("data-theme", "dark");
    await ctx.close();
  });

  test("old saved on/off choice is kept", async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: "dark" });
    await ctx.addInitScript(() => localStorage.setItem("praiser-theme", "light"));
    const p = await ctx.newPage();
    await p.goto("/");
    await p.waitForTimeout(1500);
    await expect(p.locator("html")).not.toHaveAttribute("data-theme", "dark");
    await ctx.close();
  });

  test("EL/EN toggle in topbar updates the empty state copy", async ({ page }) => {
    // Default English.
    await expect(page.locator(".empty-greet")).toContainText(/tell me about/i);

    // Click EL.
    await page.locator(".lang-pill button", { hasText: "EL" }).click();
    await expect(page.locator(".empty-greet")).toContainText(/πες μου/i);

    // Back to EN.
    await page.locator(".lang-pill button", { hasText: "EN" }).click();
    await expect(page.locator(".empty-greet")).toContainText(/tell me about/i);
  });
});
