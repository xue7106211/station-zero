"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { DesktopNav, HeaderActions } from "./site-nav";

const scrollThreshold = 8;
const hideDeltaThreshold = 18;
const showDeltaThreshold = 6;

type HeaderScrollSnapshot = {
  scrolled: boolean;
  compact: boolean;
};

let lastScrollY = 0;
let scrolled = false;
let compact = false;
let prevCompact = false;
let ticking = false;

function syncHeaderCompactAttribute(nextCompact: boolean) {
  if (typeof document === "undefined" || nextCompact === prevCompact) return;
  if (nextCompact) {
    document.documentElement.dataset.headerCompact = "true";
  } else {
    delete document.documentElement.dataset.headerCompact;
  }
  prevCompact = nextCompact;
}

function updateScrollState() {
  const y = window.scrollY;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  scrolled = y > scrollThreshold;

  if (y <= scrollThreshold || reduceMotion) {
    compact = false;
  } else {
    const delta = y - lastScrollY;
    if (delta > hideDeltaThreshold) {
      compact = true;
    } else if (delta < -showDeltaThreshold) {
      compact = false;
    }
  }

  lastScrollY = y;
  syncHeaderCompactAttribute(compact);
}

function subscribeToScroll(onStoreChange: () => void) {
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      updateScrollState();
      onStoreChange();
      ticking = false;
    });
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  updateScrollState();
  onStoreChange();

  return () => window.removeEventListener("scroll", onScroll);
}

function encodeSnapshot(state: HeaderScrollSnapshot) {
  return `${state.scrolled ? 1 : 0}${state.compact ? 1 : 0}`;
}

function decodeSnapshot(snapshot: string): HeaderScrollSnapshot {
  return {
    scrolled: snapshot[0] === "1",
    compact: snapshot[1] === "1",
  };
}

function getScrollSnapshot() {
  return encodeSnapshot({ scrolled, compact });
}

function getScrollServerSnapshot() {
  return "00";
}

/**
 * 站点吸顶头部。
 *
 * 固定定位于视口顶部：向下滚动时进入紧凑模式（收起 Logo 与主题切换，保留居中导航 pill）；
 * 向上滚动时恢复完整布局。位于页面顶部时保持通透；滚动后切换半透明背景 + `backdrop-blur`。
 *
 * @returns 吸顶头部 `<header>`
 */
export function SiteHeader() {
  const snapshot = useSyncExternalStore(subscribeToScroll, getScrollSnapshot, getScrollServerSnapshot);
  const { scrolled, compact } = decodeSnapshot(snapshot);

  return (
    <header
      data-compact={compact ? "true" : "false"}
      data-scrolled={scrolled ? "true" : "false"}
      className={`site-header fixed inset-x-0 top-0 z-30 border-b pt-[env(safe-area-inset-top,0px)] ${
        scrolled && !compact
          ? "border-[color:var(--sz-border)] bg-[var(--sz-header-bg)] backdrop-blur-xl"
          : "border-transparent bg-transparent"
      }`}
    >
      <div className="site-header__inner mx-auto flex min-h-[var(--sz-header-height)] w-full max-w-7xl items-center px-6 md:px-10">
        <div className="site-header__brand flex min-w-0 flex-1 items-center">
          <Link href="/" className="group flex shrink-0 items-center gap-2 outline-none">
            <span
              aria-hidden
              className="flex size-8 shrink-0 items-center justify-center rounded-[0.55rem] border border-[color:var(--sz-border)] bg-[var(--sz-surface-soft)] font-mono text-xs font-medium text-[var(--sz-accent)] shadow-[inset_0_1px_0_var(--sz-inset)] transition-[border-color,box-shadow] duration-200 group-hover:border-[color:var(--sz-accent-soft)] group-focus-visible:border-[color:var(--sz-accent-soft)]"
            >
              0
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-sm font-semibold text-balance text-[var(--sz-text)] transition-colors duration-200 group-hover:text-[var(--sz-accent)] group-focus-visible:text-[var(--sz-accent)]">
                Station Zero
              </span>
              <span className="block text-[11px] text-[var(--sz-muted)]">零号站</span>
            </span>
          </Link>
        </div>

        <DesktopNav />

        <HeaderActions />
      </div>
    </header>
  );
}
