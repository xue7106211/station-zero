export type ThemeName = "dark" | "light";
export const themeStorageKey = "station-zero-theme";

export function normalizeTheme(value: unknown): ThemeName {
  return value === "light" || value === "dark" ? value : "dark";
}
