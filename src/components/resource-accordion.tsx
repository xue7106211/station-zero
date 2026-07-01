"use client";

import { ChevronDown } from "lucide-react";
import { type ReactNode, useId, useState } from "react";

type ResourceAccordionProps = {
  title: string;
  /** 手风琴副标题，如平台说明（可选） */
  subtitle?: string;
  children: ReactNode;
  /** 默认展开；用户可点击标题收起 */
  defaultOpen?: boolean;
};

/**
 * 资源分类手风琴：默认展开，支持收起。
 * 内容区用 `grid-template-rows: 0fr → 1fr` 过渡，避免 height: auto 跳切。
 */
export function ResourceAccordion({
  title,
  subtitle,
  children,
  defaultOpen = true,
}: ResourceAccordionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <div className="overflow-hidden rounded-md border border-[color:var(--sz-border)] bg-[var(--sz-surface)]">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left text-[var(--sz-text)] transition-colors hover:bg-[var(--sz-surface-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sz-accent-soft)]"
      >
        <span className="min-w-0">
          <span className="text-sm font-medium text-[var(--sz-text-strong)]">{title}</span>
          {subtitle ? (
            <span className="mt-0.5 block text-pretty text-xs leading-5 text-[var(--sz-muted)]">
              {subtitle}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-[var(--sz-muted)] transition-transform duration-200 ease-out motion-reduce:transition-none ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </button>
      <div
        id={panelId}
        className={`grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-[color:var(--sz-border)]">{children}</div>
        </div>
      </div>
    </div>
  );
}
