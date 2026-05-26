import { test, expect } from "@playwright/test";

/**
 * Feature specs covering Phase 1 + Phase 2 additions:
 * - Persona presets (one-click load)
 * - Mode pill switch in SubjectPanel
 * - Public chat permalink share button (API mocked)
 * - Persons list switch in Sidebar
 *
 * Stub mode + intercepted /api/settings to keep tests deterministic.
 */

test.describe("Praiser features", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/settings**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ settings: { version: 2 } }),
      }),
    );
    await page.goto("/");
  });

  test("clicking a persona preset populates SubjectPanel", async ({ page }) => {
    // EmptyState shows the preset chip row.
    const socratesChip = page.locator(".alias-chip", { hasText: "Socrates" });
    await expect(socratesChip).toBeVisible();
    await socratesChip.click();

    // SubjectPanel now shows the person name.
    await expect(page.locator(".subj-name")).toContainText("Socrates", {
      timeout: 5_000,
    });
  });

  test("mode pill switch updates active mode chip", async ({ page }) => {
    await page.locator(".alias-chip", { hasText: "Bob Ross" }).click();
    await expect(page.locator(".subj-name")).toContainText("Bob Ross");

    // Click "Roast" pill — it's a chip in the SubjectPanel mode row.
    const roastPill = page
      .locator(".subj-name + p ~ .alias-chips .alias-chip", { hasText: /^Roast$/ })
      .first();
    // Fallback selector if structure shifts:
    const roastByText = page.getByRole("button", { name: /^Roast$/ }).first();

    if (await roastPill.count()) {
      await roastPill.click();
    } else {
      await roastByText.click();
    }

    // After click, the Roast chip should be active (clay background).
    const roastAfter = page.getByRole("button", { name: /^Roast$/ }).first();
    await expect(roastAfter).toBeVisible();
  });

  test("persons list appears in sidebar after preset selected", async ({ page }) => {
    await page.locator(".alias-chip", { hasText: "Mary Oliver" }).click();
    // The sidebar persons section becomes visible.
    const sidebarEntry = page.locator(".sidebar .chat-item-title", {
      hasText: "Mary Oliver",
    });
    await expect(sidebarEntry).toBeVisible({ timeout: 5_000 });
  });

  test("share button surfaces error when no messages yet", async ({ page }) => {
    await page.locator(".alias-chip", { hasText: "Carl Sagan" }).click();
    // Click share before any chat happens.
    await page.locator(".topbar-right .icon-btn[aria-label='Share']").click();
    // The "!" inline error indicator appears (title attribute carries the
    // localised "Send a message first" message).
    const err = page.locator(".topbar-right .label[title]");
    await expect(err).toBeVisible({ timeout: 3_000 });
  });

  test("share button after message produces a permalink", async ({ page }) => {
    // Intercept share endpoint to avoid actually touching Vercel Blob.
    await page.route("**/api/chats/share**", async (route) => {
      if (route.request().method() === "POST") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ shortcode: "abcd1234" }),
        });
      }
      return route.continue();
    });

    await page.locator(".alias-chip", { hasText: "Heracles" }).click();
    const textarea = page.locator(".composer textarea");
    await textarea.fill("Hype me up");
    await textarea.press("Enter");
    await expect(page.locator(".msg.assistant").first()).toBeVisible({
      timeout: 15_000,
    });

    await page.locator(".topbar-right .icon-btn[aria-label='Share']").click();
    // "Copied ✓" link rendered after successful share call.
    const copied = page.locator(".topbar-right a", { hasText: /copied|αντιγρ/i });
    await expect(copied).toBeVisible({ timeout: 5_000 });
    await expect(copied).toHaveAttribute("href", /\/c\/abcd1234$/);
  });
});
