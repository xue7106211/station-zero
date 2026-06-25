"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { SiteNav } from "./site-nav";

const scrollThreshold = 8;

function subscribeToScroll(onStoreChange: () => void) {
  window.addEventListener("scroll", onStoreChange, { passive: true });
  return () => window.removeEventListener("scroll", onStoreChange);
}

function getScrollSnapshot() {
  return window.scrollY > scrollThreshold;
}

function getScrollServerSnapshot() {
  return false;
}

/**
 * 站点吸顶头部。
 *
 * 始终 `sticky top-0`，长页面滚动时导航保持可达。位于页面顶部时保持通透（无背景、透明边框）；
 * 一旦向下滚动就切换为半透明背景 + `backdrop-blur` + 底部细边框，让导航与内容分层、不被遮挡。
 * 高度需与 `globals.css` 中 `--sz-header-height` 保持一致，供详情页 sticky 侧栏避让。
 *
 * 抽成客户端组件，是因为滚动位置需要读取 `window.scrollY` 切换 `scrolled` 样式。
 *
 * @returns 吸顶头部 `<header>`
 */
export function SiteHeader() {
  const scrolled = useSyncExternalStore(subscribeToScroll, getScrollSnapshot, getScrollServerSnapshot);

  return (
    <header
      className={`sticky top-0 z-30 border-b pt-[env(safe-area-inset-top,0px)] ${
        scrolled
          ? "border-[color:var(--sz-border)] bg-[var(--sz-header-bg)] backdrop-blur-xl"
          : "border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex min-h-[var(--sz-header-height)] w-full max-w-7xl items-center justify-between px-6 md:px-10">
        <Link href="/" className="group flex shrink-0 items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-full border border-[color:var(--sz-accent-soft)] bg-[var(--sz-accent-faint)] font-mono text-sm text-[var(--sz-accent)]">
            0
          </span>
          <span>
            <span className="block text-sm font-semibold uppercase tracking-[0.28em] text-[var(--sz-accent)]">
              Station Zero
            </span>
            <span className="text-xs text-[var(--sz-muted)]">零号站</span>
          </span>
        </Link>
        <SiteNav />
      </div>
    </header>
  );
}
