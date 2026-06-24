"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SiteNav } from "./site-nav";

/**
 * 站点吸顶头部。
 *
 * 始终 `sticky top-0`，长页面滚动时导航保持可达。位于页面顶部时保持通透（无背景、透明边框）；
 * 一旦向下滚动就切换为半透明背景 + `backdrop-blur` + 底部细边框，让导航与内容分层、不被遮挡。
 *
 * 抽成客户端组件，是因为「滚动后才加效果」需要监听 `window.scroll` 维护 `scrolled` 状态。
 *
 * @returns 吸顶头部 `<header>`
 */
export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll(); // 首帧同步一次，处理刷新后已处于滚动位置的情况
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-30 border-b transition-colors duration-300 ${
        scrolled
          ? "border-[color:var(--sz-border)] bg-[var(--sz-header-bg)] backdrop-blur-xl"
          : "border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4 md:px-10 md:py-5">
        {/* 站点 Logo：圆形「0」徽标 + 中英文站名，点击回首页 */}
        <Link href="/" className="group flex items-center gap-3">
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
        {/* 主导航：桌面端横向导航 + 主题切换 + 移动端汉堡菜单 */}
        <SiteNav />
      </div>
    </header>
  );
}
