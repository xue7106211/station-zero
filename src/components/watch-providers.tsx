"use client";

// 正版观看与购买聚合模块（客户端组件）。
// 因为「复制链接」按钮需要访问浏览器剪贴板 API 并维护复制反馈状态，
// 必须标记为 "use client"，由浏览器侧渲染与交互。
// 基础 UI 一律使用 HeroUI：Card（行容器）、Chip（来源分类标签）、
// Link（超链接名称）、Button（复制按钮）。

import { useState } from "react";
import { Button, Card, Chip, Link } from "@heroui/react";
import type { ViewingPath } from "@/lib/content";

// 展示顺序：订阅 → 租赁/购买 → 实体发行 → 资料来源
const CATEGORY_ORDER: ViewingPath["type"][] = ["订阅", "租赁/购买", "实体发行", "资料来源"];

export function WatchProviders({ paths }: { paths: ViewingPath[] }) {
  if (!paths.length) {
    return null;
  }

  // 按「来源分类」分组，保持固定展示顺序，空分组不渲染。
  const grouped = CATEGORY_ORDER.map((category) => ({
    category,
    items: paths.filter((path) => path.type === category),
  })).filter((group) => group.items.length > 0);

  return (
    <section className="mt-10">
      <h2 className="border-b border-[color:var(--sz-border-strong)] pb-3 text-sm font-semibold uppercase tracking-[0.16em] text-[var(--sz-text-strong)]">
        正版观看与购买
      </h2>
      <div className="mt-4 space-y-6">
        {grouped.map((group) => (
          <div key={group.category}>
            {/* 来源分类标签：HeroUI Chip */}
            <Chip variant="soft" size="sm" className="mb-2 bg-[var(--sz-surface-muted)] text-[var(--sz-muted)]">
              {group.category}
            </Chip>
            <div className="space-y-2">
              {group.items.map((path, index) => (
                <ProviderRow key={`${path.platform}-${index}`} path={path} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-[11px] leading-5 text-[var(--sz-subtle)]">
        链接来自 TMDB / JustWatch 的地区聚合页，平台可用性、价格与地区以各正版平台实时结果为准。
      </p>
    </section>
  );
}

// 单条平台行：HeroUI Card 容器 + Link（名称）+ 辅助描述 +（有链接时）复制按钮。
function ProviderRow({ path }: { path: ViewingPath }) {
  const hasUrl = Boolean(path.url);

  return (
    <Card className="detail-surface flex flex-row items-center justify-between gap-4 rounded bg-[var(--sz-surface)] px-4 py-3 text-[var(--sz-text)]">
      <div className="min-w-0">
        {/* 超链接名称：有 url 时用 HeroUI Link 渲染为外链，否则纯文本 */}
        {hasUrl ? (
          <Link
            href={path.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-[var(--sz-link)] hover:underline"
          >
            {path.platform}
          </Link>
        ) : (
          <span className="text-sm font-semibold text-[var(--sz-text-strong)]">{path.platform}</span>
        )}
        {/* 辅助描述 */}
        <p className="mt-1 truncate text-xs text-[var(--sz-muted)]">{path.note}</p>
      </div>
      {hasUrl ? <CopyButton url={path.url as string} /> : null}
    </Card>
  );
}

// 复制链接按钮：HeroUI Button（react-aria，事件用 onPress）。
// 点击后写入剪贴板，并给出 2 秒「已复制」反馈。
function CopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 剪贴板不可用（如非 HTTPS 环境或权限被拒）时静默失败，不阻塞页面。
    }
  }

  return (
    <Button variant="outline" size="sm" onPress={handleCopy} className="shrink-0 text-xs">
      {copied ? "已复制" : "复制链接"}
    </Button>
  );
}
