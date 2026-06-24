export const themeStorageKey = 'station-zero-theme';

export function normalizeTheme(value) {
  return value === 'light' || value === 'dark' ? value : 'dark';
}

export function normalizeThemePreference(value) {
  return value === 'light' || value === 'dark' || value === 'system' ? value : 'dark';
}

export function resolveTheme(preference, prefersDark = true) {
  if (preference === 'light') return 'light';
  if (preference === 'dark') return 'dark';
  return prefersDark ? 'dark' : 'light';
}
