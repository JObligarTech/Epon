import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTheme } from "@/components/theme/useTheme";
import {
  applyTheme,
  isTheme,
  readStoredTheme,
  setTheme,
  storeTheme,
  THEME_STORAGE_KEY,
} from "./theme";

describe("isTheme", () => {
  it("accepts the three supported values and nothing else", () => {
    expect(isTheme("light")).toBe(true);
    expect(isTheme("dark")).toBe(true);
    expect(isTheme("system")).toBe(true);
    expect(isTheme("sepia")).toBe(false);
    expect(isTheme(null)).toBe(false);
  });
});

describe("applyTheme", () => {
  it("stamps an explicit choice on the document", () => {
    applyTheme("dark");
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    applyTheme("light");
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
  });

  it("removes the stamp for system so the media query takes over", () => {
    applyTheme("dark");
    applyTheme("system");
    // The un-stamped state is what most people see; it must be truly absent,
    // not data-theme="system".
    expect(document.documentElement).not.toHaveAttribute("data-theme");
  });
});

describe("stored theme", () => {
  it("defaults to system when nothing is stored", () => {
    expect(readStoredTheme()).toBe("system");
  });

  it("round-trips a stored choice", () => {
    storeTheme("dark");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(readStoredTheme()).toBe("dark");
  });

  it("falls back to system when the stored value is not a theme", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "chartreuse");
    expect(readStoredTheme()).toBe("system");
  });

  it("survives localStorage throwing", () => {
    const getItem = vi
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new Error("blocked site data");
      });
    const setItem = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("blocked site data");
      });

    expect(readStoredTheme()).toBe("system");
    expect(() => storeTheme("dark")).not.toThrow();

    getItem.mockRestore();
    setItem.mockRestore();
  });
});

describe("useTheme", () => {
  beforeEach(() => {
    applyTheme("system");
  });

  it("starts from the stored value", () => {
    storeTheme("dark");
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("dark");
  });

  it("persists and stamps when the theme changes", () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setTheme("light"));

    expect(result.current.theme).toBe("light");
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
  });

  it("mirrors a change made in another tab", () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      window.localStorage.setItem(THEME_STORAGE_KEY, "dark");
      window.dispatchEvent(
        new StorageEvent("storage", { key: THEME_STORAGE_KEY, newValue: "dark" }),
      );
    });

    expect(result.current.theme).toBe("dark");
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
  });

  it("ignores storage events for other keys", () => {
    setTheme("light");
    const { result } = renderHook(() => useTheme());

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", { key: "epon.catcolors", newValue: "0" }),
      );
    });

    expect(result.current.theme).toBe("light");
  });
});
