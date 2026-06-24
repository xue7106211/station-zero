"use client";

// 正版观看与购买聚合模块（客户端组件）。
// 因为「复制链接」按钮需要访问浏览器剪贴板 API 并维护复制反馈状态，
// 必须标记为 "use client"，由浏览器侧渲染与交互。
// 基础 UI 一律使用 HeroUI：Card（行容器）、Chip（来源分类标签）、
// Link（超链接名称）、Button（复制按钮）。

import { useState } from "react";
import { Button, Card, Chip, Link } from "@heroui/react";
import { Check, Copy, ExternalLink } from "lucide-react";
import type { VersionSignal, ViewingPath } from "@/lib/content";

// 展示顺序：订阅 → 租赁/购买 → 实体发行 → 网盘 → 磁力 → 资料来源
const CATEGORY_ORDER: ViewingPath["type"][] = ["订阅", "租赁/购买", "实体发行", "网盘", "磁力", "资料来源"];

const VERDICT_STYLES: Record<VersionSignal["verdict"], string> = {
  强推荐: "border-[color:rgb(62_207_142/35%)] bg-[rgb(62_207_142/12%)] text-[var(--sz-success)]",
  推荐: "border-[color:rgb(62_207_142/28%)] bg-[rgb(62_207_142/10%)] text-[var(--sz-success)]",
  够用: "border-[color:var(--sz-border)] bg-[var(--sz-surface-soft)] text-[var(--sz-warn)]",
  待确认: "border-[color:var(--sz-border)] bg-[var(--sz-surface-soft)] text-[var(--sz-subtle)]",
};

export function WatchProviders({
  paths,
  versionSignals = [],
  movieTitle,
}: {
  paths: ViewingPath[];
  versionSignals?: VersionSignal[];
  movieTitle: string;
}) {
  if (!paths.length && !versionSignals.length) {
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
        观看来源
      </h2>

      {versionSignals.length > 0 ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {versionSignals.map((signal) => (
            <VersionSignalRow key={signal.label} signal={signal} />
          ))}
        </div>
      ) : null}

      {paths.length > 0 ? (
      <div className={versionSignals.length > 0 ? "mt-6 space-y-6" : "mt-4 space-y-6"}>
        {grouped.map((group) => (
          <div key={group.category}>
            {/* 来源分类标签：HeroUI Chip */}
            <Chip variant="soft" size="sm" className="mb-2 bg-[var(--sz-surface-muted)] text-[var(--sz-muted)]">
              {group.category}
            </Chip>
            <div className="space-y-2">
              {group.items.map((path, index) => (
                <ProviderRow key={`${path.platform}-${index}`} path={path} movieTitle={movieTitle} />
              ))}
            </div>
          </div>
        ))}
      </div>
      ) : null}
      <p className="mt-4 text-[11px] leading-5 text-[var(--sz-subtle)]">
        正版平台链接来自 TMDB / JustWatch 地区聚合；网盘与磁力链接为人工整理分享，可用性与有效期以分享页或做种情况为准。
      </p>
    </section>
  );
}

function VersionSignalRow({ signal }: { signal: VersionSignal }) {
  return (
    <Card className="detail-surface flex items-start justify-between gap-3 rounded-md border border-[color:var(--sz-border)] bg-[var(--sz-surface)] px-3.5 py-2.5 text-[var(--sz-text)]">
      <div className="min-w-0">
        <p className="text-sm font-medium text-[var(--sz-text-strong)]">{signal.label}</p>
        <p className="mt-1 text-xs leading-5 text-[var(--sz-muted)]">{signal.value}</p>
      </div>
      <span
        className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-medium tracking-wide ${VERDICT_STYLES[signal.verdict]}`}
      >
        {signal.verdict}
      </span>
    </Card>
  );
}

// 单条平台行：HeroUI Card 容器 + Link（名称）+ 辅助描述 +（有链接时）复制按钮。
function ProviderRow({ path, movieTitle }: { path: ViewingPath; movieTitle: string }) {
  const hasUrl = Boolean(path.url);
  const linkLabel = path.type === "磁力" ? movieTitle : path.platform;
  const note =
    path.type === "磁力" && path.platform !== movieTitle
      ? `${path.platform} · ${path.note}`
      : path.note;

  return (
    <Card className="detail-surface flex flex-row items-center justify-between gap-4 rounded bg-[var(--sz-surface)] px-4 py-3 text-[var(--sz-text)]">
      <div className="min-w-0">
        {/* 超链接名称：有 url 时用 HeroUI Link 渲染为外链，否则纯文本 */}
        {hasUrl ? (
          <Link
            href={path.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--sz-link)] hover:underline"
          >
            {linkLabel}
            <ExternalLink className="size-3" />
          </Link>
        ) : (
          <span className="text-sm font-semibold text-[var(--sz-text-strong)]">{linkLabel}</span>
        )}
        {/* 辅助描述 */}
        <p className="mt-1 truncate text-xs text-[var(--sz-muted)]">{note}</p>
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
    <Button variant="outline" size="sm" onPress={handleCopy} className="shrink-0 gap-1 text-xs">
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {copied ? "已复制" : "复制链接"}
    </Button>
  );
}
