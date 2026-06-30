"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActiveRoute, navItems, type NavItem } from "@/lib/nav-items";
import { MovieSearchInput } from "./movie-search-input";
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
 * 桌面端居中 pill 导航。
 */
export function DesktopNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="主导航" className="site-header__nav hidden shrink-0 items-center rounded-full p-0.5 md:inline-flex">
      {navItems.map((item) => {
        const active = isActiveRoute(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className="site-header__nav-link pressable rounded-full px-3 py-1 text-sm transition-[color,background-color,box-shadow] duration-200 ease-out motion-reduce:transition-none focus-visible:outline-none"
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * 头部右侧操作区：主题切换 + 移动端菜单。
 */
export function HeaderActions() {
  const pathname = usePathname();

  return (
    <div className="site-header__actions flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-2.5">
      <div className="site-header__search hidden min-w-0 md:flex">
        <MovieSearchInput compact />
      </div>
      <div className="site-header__theme hidden md:block">
        <ThemeToggle />
      </div>
      <MobileNav pathname={pathname} />
    </div>
  );
}

/**
 * 站点顶部主导航（兼容导出；布局由 `SiteHeader` 拆分承载）。
 */
export function SiteNav() {
  return (
    <>
      <DesktopNav />
      <HeaderActions />
    </>
  );
}
