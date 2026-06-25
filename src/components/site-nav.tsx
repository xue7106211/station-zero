"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./theme-toggle";

const MobileNav = dynamic(() => import("./mobile-nav").then((mod) => ({ default: mod.MobileNav })), {
  ssr: false,
});

/** 顶部主导航项：`href` 为路由路径，`label` 为中文显示名。 */
export type NavItem = { href: string; label: string };

/**
 * 站点主导航条目（数组顺序即展示顺序）。
 * 新增 / 调整 / 排序顶部入口时，改这里即可，桌面端与移动端抽屉共用同一份数据。
 */
export const navItems: NavItem[] = [
  { href: "/movies", label: "影片" },
  { href: "/collections", label: "片单" },
  { href: "/knowledge", label: "高清知识" },
  { href: "/about", label: "关于" },
];

/**
 * 判断某个导航项是否为「当前页」。
 *
 * 规则：完全相等命中首页等精确路由；`startsWith(href + "/")` 让详情页也高亮父级入口
 * （例如 `/movies/dune-part-two` 命中 `/movies`）。
 *
 * @param pathname - 当前路由（来自 usePathname）
 * @param href - 导航项目标路径
 * @returns 是否处于激活态
 */
function isActiveRoute(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export { isActiveRoute };

/**
 * 站点顶部主导航。
 *
 * 客户端组件：用 `usePathname()` 计算激活态。桌面端（md 及以上）横向导航，当前路由用强调色
 * + 底部指示线高亮；移动端折叠为汉堡按钮，点击展开 HeroUI Drawer 抽屉菜单。主题切换按钮始终可见。
 *
 * @returns 顶部主导航右侧操作区
 */
export function SiteNav() {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-2 sm:gap-3 md:gap-6">
      {/* 桌面端横向导航：仅在 md 及以上显示 */}
      <nav className="hidden items-center gap-6 text-sm md:flex">
        {navItems.map((item) => {
          const active = isActiveRoute(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`group relative py-1 transition-colors hover:text-[var(--sz-accent)] focus-visible:outline-none focus-visible:text-[var(--sz-accent)] ${
                active ? "text-[var(--sz-accent)]" : "text-[var(--sz-muted)]"
              }`}
            >
              {item.label}
              {/* 底部指示线：激活态常显；非激活态 hover 时滑出 */}
              <span
                aria-hidden
                className={`pointer-events-none absolute -bottom-0.5 left-0 h-px w-full origin-left rounded-full bg-[var(--sz-accent)] transition-transform duration-300 ${
                  active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                }`}
              />
            </Link>
          );
        })}
      </nav>

      {/* 主题切换按钮（深/浅），桌面与移动端都可见 */}
      <ThemeToggle />

      <MobileNav pathname={pathname} />
    </div>
  );
}
