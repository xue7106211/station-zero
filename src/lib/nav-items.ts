/** 站点主导航项：`href` 为路由路径，`label` 为中文显示名。 */
export type NavItem = { href: string; label: string };

/** 顶部与页脚共用的导航条目（数组顺序即展示顺序）。 */
export const navItems: NavItem[] = [
  { href: "/movies", label: "影片" },
  { href: "/collections", label: "片单" },
  { href: "/knowledge", label: "高清知识" },
  { href: "/about", label: "关于" },
];

/** 判断导航项是否为当前路由（含子路径，如 `/movies/[slug]`）。 */
export function isActiveRoute(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
