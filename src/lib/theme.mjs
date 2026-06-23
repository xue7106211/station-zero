export const themeStorageKey = 'station-zero-theme';

export function normalizeTheme(value) {
  return value === 'light' || value === 'dark' ? value : 'dark';
}
