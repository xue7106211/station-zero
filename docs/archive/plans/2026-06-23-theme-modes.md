---
title: Theme Modes Implementation Plan
type: archive
status: implemented
updated: 2026-06-23
related:
  - ../../src/lib/theme.ts
  - ../../src/components/theme-toggle.tsx
  - ../../src/app/globals.css
---

# Theme Modes Implementation Plan

> **状态：已落地。** 以 `src/lib/theme.ts`、`src/components/theme-toggle.tsx`、`globals.css` 为准。

**Goal:** Add dark and light theme support with a persistent toggle, using Station Zero semantic design tokens and a HeroUI-like light palette.

**Architecture:** Keep the app defaulting to dark mode via `data-theme="dark"` on initial load, then let a client `ThemeToggle` persist `dark` or `light` in `localStorage`. Define semantic CSS variables in `globals.css`, map existing hard-coded shell/card/detail colors to tokens, and preserve the no-horizontal-overflow fix.

**Tech Stack:** Next.js App Router, React client component for theme switching, Tailwind arbitrary values, CSS custom properties, Node test runner.

---

### Task 1: Theme Storage Helper

**Files:**
- Create: `src/lib/theme.ts`
- Create: `tests/theme.test.mjs`

- [ ] Add a pure `normalizeTheme` helper that accepts unknown values and returns `"dark"` or `"light"`, defaulting to `"dark"`.
- [ ] Test that `"light"` returns `"light"`, `"dark"` returns `"dark"`, and invalid values return `"dark"`.

### Task 2: Theme Bootstrap And Toggle

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `src/components/theme-toggle.tsx`
- Modify: `src/components/site-shell.tsx`

- [ ] Add a small inline script in `<head>` that reads `localStorage.station-zero-theme` and sets `document.documentElement.dataset.theme` before paint.
- [ ] Set `<html lang="zh-CN" data-theme="dark">` as the SSR fallback.
- [ ] Create `ThemeToggle` with `aria-label`, `aria-pressed`, `localStorage` persistence, and `data-theme` updates.
- [ ] Place `ThemeToggle` in the desktop navigation area of `SiteShell`.

### Task 3: Design Tokens

**Files:**
- Modify: `src/app/globals.css`

- [ ] Add dark tokens under `:root` for background, foreground, muted text, surfaces, border, accent, accent contrast, soft overlay, and detail-specific surfaces.
- [ ] Add light tokens under `html[data-theme="light"]`, using HeroUI-like white background, slate text, subtle gray surfaces, blue primary accent, and soft borders.
- [ ] Keep `overflow-x: clip` on `html, body`.

### Task 4: Apply Tokens To Shared Shell And Pages

**Files:**
- Modify: `src/components/site-shell.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/movies/page.tsx`
- Modify: `src/app/movies/[slug]/page.tsx`
- Modify: `src/components/poster-ambient-glow.tsx`

- [ ] Replace repeated hard-coded dark colors with `var(--sz-*)` token references.
- [ ] Preserve poster gradients and image behavior.
- [ ] Ensure light mode has readable cards, borders, headings, and secondary text.

### Task 5: Verify

**Files:**
- No new files.

- [ ] Run `npm test`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build` in an authorized environment if Turbopack hits sandbox port restrictions.
- [ ] Manually check `/`, `/movies`, and `/movies/in-the-mood-for-love` in both themes.
