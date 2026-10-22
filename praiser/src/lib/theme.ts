// Light / Dark / Auto for Praiser. Auto follows the device (prefers-color-scheme).
// Older saves only had `darkMode: boolean`; modeFromSaved maps that so nobody's look jumps.
export type ThemeMode = "light" | "dark" | "auto";
export const THEME_KEY = "praiser-theme";

export const isThemeMode = (v: unknown): v is ThemeMode =>
  v === "light" || v === "dark" || v === "auto";

/** Mode from a saved settings object; null when it never stored a theme. */
export const modeFromSaved = (s: { themeMode?: unknown; darkMode?: unknown } | null | undefined): ThemeMode | null => {
  if (!s) return null;
  if (isThemeMode(s.themeMode)) return s.themeMode;
  if (typeof s.darkMode === "boolean") return s.darkMode ? "dark" : "light";
  return null;
};

export const readLocalMode = (): ThemeMode | null => {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return isThemeMode(v) ? v : null;
  } catch {
    return null;
  }
};

export const osPrefersDark = () =>
  typeof window !== "undefined" && !!window.matchMedia?.("(prefers-color-scheme: dark)").matches;

export const resolveDark = (mode: ThemeMode) => (mode === "auto" ? osPrefersDark() : mode === "dark");

export const applyTheme = (mode: ThemeMode) => {
  if (typeof document === "undefined") return;
  if (resolveDark(mode)) document.documentElement.setAttribute("data-theme", "dark");
  else document.documentElement.removeAttribute("data-theme");
};

// Runs before first paint (inlined in layout). Same rules as above, no flash.
export const THEME_BOOT = `(function(){try{
  var v=localStorage.getItem('${THEME_KEY}');
  if(v!=='light'&&v!=='dark'&&v!=='auto'){var c=document.cookie.match(/praiser-theme=(dark|light)/);v=c?c[1]:'auto';}
  var d=v==='dark'||(v==='auto'&&window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches);
  if(d){document.documentElement.setAttribute('data-theme','dark');}
}catch(e){}})();`;
