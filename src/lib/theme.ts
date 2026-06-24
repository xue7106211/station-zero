export type ThemeName = "dark" | "light";
export type ThemePreference = ThemeName | "system";

export const themeStorageKey = "station-zero-theme";

export function normalizeTheme(value: unknown): ThemeName {
  return value === "light" || value === "dark" ? value : "dark";
}

export function normalizeThemePreference(value: unknown): ThemePreference {
  return value === "light" || value === "dark" || value === "system" ? value : "dark";
}

/** 将用户偏好解析为实际应用到 `data-theme` 的主题名。 */
export function resolveTheme(
  preference: ThemePreference,
  prefersDark = true,
): ThemeName {
  if (preference === "light") return "light";
  if (preference === "dark") return "dark";
  return prefersDark ? "dark" : "light";
}

export function systemPrefersDark() {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}
