import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";

/** 顶部主导航项：`href` 为路由路径，`label` 为中文显示名。 */
export type NavItem = { href: string; label: string };

/**
 * 站点主导航条目（数组顺序即展示顺序）。
 * 新增 / 调整 / 排序顶部入口时，改这里即可，无需改动渲染逻辑。
 */
export const navItems: NavItem[] = [
  { href: "/movies", label: "影片" },
  { href: "/collections", label: "片单" },
  { href: "/knowledge", label: "高清知识" },
  { href: "/versions", label: "版本追踪" },
  { href: "/about", label: "关于" },
];

/**
 * 站点顶部主导航。
 *
 * 从 `SiteShell` 抽离为独立组件，便于单独迭代（例如：激活态高亮、移动端汉堡/抽屉菜单、
 * 滚动时的样式变化）。当前实现为桌面端（md 及以上）横向导航 + 主题切换按钮，移动端隐藏。
 *
 * @returns 顶部主导航 `<nav>`
 */
export function SiteNav() {
  return (
    // 主导航：仅在桌面端（md 及以上）显示；移动端隐藏（后续可在此扩展移动端菜单）
    <nav className="hidden items-center gap-6 text-sm text-[var(--sz-muted)] md:flex">
      {/* 遍历 navItems 渲染导航链接，hover 时变为强调色 */}
      {navItems.map((item) => (
        <Link key={item.href} href={item.href} className="transition hover:text-[var(--sz-accent)]">
          {item.label}
        </Link>
      ))}
      {/* 深/浅主题切换按钮（客户端组件） */}
      <ThemeToggle />
    </nav>
  );
}
