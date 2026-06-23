import Link from "next/link";
import type { ReactNode } from "react";
import { Card } from "@heroui/react";
import { ThemeToggle } from "./theme-toggle";

const navItems = [
  { href: "/movies", label: "影片" },
  { href: "/collections", label: "片单" },
  { href: "/knowledge", label: "高清知识" },
  { href: "/versions", label: "版本追踪" },
  { href: "/about", label: "关于" },
];

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--sz-bg)] text-[var(--sz-text)]">
      <div className="pointer-events-none fixed inset-0 bg-[var(--sz-page-glow)]" />
      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 md:px-10">
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
        <nav className="hidden items-center gap-6 text-sm text-[var(--sz-muted)] md:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="transition hover:text-[var(--sz-accent)]">
              {item.label}
            </Link>
          ))}
          <ThemeToggle />
        </nav>
      </header>
      <main className="relative z-10">{children}</main>
      <footer className="relative z-10 mx-auto max-w-7xl px-6 py-10 text-sm text-[var(--sz-muted)] md:px-10">
        <div className="border-t border-[color:var(--sz-border)] pt-6">
          Station Zero 只做高清观影决策、正版路径和版本知识，不提供侵权下载入口。
        </div>
      </footer>
    </div>
  );
}

export function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="mb-8 max-w-3xl">
      <p className="mb-3 font-mono text-xs uppercase tracking-[0.24em] text-[var(--sz-accent)]">{eyebrow}</p>
      <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">{title}</h2>
      <p className="mt-4 text-base leading-8 text-[var(--sz-text-soft)] md:text-lg">{description}</p>
    </div>
  );
}

export function DecisionCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="rounded-3xl border border-[color:var(--sz-border)] bg-[var(--sz-card)] p-5 text-[var(--sz-text)] shadow-2xl shadow-[var(--sz-shadow)]">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--sz-accent)]">{label}</p>
      <p className="mt-3 text-lg font-medium leading-7 text-[var(--sz-text)]">{value}</p>
    </Card>
  );
}
