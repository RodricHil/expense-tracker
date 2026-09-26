export type ThemePreference = "system" | "light" | "dark";
export const THEME_KEY = "finex-theme";
export function themePreference(value: string | null): ThemePreference {
  return value === "light" || value === "dark" ? value : "system";
}
export function resolveTheme(preference: ThemePreference, systemDark: boolean): "light" | "dark" {
  return preference === "system" ? (systemDark ? "dark" : "light") : preference;
}

export function getThemePreference(): ThemePreference {
  return themePreference(document.documentElement.dataset.themePreference ?? null);
}
export const getServerThemePreference = (): ThemePreference => "system";

function applyTheme(preference: ThemePreference) {
  document.documentElement.dataset.themePreference = preference;
  document.documentElement.dataset.theme = resolveTheme(preference, window.matchMedia("(prefers-color-scheme: dark)").matches);
}
export function setThemePreference(preference: ThemePreference) {
  applyTheme(preference);
  try { localStorage.setItem(THEME_KEY, preference); } catch { /* Theme still works when storage is unavailable. */ }
  window.dispatchEvent(new Event("finex-theme-change"));
}
export function subscribeTheme(notify: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const updateSystem = () => { applyTheme(getThemePreference()); notify(); };
  const updateStorage = (event: StorageEvent) => {
    if (event.key === THEME_KEY || event.key === null) {
      applyTheme(themePreference(event.newValue));
      notify();
    }
  };
  window.addEventListener("finex-theme-change", notify);
  window.addEventListener("storage", updateStorage);
  media.addEventListener("change", updateSystem);
  updateSystem();
  return () => {
    window.removeEventListener("finex-theme-change", notify);
    window.removeEventListener("storage", updateStorage);
    media.removeEventListener("change", updateSystem);
  };
}
