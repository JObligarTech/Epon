import { THEME_STORAGE_KEY } from "@/lib/theme";

/**
 * Runs before first paint so a stored theme is stamped on <html> during SSR
 * hydration rather than after it. Without this the page renders in the OS
 * theme and then snaps to the stored one — a visible flash on every load.
 *
 * Deliberately tiny, dependency-free, and wrapped in try/catch: reading
 * localStorage throws outright in some contexts.
 */
export function ThemeScript() {
  const script = `try{var t=localStorage.getItem(${JSON.stringify(
    THEME_STORAGE_KEY,
  )});if(t==="dark"||t==="light")document.documentElement.setAttribute("data-theme",t)}catch(e){}`;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
