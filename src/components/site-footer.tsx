import Link from "next/link";
import { navItems } from "@/lib/nav-items";

/**
 * 站点页脚：次要导航 + 合规声明。
 *
 * 与 `SiteHeader` 共用 `navItems`，在页面底部提供二次可达入口；
 * 合规文案说明本站只做观影决策，不提供侵权下载。
 */
export function SiteFooter() {
  return (
    <footer className="relative z-10 mx-auto max-w-7xl px-6 pt-12 pb-[max(2.5rem,env(safe-area-inset-bottom,0px))] md:px-10">
      <div className="border-t border-[color:var(--sz-border)] pt-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="shrink-0">
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-[var(--sz-accent)]">Station Zero</p>
            <p className="mt-1 text-xs text-[var(--sz-muted)]">零号站</p>
          </div>

          <nav aria-label="页脚导航" className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-[var(--sz-muted)] transition-colors duration-200 ease-out motion-reduce:transition-none hover:text-[var(--sz-accent)] focus-visible:outline-none focus-visible:text-[var(--sz-accent)]"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <p className="mt-6 max-w-2xl text-pretty text-sm leading-7 text-[var(--sz-muted)]">
          Station Zero 只做高清观影决策、正版路径和版本知识，不提供侵权下载入口。
        </p>
      </div>
    </footer>
  );
}
