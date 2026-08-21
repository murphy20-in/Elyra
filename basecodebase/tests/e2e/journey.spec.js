import { test, expect } from "@playwright/test";
import { completeOnboarding, goto, trackConsoleErrors } from "./helpers.js";

test.describe("Elyra core journey", () => {
  test("onboarding -> discover -> like -> match -> chat -> persistence", async ({ page }) => {
    const errors = trackConsoleErrors(page);

    // --- Onboarding validates before it lets you through
    await page.goto("/");
    await expect(page).toHaveURL(/#\/onboarding/);
    await page.click("[data-ob-next]");
    await page.click("[data-ob-next]");
    await page.click("[data-ob-next]");
    await expect(page.locator('[data-error="displayName"]')).toContainText(/name/i);

    await completeOnboarding(page);

    // --- Discover shows a ranked, explained deck
    await expect(page.locator(".swipe-card").first()).toBeVisible();
    await expect(page.locator(".tag-score").first()).toContainText("%");
    await expect(page.locator(".deck-count")).toContainText(/profiles left/);

    // --- The compatibility breakdown is real, not decoration
    await page.click(".deck-secondary [data-act='detail']");
    await expect(page.locator("dialog .breakdown-total strong")).toContainText("%");
    await expect(page.locator("dialog .breakdown-note")).toContainText(/Not the server-side model/i);
    await page.click('dialog [data-action="0"]');

    // --- Like until something matches
    let matched = false;
    for (let i = 0; i < 6 && !matched; i += 1) {
      await page.click("[data-act='like']");
      await page.waitForTimeout(600);
      matched = await page.locator("dialog .dialog-title").count() > 0
        && (await page.locator("dialog .dialog-title").textContent())?.includes("match");
    }
    expect(matched, "a like should eventually match").toBe(true);

    // --- Match celebration into chat
    await page.click('dialog [data-action="1"]');
    await expect(page).toHaveURL(/#\/chats\/conv_/);
    await expect(page.locator(".thread-disclaimer")).toContainText(/generated locally/i);

    // --- Send a message and get a reply
    await page.fill("#composerInput", "Hey! What got you into pottery?");
    await page.click(".round-send");
    await expect(page.locator(".bubble-out .bubble")).toContainText("pottery");
    await expect(page.locator(".bubble-in .bubble")).toBeVisible({ timeout: 8000 });

    // --- Persistence survives a reload
    await page.reload();
    await goto(page, "/chats");
    await expect(page.locator(".row-item").first()).toBeVisible();
    await page.locator(".row-item").first().click();
    await expect(page.locator(".bubble-out .bubble")).toContainText("pottery");

    expect(errors, `console errors: ${errors.join(" | ")}`).toEqual([]);
  });

  test("safety filter holds a risky message until acknowledged", async ({ page }) => {
    await completeOnboarding(page);

    await page.click("[data-act='like']");
    await page.waitForTimeout(700);
    const isMatch = await page.locator("dialog .dialog-title").count() > 0;
    if (isMatch) await page.click('dialog [data-action="1"]');
    else {
      // Fall back to whichever match did land
      await goto(page, "/matches");
      await page.locator(".row-item").first().click();
      await page.click("[data-open-chat]");
    }
    await expect(page).toHaveURL(/#\/chats\/conv_/);

    await page.fill("#composerInput", "just send me your otp and 5000 rupees");
    await page.click(".round-send");

    await expect(page.locator("dialog .dialog-title")).toContainText(/Check this/i);
    await expect(page.locator("dialog .dialog-note")).toContainText(/server-side moderation model/i);

    // Cancelling must not send
    await page.click('dialog [data-action="0"]');
    await expect(page.locator(".bubble-out")).toHaveCount(0);
  });

  test("blocking removes the match and the conversation", async ({ page }) => {
    await completeOnboarding(page);

    // Like until something actually matches, so the test never depends on
    // which profile happens to rank first.
    let matched = false;
    for (let i = 0; i < 6 && !matched; i += 1) {
      await page.click("[data-act='like']");
      await page.waitForTimeout(600);
      if (await page.locator("dialog .dialog-title").count()) {
        matched = (await page.locator("dialog .dialog-title").textContent())?.includes("match");
        await page.click('dialog [data-action="0"]');
      }
    }
    expect(matched, "a like should eventually match").toBe(true);

    await goto(page, "/matches");
    await expect(page.locator(".row-list .row-item").first()).toBeVisible();
    const before = await page.locator(".row-list .row-item").count();
    expect(before).toBeGreaterThan(0);

    await page.locator(".row-list .row-item").first().click();
    await expect(page.locator("[data-block]")).toBeVisible();
    await page.click("[data-block]");
    await page.click('dialog [data-action="1"]');

    // Anchored: an unanchored /#\/matches/ also matches the detail route
    // #/matches/<id>, which lets the test run ahead of the block completing.
    await expect(page).toHaveURL(/#\/matches$/);
    await expect(page.locator(".page-matches, .state-block")).toBeVisible();
    await expect(page.locator(".row-list .row-item")).toHaveCount(before - 1);

    await goto(page, "/safety");
    await expect(page.locator(".page-safety")).toContainText(/Blocked \(1\)/);
  });

  test("privacy toggles persist", async ({ page }) => {
    await completeOnboarding(page);
    await goto(page, "/privacy");

    const toggle = page.locator('[data-toggle="readReceipts"]');
    await expect(toggle).toHaveAttribute("aria-checked", "true");
    await toggle.click();
    await expect(page.locator('[data-toggle="readReceipts"]')).toHaveAttribute("aria-checked", "false");

    await page.reload();
    await goto(page, "/privacy");
    await expect(page.locator('[data-toggle="readReceipts"]')).toHaveAttribute("aria-checked", "false");
  });

  test("profile edits save and show on the profile", async ({ page }) => {
    await completeOnboarding(page);
    await goto(page, "/profile/edit");

    await page.fill("#edBio", "Updated bio for the test.");
    await page.click('#editForm button[type="submit"]');

    await expect(page).toHaveURL(/#\/profile$/);
    await expect(page.locator(".profile-hero")).toContainText("Updated bio for the test.");

    await page.reload();
    await goto(page, "/profile");
    await expect(page.locator(".profile-hero")).toContainText("Updated bio for the test.");
  });

  test("safe date runs a real session with check-ins", async ({ page }) => {
    await completeOnboarding(page);
    await goto(page, "/safety");

    // Needs a trusted contact before a session can start
    await page.click("[data-add-contact]");
    await page.fill("#tcName", "Asha");
    await page.fill("#tcPhone", "+919000000000");
    await page.click('dialog [data-action="1"]');
    await expect(page.locator(".page-safety")).toContainText("Asha");

    await goto(page, "/safety/safe-date");
    await page.fill("#sdVenue", "Third Wave, Indiranagar");
    await page.click('#safeForm button[type="submit"]');

    await expect(page.locator(".safe-active-head")).toContainText(/Safe Date active/i);
    await expect(page.locator("#safeCountdown")).not.toHaveText("—");
    await expect(page.locator(".page-safe-active")).toContainText(/can't send an SMS/i);

    await page.click("[data-checkin]");
    await expect(page.locator(".safe-facts")).toContainText("1");

    await page.click("[data-end]");
    await page.click('dialog [data-action="1"]');
    await expect(page).toHaveURL(/#\/safety/);
  });

  test("reset demo data returns to onboarding", async ({ page }) => {
    await completeOnboarding(page);
    await goto(page, "/settings");

    await page.click("[data-reset]");
    await page.click('dialog [data-action="1"]');

    await page.waitForURL(/#\//);
    await expect(page.locator("[data-ob-next]")).toBeVisible({ timeout: 10000 });
  });

  test("deep link to an unknown route falls back gracefully", async ({ page }) => {
    await completeOnboarding(page);
    await goto(page, "/nowhere-at-all");
    await expect(page.locator(".state-block h3")).toContainText(/doesn't exist/i);
    await page.click('[data-state-action="home"]');
    await expect(page).toHaveURL(/#\/discover/);
  });
});
