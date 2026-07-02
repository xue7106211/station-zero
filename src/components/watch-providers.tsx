"use client";

import { useState } from "react";
import { Button, Link } from "@heroui/react";
import { Check, Copy } from "lucide-react";
import { ResourceAccordion } from "@/components/resource-accordion";
import type { ViewingPath } from "@/lib/content";
import { formatProviderRow } from "@/lib/viewing-path-label";

const CATEGORY_ORDER: ViewingPath["type"][] = [
  "订阅",
  "租赁/购买",
  "实体发行",
  "网盘",
  "磁力",
  "资料来源",
];

const LEGAL_CATEGORIES = new Set<ViewingPath["type"]>(["订阅", "租赁/购买", "实体发行"]);

const CATEGORY_SUBTITLES: Partial<Record<ViewingPath["type"], string>> = {
  订阅: "正版流媒体订阅入口，以平台实际片库为准。",
  "租赁/购买": "数字租赁或购买，画质以平台标识为准。",
  网盘: "网盘分享：复制链接后在对应客户端打开。",
  磁力: "磁力链接：复制后用下载工具打开，可用性与做种情况以实际为准。",
};

const rowTagBase =
  "inline-flex h-6 shrink-0 items-center rounded-md border px-2 text-xs leading-none";

const sizeTagClass = `${rowTagBase} border-[color:var(--sz-accent-soft)] bg-[var(--sz-accent-faint)] font-medium tabular-nums text-[var(--sz-accent)]`;

const specTagClass = `${rowTagBase} border-[color:var(--sz-border)] bg-[var(--sz-surface-soft)] text-[var(--sz-muted)]`;

export function WatchProviders({
  paths,
  movieTitle,
}: {
  paths: ViewingPath[];
  movieTitle: string;
}) {
  if (!paths.length) {
    return null;
  }

  const grouped = CATEGORY_ORDER.map((category) => ({
    category,
    items: paths.filter((path) => path.type === category),
  })).filter((group) => group.items.length > 0);

  const legalGroups = grouped.filter((group) => LEGAL_CATEGORIES.has(group.category));
  const resourceGroups = grouped.filter((group) => !LEGAL_CATEGORIES.has(group.category));

  return (
    <section className="mt-10 space-y-8">
      {legalGroups.length > 0 ? (
        <PathAccordionSection title="观看来源" groups={legalGroups} movieTitle={movieTitle} />
      ) : null}

      {resourceGroups.length > 0 ? (
        <PathAccordionSection title="资源下载" groups={resourceGroups} movieTitle={movieTitle} />
      ) : null}

      <p className="text-pretty text-[11px] leading-5 text-[var(--sz-subtle)]">
        正版平台链接来自 TMDB / JustWatch 地区聚合；网盘与磁力链接为人工整理分享，可用性与有效期以分享页或做种情况为准。
      </p>
    </section>
  );
}

function PathAccordionSection({
  title,
  groups,
  movieTitle,
}: {
  title: string;
  groups: Array<{ category: ViewingPath["type"]; items: ViewingPath[] }>;
  movieTitle: string;
}) {
  return (
    <div>
      <h2 className="border-b border-[color:var(--sz-border-strong)] pb-3 text-sm font-semibold uppercase tracking-[0.16em] text-[var(--sz-text-strong)]">
        {title}
      </h2>
      <div className="mt-4 space-y-3">
        {groups.map((group) => (
          <ResourceAccordion
            key={group.category}
            title={group.category}
            subtitle={CATEGORY_SUBTITLES[group.category]}
            defaultOpen
          >
            <ul className="divide-y divide-[color:var(--sz-border)]">
              {group.items.map((path, index) => (
                <li key={`${path.platform}-${index}`}>
                  <ProviderRow path={path} movieTitle={movieTitle} />
                </li>
              ))}
            </ul>
          </ResourceAccordion>
        ))}
      </div>
    </div>
  );
}

function ProviderRow({ path, movieTitle }: { path: ViewingPath; movieTitle: string }) {
  const hasUrl = Boolean(path.url);
  const { detail, specTags, sizeLabel, tooltip } = formatProviderRow(path, movieTitle);
  const hasMetaRow = Boolean(sizeLabel || specTags?.length || hasUrl);

  return (
    <div className="flex flex-col gap-2.5 px-4 py-3">
      <p
        className="min-w-0 text-pretty text-sm leading-6 text-[var(--sz-text-soft)] line-clamp-2"
        title={tooltip && tooltip !== detail ? tooltip : undefined}
      >
        {detail}
      </p>
      {hasMetaRow ? (
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            {sizeLabel ? <span className={sizeTagClass}>{sizeLabel}</span> : null}
            {specTags?.map((tag) => (
              <span key={tag} className={specTagClass}>
                {tag}
              </span>
            ))}
          </div>
          {hasUrl ? (
            <div className="flex shrink-0 items-center gap-2">
              <CopyButton url={path.url as string} />
              <DownloadLink url={path.url as string} />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function CopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 剪贴板不可用时不阻塞页面。
    }
  }

  return (
    <Button variant="outline" size="sm" onPress={handleCopy} className="min-w-[4.5rem] gap-1 text-xs">
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {copied ? "已复制" : "复制"}
    </Button>
  );
}

function DownloadLink({ url }: { url: string }) {
  return (
    <Link
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-w-[4.5rem] items-center justify-center rounded-md bg-[var(--sz-accent)] px-3 py-1.5 text-xs font-medium text-[var(--sz-accent-contrast)] transition-opacity hover:opacity-90"
    >
      下载
    </Link>
  );
}
