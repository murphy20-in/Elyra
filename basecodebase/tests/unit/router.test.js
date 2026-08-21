/**
 * Router tests.
 *
 * These exist because both router bugs found during the build were in
 * this file: parameterised routes failing to match, and replace-mode
 * navigation never resolving.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

async function freshRouter() {
  vi.resetModules();
  return import("../../src/app/router.js");
}

describe("route matching", () => {
  let router;
  beforeEach(async () => {
    window.location.hash = "";
    router = await freshRouter();
  });

  it("matches a static route", async () => {
    const hit = vi.fn();
    router.route("/discover", hit);
    window.location.hash = "#/discover";
    await router.startRouter();
    expect(hit).toHaveBeenCalled();
  });

  it("extracts a route parameter", async () => {
    const hit = vi.fn();
    router.route("/chats/:id", hit);
    window.location.hash = "#/chats/conv_abc-123-def";
    await router.startRouter();
    expect(hit).toHaveBeenCalledWith({ id: "conv_abc-123-def" }, expect.anything());
  });

  it("does not let a static route swallow its own sub-path", async () => {
    const list = vi.fn();
    const detail = vi.fn();
    router.route("/chats", list);
    router.route("/chats/:id", detail);
    window.location.hash = "#/chats/abc";
    await router.startRouter();
    expect(list).not.toHaveBeenCalled();
    expect(detail).toHaveBeenCalled();
  });

  it("falls through to notFound for an unknown path", async () => {
    const missing = vi.fn();
    router.route("/discover", vi.fn());
    router.setNotFound(missing);
    window.location.hash = "#/nowhere";
    await router.startRouter();
    expect(missing).toHaveBeenCalled();
  });

  it("parses the query string separately from the path", async () => {
    const hit = vi.fn();
    router.route("/discover", hit);
    window.location.hash = "#/discover?from=match";
    await router.startRouter();
    expect(hit).toHaveBeenCalled();
    expect(router.currentPath()).toBe("/discover");
  });
});

describe("navigation", () => {
  let router;
  beforeEach(async () => {
    window.location.hash = "";
    router = await freshRouter();
  });

  it("resolves the target route when replacing", async () => {
    // replaceState fires no hashchange — the router must drive resolve itself
    const target = vi.fn();
    router.route("/onboarding", target);
    await router.startRouter();
    router.navigate("/onboarding", { replace: true });
    expect(target).toHaveBeenCalled();
  });

  it("redirects when the guard returns a path", async () => {
    const guarded = vi.fn();
    const fallback = vi.fn();
    router.route("/discover", guarded);
    router.route("/onboarding", fallback);
    router.setGuard((path) => (path === "/discover" ? "/onboarding" : null));
    window.location.hash = "#/discover";
    await router.startRouter();
    expect(guarded).not.toHaveBeenCalled();
    expect(fallback).toHaveBeenCalled();
  });
});
