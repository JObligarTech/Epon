export const THEMES = ["light", "dark", "system"] as const;
export type Theme = (typeof THEMES)[number];

export const THEME_STORAGE_KEY = "epon.theme";

export function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && (THEMES as readonly string[]).includes(value);
}

/**
 * Stamp the choice on <html>. "system" removes the attribute entirely so the
 * prefers-color-scheme media query in tokens.css takes over — that un-stamped
 * state is the default most people see, so it has to resolve correctly.
 */
export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}

export function readStoredTheme(): Theme {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(value) ? value : "system";
  } catch {
    return "system";
  }
}

export function storeTheme(theme: Theme) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* private mode, blocked site data — the choice just will not persist */
  }
}

/* ---------------------------------------------------------------------------
 * A tiny external store over localStorage. useSyncExternalStore reads it, so
 * the theme never has to be pulled into state inside an effect — the server
 * snapshot is "system" (matching the un-stamped SSR output) and the client
 * adopts the stored value on hydration without a flash or a state write.
 * ------------------------------------------------------------------------- */

const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

export function subscribeToTheme(onChange: () => void) {
  listeners.add(onChange);

  // Another tab changed the choice: mirror it here, DOM included.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== THEME_STORAGE_KEY) return;
    applyTheme(readStoredTheme());
    notify();
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function getThemeSnapshot(): Theme {
  return readStoredTheme();
}

export function getServerThemeSnapshot(): Theme {
  return "system";
}

export function setTheme(theme: Theme) {
  storeTheme(theme);
  applyTheme(theme);
  notify();
}
