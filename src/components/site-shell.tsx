import type { ReactNode } from "react";
import { Card } from "@heroui/react";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

/**
 * 站点统一外壳：为所有页面提供一致的背景、顶部导航与页脚。
 *
 * 布局结构（从外到内）：
 * 1. 根容器铺满视口高度，用语义 token `--sz-bg` / `--sz-text` 着色，自动适配深/浅主题；
 * 2. 一层固定定位的 `--sz-page-glow` 氛围光晕，`pointer-events-none` 不拦截交互；
 * 3. `SiteHeader`（吸顶头部，含 Logo + 导航 + 主题切换）、`main`（页面内容）、`SiteFooter`（合规声明与次要导航）。
 *
 * 内容层统一用 `relative z-10` 抬到光晕之上，避免被背景层遮挡。
 *
 * @param props - 组件属性
 * @param props.children - 注入到 `<main>` 的页面内容
 * @returns 包裹页面内容的站点外壳
 */
export function SiteShell({ children }: { children: ReactNode }) {
  return (
    // 根容器：占满视口高度，背景与前景色走主题 token，深/浅模式自动切换
    <div className="min-h-screen bg-[var(--sz-bg)] text-[var(--sz-text)]">
      {/* 全屏氛围光晕背景层：固定定位、纯装饰，pointer-events-none 不拦截点击 */}
      <div className="pointer-events-none fixed inset-0 bg-[var(--sz-page-glow)]" />
      {/* 顶部吸顶导航（客户端组件，滚动后加 backdrop-blur + 底部细边框） */}
      <SiteHeader />
      {/* 页面主体内容容器 */}
      <main className="relative z-10">{children}</main>
      <SiteFooter />
    </div>
  );
}

export function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="mb-8 max-w-3xl">
      <p className="mb-3 font-mono text-xs uppercase tracking-[0.24em] text-[var(--sz-accent)]">{eyebrow}</p>
      <h2 className="text-balance text-3xl font-semibold tracking-tight md:text-5xl">{title}</h2>
      <p className="mt-4 text-pretty text-base leading-8 text-[var(--sz-text-soft)] md:text-lg">{description}</p>
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
