/** Shared E2E helpers: onboarding is the gate in front of every screen. */

export async function completeOnboarding(page, overrides = {}) {
  const profile = {
    name: "Riya", age: "27", city: "Bengaluru", pronouns: "she/her",
    intent: "serious", bio: "Researcher, cyclist, strong opinions about tea.",
    interests: ["Filter coffee", "Reading", "Cycling"],
    ...overrides,
  };

  await page.goto("/");
  await page.waitForSelector("[data-ob-next]");

  await page.click("[data-ob-next]");                 // welcome
  await page.click("[data-ob-next]");                 // privacy

  await page.fill("#obName", profile.name);
  await page.fill("#obAge", profile.age);
  await page.fill("#obCity", profile.city);
  await page.fill("#obPronouns", profile.pronouns);
  await page.click("[data-ob-next]");                 // identity

  await page.click(`[data-intent="${profile.intent}"]`);
  await page.click("[data-ob-next]");                 // intent
  await page.click("[data-ob-next]");                 // preferences
  await page.click('[data-location="approximate"]');
  await page.click("[data-ob-next]");                 // location

  await page.fill("#obBio", profile.bio);
  for (const interest of profile.interests) {
    await page.click(`[data-interest="${interest}"]`);
  }
  await page.click("[data-ob-next]");                 // finish

  await page.waitForFunction(() => window.location.hash === "#/discover");
}

/**
 * Navigate by hash and wait for the app to actually route there.
 *
 * Waits for boot first — setting the hash before the router is listening
 * is a no-op. Then waits on `body[data-route]`, which the app sets when a
 * route resolves. Waiting on the resolved route rather than on the URL
 * avoids racing an in-flight programmatic navigation.
 */
export async function goto(page, route) {
  await page.waitForFunction(() => document.body.classList.contains("is-booted"), null, {
    timeout: 15000,
  });
  await page.evaluate((r) => { window.location.hash = `#${r}`; }, route);
  await page.waitForFunction(
    (r) => document.body.dataset.route === r,
    route,
    { timeout: 15000 }
  );
}

/** Fails the test on any console error — silence is part of the contract. */
export function trackConsoleErrors(page) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  return errors;
}
