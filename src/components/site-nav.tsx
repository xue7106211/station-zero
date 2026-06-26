"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActiveRoute, navItems, type NavItem } from "@/lib/nav-items";
import { ThemeToggle } from "./theme-toggle";

const MobileNav = dynamic(() => import("./mobile-nav").then((mod) => ({ default: mod.MobileNav })), {
  ssr: false,
});

export type { NavItem };
export { navItems };

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
    <div className="flex shrink-0 items-center gap-2 sm:gap-3 md:gap-6">
      <nav aria-label="主导航" className="hidden items-center gap-6 text-sm md:flex">
        {navItems.map((item) => {
          const active = isActiveRoute(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`group relative py-1 transition-colors duration-200 ease-out motion-reduce:transition-none hover:text-[var(--sz-accent)] focus-visible:outline-none focus-visible:text-[var(--sz-accent)] ${
                active ? "text-[var(--sz-accent)]" : "text-[var(--sz-muted)]"
              }`}
            >
              {item.label}
              <span
                aria-hidden
                className={`pointer-events-none absolute -bottom-0.5 left-0 h-px w-full origin-left rounded-full bg-[var(--sz-accent)] transition-transform duration-200 ease-out motion-reduce:transition-none ${
                  active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                }`}
              />
            </Link>
          );
        })}
      </nav>

      <ThemeToggle />

      <MobileNav pathname={pathname} />
    </div>
  );
}
