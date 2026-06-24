import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTheme, normalizeThemePreference, resolveTheme } from '../src/lib/theme.mjs';

test('normalizeTheme accepts supported theme names', () => {
  assert.equal(normalizeTheme('light'), 'light');
  assert.equal(normalizeTheme('dark'), 'dark');
});

test('normalizeTheme defaults unsupported values to dark', () => {
  assert.equal(normalizeTheme('system'), 'dark');
  assert.equal(normalizeTheme(undefined), 'dark');
  assert.equal(normalizeTheme(null), 'dark');
});

test('normalizeThemePreference accepts system preference', () => {
  assert.equal(normalizeThemePreference('light'), 'light');
  assert.equal(normalizeThemePreference('dark'), 'dark');
  assert.equal(normalizeThemePreference('system'), 'system');
});

test('normalizeThemePreference defaults unsupported values to dark', () => {
  assert.equal(normalizeThemePreference('auto'), 'dark');
  assert.equal(normalizeThemePreference(undefined), 'dark');
});

test('resolveTheme maps preference to applied theme', () => {
  assert.equal(resolveTheme('light'), 'light');
  assert.equal(resolveTheme('dark'), 'dark');
  assert.equal(resolveTheme('system', true), 'dark');
  assert.equal(resolveTheme('system', false), 'light');
});
