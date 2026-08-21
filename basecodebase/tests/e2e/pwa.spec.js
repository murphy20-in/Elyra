import { test, expect } from "@playwright/test";
import { completeOnboarding, goto } from "./helpers.js";

test.describe("PWA", () => {
  test("manifest is valid and installable-shaped", async ({ page, request }) => {
    await page.goto("/");

    const href = await page.getAttribute('link[rel="manifest"]', "href");
    expect(href, "a manifest must be linked").toBeTruthy();

    const response = await request.get(new URL(href, "http://localhost:4173/").toString());
    expect(response.ok()).toBe(true);

    const manifest = await response.json();
    expect(manifest.name).toContain("Elyra");
    expect(manifest.short_name).toBe("Elyra");
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBe(".");
    expect(manifest.theme_color).toBe("#05070c");
    expect(manifest.background_color).toBeTruthy();

    // Chrome requires 192 and 512, plus a maskable icon for adaptive launchers
    const sizes = manifest.icons.map((i) => i.sizes);
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
    expect(manifest.icons.some((i) => i.purpose === "maskable")).toBe(true);

    // Relative paths are what make a subpath deployment work
    for (const iconEntry of manifest.icons) {
      expect(iconEntry.src.startsWith("/"), `${iconEntry.src} must be relative`).toBe(false);
      const iconResponse = await request.get(
        new URL(iconEntry.src, "http://localhost:4173/").toString()
      );
      expect(iconResponse.ok(), `${iconEntry.src} should load`).toBe(true);
    }
  });

  test("service worker registers and precaches the shell", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(2500);

    const scope = await page.evaluate(async () => {
      const registrations = await navigator.serviceWorker.getRegistrations();
      return registrations[0]?.scope ?? null;
    });
    expect(scope, "the service worker should register").toBeTruthy();

    await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, {
      timeout: 15000,
    });

    const cached = await page.evaluate(async () => {
      const names = await caches.keys();
      let total = 0;
      for (const name of names) total += (await caches.open(name).then((c) => c.keys())).length;
      return { names, total };
    });
    expect(cached.total, "the shell should be precached").toBeGreaterThan(5);
  });

  test("app opens and stays usable offline", async ({ page, context }) => {
    await completeOnboarding(page);
    await goto(page, "/matches");
    await page.waitForTimeout(500);

    // Let the service worker take control before pulling the network
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, {
      timeout: 15000,
    });

    await context.setOffline(true);
    await page.reload();

    // The shell must come back from cache, not an error page
    await expect(page.locator(".app-shell")).toBeVisible({ timeout: 15000 });
    await expect(page.locator(".app-banner")).toContainText(/offline/i);

    // Local data is still readable with no network at all
    await goto(page, "/profile");
    await expect(page.locator(".profile-hero")).toContainText("Riya");

    await goto(page, "/discover");
    await expect(page.locator(".swipe-card").first()).toBeVisible();

    await context.setOffline(false);
  });

  test("assets resolve relatively so a subpath deploy works", async ({ page }) => {
    await page.goto("/");
    const refs = await page.evaluate(() =>
      [...document.querySelectorAll("script[src], link[href]")]
        .map((el) => el.getAttribute("src") || el.getAttribute("href"))
        .filter((href) => href && !href.startsWith("http"))
    );
    expect(refs.length).toBeGreaterThan(0);
    for (const ref of refs) {
      expect(ref.startsWith("/"), `${ref} must not be root-absolute`).toBe(false);
    }
  });
});

test.describe("accessibility and layout", () => {
  const widths = [320, 360, 390, 430, 768, 1024, 1440];

  for (const width of widths) {
    test(`no horizontal overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await completeOnboarding(page);

      for (const route of ["/discover", "/matches", "/chats", "/profile", "/safety", "/privacy", "/settings", "/premium"]) {
        await goto(page, route);
        await page.waitForTimeout(350);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth
        );
        expect(overflow, `${route} overflows at ${width}px by ${overflow}px`).toBeLessThanOrEqual(1);
      }
    });
  }

  test("the skip link is the first thing a keyboard user reaches", async ({ page }) => {
    await completeOnboarding(page);
    await goto(page, "/discover");

    // First tabbable element in document order — what Tab from the URL bar hits
    const firstTabbable = await page.evaluate(() => {
      // offsetParent is null for position:fixed elements — the skip link
      // is one — so test rendered boxes instead.
      const candidates = [...document.querySelectorAll("a[href], button, input, select, textarea, [tabindex]")];
      const visible = candidates.filter(
        (el) => el.tabIndex >= 0 && el.getClientRects().length > 0
      );
      return visible[0]?.className ?? null;
    });
    expect(firstTabbable).toContain("skip-link");

    // And it must reveal itself once focused, not stay parked off-screen
    await page.focus(".skip-link");
    await page.waitForTimeout(450); // the reveal is a transition, not instant
    const revealed = await page.evaluate(() => {
      const el = document.querySelector(".skip-link");
      return el.getBoundingClientRect().top >= 0;
    });
    expect(revealed).toBe(true);

    // Following it lands focus in main content
    await page.keyboard.press("Enter");
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => window.location.hash)).toContain("appMain");
  });

  test("dialogs trap focus and close on Escape", async ({ page }) => {
    await completeOnboarding(page);
    await page.click(".deck-secondary [data-act='detail']");

    const dialog = page.locator("dialog");
    await expect(dialog).toBeVisible();
    // Native <dialog> keeps focus inside while modal
    const inside = await page.evaluate(() =>
      document.querySelector("dialog")?.contains(document.activeElement)
    );
    expect(inside).toBe(true);

    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
  });

  test("every interactive control has an accessible name", async ({ page }) => {
    await completeOnboarding(page);
    await goto(page, "/discover");

    const unnamed = await page.evaluate(() =>
      [...document.querySelectorAll("button, a[href]")]
        .filter((el) => el.getClientRects().length > 0)
        .filter((el) => {
          const label = (el.getAttribute("aria-label") || el.textContent || "").trim();
          return label.length === 0;
        })
        .map((el) => el.outerHTML.slice(0, 90))
    );
    expect(unnamed).toEqual([]);
  });
});
