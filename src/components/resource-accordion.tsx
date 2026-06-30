"use client";

import { ChevronDown } from "lucide-react";
import { type ReactNode, useState } from "react";

type ResourceAccordionProps = {
  title: string;
  /** 手风琴副标题，如平台说明（可选） */
  subtitle?: string;
  children: ReactNode;
  /** 默认展开；用户可点击标题收起 */
  defaultOpen?: boolean;
};

/**
 * 资源分类手风琴：基于原生 `<details>`，默认展开，支持键盘与读屏。
 */
export function ResourceAccordion({
  title,
  subtitle,
  children,
  defaultOpen = true,
}: ResourceAccordionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <details
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      className="group overflow-hidden rounded-md border border-[color:var(--sz-border)] bg-[var(--sz-surface)]"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-[var(--sz-text)] transition-colors hover:bg-[var(--sz-surface-soft)] [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="text-sm font-medium text-[var(--sz-text-strong)]">{title}</span>
          {subtitle ? (
            <span className="mt-0.5 block text-pretty text-xs leading-5 text-[var(--sz-muted)]">
              {subtitle}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className="size-4 shrink-0 text-[var(--sz-muted)] transition-transform duration-200 ease-out motion-reduce:transition-none group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="border-t border-[color:var(--sz-border)]">{children}</div>
    </details>
  );
}
