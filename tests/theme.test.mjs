import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTheme } from '../src/lib/theme.mjs';

test('normalizeTheme accepts supported theme names', () => {
  assert.equal(normalizeTheme('light'), 'light');
  assert.equal(normalizeTheme('dark'), 'dark');
});

test('normalizeTheme defaults unsupported values to dark', () => {
  assert.equal(normalizeTheme('system'), 'dark');
  assert.equal(normalizeTheme(undefined), 'dark');
  assert.equal(normalizeTheme(null), 'dark');
});
