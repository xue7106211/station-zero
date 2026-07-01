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
      {/* 外层 overflow-hidden：裁剪 grid 展开动画的溢出 */}
      {/* 标题行：用 <button> 而非 <div>，自带键盘聚焦与 aria 语义 */}
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left text-[var(--sz-text)] transition-colors hover:bg-[var(--sz-surface-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sz-accent-soft)]"
      >
        <span className="min-w-0">
          <span className="text-sm font-medium text-[var(--sz-text-strong)]">
            {title}
          </span>
          {/* subtitle 可选：三元 + null，无副标题时不占 DOM */}
          {subtitle ? (
            <span className="mt-0.5 block text-pretty text-xs leading-5 text-[var(--sz-muted)]">
              {subtitle}
            </span>
          ) : null}
        </span>
        {/* 模板字符串拼接 className；open 时 rotate-180 表示已展开 */}
        <ChevronDown
          className={`size-4 shrink-0 text-[var(--sz-muted)] transition-transform duration-200 ease-out motion-reduce:transition-none ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </button>
      
      {/*
        内容区动画：grid-template-rows 在 0fr ↔ 1fr 间过渡。
        - 0fr：行高为 0，配合内层 overflow-hidden 收起内容
        - 1fr：行高占满内容，展开
        避免 height: auto 无法插值导致的跳切。
      */}
      <div
        id={panelId}
        className={`grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        {/* 中间层 overflow-hidden：grid 行收缩时裁切子内容 */}
        <div className="overflow-hidden">
          <div className="border-t border-[color:var(--sz-border)]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
