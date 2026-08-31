import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, expect } from "vitest";
import { toBeAccessible } from "./axe";

// jsdom implements no layout, so it ships no ResizeObserver. Components that
// measure themselves need it to exist; the callback never has to fire, since
// there is nothing to observe a resize of.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;


expect.extend({ toBeAccessible });

// Files that opt into the node environment share this setup but have no DOM.
const hasDom = typeof document !== "undefined";

beforeEach(() => {
  if (!hasDom) return;
  // Each test starts from the default un-stamped theme state — the one most
  // people actually see — unless it opts into a stamp.
  document.documentElement.removeAttribute("data-theme");
  window.localStorage.clear();
});

afterEach(() => {
  if (hasDom) cleanup();
});
