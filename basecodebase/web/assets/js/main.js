/**
 * Entry point.
 *
 * Boots the shared scroll/motion layer, then the behaviour for
 * whichever page declared itself via <body data-page="...">. Adding a
 * page means adding one dynamic import here, not touching anything else.
 */

import {
  setupReveal,
  setupCounters,
  setupScrollProgress,
  setupScrollSpy,
  setupScrollButtons,
} from "./core/motion.js";

function bootShared() {
  setupReveal();
  setupCounters();
  setupScrollProgress();
  setupScrollSpy();
  setupScrollButtons();
}

async function bootPage() {
  const page = document.body.dataset.page;

  switch (page) {
    case "landing": {
      const { initLanding } = await import("./pages/landing.js");
      initLanding();
      break;
    }
    default:
      break;
  }
}

function boot() {
  bootShared();
  bootPage();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
