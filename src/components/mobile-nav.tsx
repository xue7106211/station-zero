"use client";

import Link from "next/link";
import { Drawer } from "@heroui/react";
import { Menu, X } from "lucide-react";
import { isActiveRoute, navItems } from "@/lib/nav-items";

/** 移动端抽屉导航（HeroUI Drawer），仅客户端渲染以避免 React Aria ID hydration 不一致。 */
export function MobileNav({ pathname }: { pathname: string }) {
  return (
    <Drawer>
      <Drawer.Trigger
        aria-label="打开导航菜单"
        className="pressable flex size-9 items-center justify-center rounded-full border border-[color:var(--sz-border)] bg-[var(--sz-surface-soft)] text-[var(--sz-text)] outline-none focus-visible:border-[color:var(--sz-accent-soft)] md:hidden"
      >
        <Menu className="size-5" aria-hidden />
      </Drawer.Trigger>

      <Drawer.Backdrop className="bg-[rgb(0_0_0/45%)] backdrop-blur-sm">
        <Drawer.Content
          placement="right"
          className="w-[78%] max-w-xs border-l border-[color:var(--sz-border)] bg-[var(--sz-bg)] text-[var(--sz-text)]"
        >
          <Drawer.Dialog className="flex h-full flex-col outline-none">
            {({ close }) => (
              <>
                <Drawer.Header className="flex items-center justify-between px-6 pt-6">
                  <span className="font-mono text-xs uppercase tracking-[0.28em] text-[var(--sz-accent)]">
                    Station Zero
                  </span>
                  <Drawer.CloseTrigger
                    aria-label="关闭菜单"
                    className="pressable flex size-9 items-center justify-center rounded-full border border-[color:var(--sz-border)] bg-[var(--sz-surface-soft)] text-[var(--sz-text)] outline-none"
                  >
                    <X className="size-5" aria-hidden />
                  </Drawer.CloseTrigger>
                </Drawer.Header>
                <Drawer.Body className="px-4 py-6">
                  <nav className="flex flex-col gap-1">
                    {navItems.map((item) => {
                      const active = isActiveRoute(pathname, item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => close()}
                          aria-current={active ? "page" : undefined}
                          className={`pressable flex items-center rounded-2xl border-l-2 px-4 py-3 text-base transition-colors ${
                            active
                              ? "border-[var(--sz-accent)] bg-[var(--sz-accent-faint)] text-[var(--sz-accent)]"
                              : "border-transparent text-[var(--sz-text-soft)] hover:bg-[var(--sz-surface-soft)] hover:text-[var(--sz-text)]"
                          }`}
                        >
                          {item.label}
                        </Link>
                      );
                    })}
                  </nav>
                </Drawer.Body>
              </>
            )}
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
}
