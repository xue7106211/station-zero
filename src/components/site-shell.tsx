import Link from "next/link";
import type { ReactNode } from "react";
import { Card } from "@heroui/react";

const navItems = [
  { href: "/movies", label: "影片" },
  { href: "/collections", label: "片单" },
  { href: "/knowledge", label: "高清知识" },
  { href: "/versions", label: "版本追踪" },
  { href: "/about", label: "关于" },
];

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#09090b] text-[#f8f3e8]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(244,201,93,0.1),transparent_32%),radial-gradient(circle_at_80%_20%,rgba(125,92,255,0.1),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.035),transparent_38%)]" />
      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 md:px-10">
        <Link href="/" className="group flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-full border border-[#f4c95d]/40 bg-[#f4c95d]/10 font-mono text-sm text-[#f4c95d]">
            0
          </span>
          <span>
            <span className="block text-sm font-semibold uppercase tracking-[0.28em] text-[#f4c95d]">
              Station Zero
            </span>
            <span className="text-xs text-[#f8f3e8]/55">零号站</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-[#f8f3e8]/70 md:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="transition hover:text-[#f4c95d]">
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="relative z-10">{children}</main>
      <footer className="relative z-10 mx-auto max-w-7xl px-6 py-10 text-sm text-[#f8f3e8]/45 md:px-10">
        <div className="border-t border-white/10 pt-6">
          Station Zero 只做高清观影决策、正版路径和版本知识，不提供侵权下载入口。
        </div>
      </footer>
    </div>
  );
}

export function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="mb-8 max-w-3xl">
      <p className="mb-3 font-mono text-xs uppercase tracking-[0.24em] text-[#f4c95d]">{eyebrow}</p>
      <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">{title}</h2>
      <p className="mt-4 text-base leading-8 text-[#f8f3e8]/65 md:text-lg">{description}</p>
    </div>
  );
}

export function DecisionCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-[#f8f3e8] shadow-2xl shadow-black/20">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#f4c95d]/80">{label}</p>
      <p className="mt-3 text-lg font-medium leading-7 text-[#f8f3e8]">{value}</p>
    </Card>
  );
}
