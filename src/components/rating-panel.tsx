import type { CSSProperties } from "react";
import { Star } from "lucide-react";

export type RatingSourceKey = "douban" | "imdb" | "rottenTomatoes";

export type RatingPanelItem = {
  key: RatingSourceKey;
  value: string;
};

export type RatingPanelProps = {
  items: RatingPanelItem[];
  className?: string;
};

const platformMeta: Record<
  RatingSourceKey,
  { label: string; hint: string; abbr: string; accent: string; accentFaint: string }
> = {
  douban: {
    label: "豆瓣",
    hint: "中文社区",
    abbr: "豆",
    accent: "#3ecf8e",
    accentFaint: "rgb(62 207 142 / 16%)",
  },
  imdb: {
    label: "IMDb",
    hint: "全球影迷",
    abbr: "IM",
    accent: "#f5c518",
    accentFaint: "rgb(245 197 24 / 16%)",
  },
  rottenTomatoes: {
    label: "烂番茄",
    hint: "媒体/观众",
    abbr: "番",
    accent: "#fa320a",
    accentFaint: "rgb(250 50 10 / 16%)",
  },
};

/**
 * 右栏跨平台评分面板：平台色标识 + 分数强调 + 细进度条。
 */
export function RatingPanel({ items, className }: RatingPanelProps) {
  return (
    <section className={className} aria-label="跨平台评分">
      <div className="flex items-center gap-1.5 border-b border-[color:var(--sz-border-strong)] pb-2 text-[11px] uppercase tracking-[0.16em] text-[var(--sz-muted)]">
        <Star className="size-3 text-[var(--sz-accent)]" aria-hidden />
        评分
      </div>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item.key}>
            <RatingSourceRow sourceKey={item.key} value={item.value} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function RatingSourceRow({
  sourceKey,
  value,
}: {
  sourceKey: RatingSourceKey;
  value: string;
}) {
  const meta = platformMeta[sourceKey];
  const parsed = parseRatingValue(value);
  const missing = parsed.ratio === null;

  return (
    <div
      className={
        missing
          ? "relative overflow-hidden rounded-md border border-dashed border-[color:var(--sz-border)] bg-[rgb(var(--sz-bg-rgb)/40%)]"
          : "relative overflow-hidden rounded-md border border-[color:var(--sz-border)] bg-[var(--sz-surface)] shadow-[inset_0_1px_0_var(--sz-inset)]"
      }
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{ background: missing ? "var(--sz-border)" : meta.accent }}
      />

      <div className="flex items-start justify-between gap-2 py-2.5 pl-3.5 pr-3">
        <div className="flex min-w-0 items-start gap-2">
          <span
            className="flex size-7 shrink-0 items-center justify-center rounded-md border text-[10px] font-mono font-semibold leading-none"
            style={{
              borderColor: `${meta.accent}55`,
              background: meta.accentFaint,
              color: meta.accent,
            }}
          >
            {meta.abbr}
          </span>
          <div className="min-w-0 pt-0.5">
            <p className="text-sm font-medium leading-none text-[var(--sz-text-strong)]">{meta.label}</p>
            <p className="mt-1 text-pretty text-[10px] tracking-[0.08em] text-[var(--sz-muted)]">{meta.hint}</p>
          </div>
        </div>

        <div className="shrink-0 pt-0.5 text-right">
          {missing ? (
            <span className="font-mono text-[11px] tracking-[0.12em] text-[var(--sz-subtle)]">待收录</span>
          ) : (
            <p
              className="font-mono text-xl font-semibold tabular-nums leading-none"
              style={{ color: meta.accent }}
            >
              {parsed.display}
              {parsed.suffix ? (
                <span className="ml-0.5 text-xs font-normal text-[var(--sz-muted)]">{parsed.suffix}</span>
              ) : null}
            </p>
          )}
        </div>
      </div>

      {!missing && parsed.ratio !== null ? (
        <div
          className="mx-3 mb-2.5 h-[3px] overflow-hidden rounded-full bg-[var(--sz-border)]"
          role="progressbar"
          aria-valuenow={Math.round(parsed.ratio * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${meta.label} ${parsed.display}${parsed.suffix ?? ""}`}
        >
          <div
            className="rating-bar h-full w-full rounded-full"
            style={
              {
                "--rating-scale": parsed.ratio,
                background: meta.accent,
              } as CSSProperties
            }
          />
        </div>
      ) : null}
    </div>
  );
}

function parseRatingValue(value: string): { display: string; ratio: number | null; suffix?: string } {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "待补充" || trimmed === "—" || trimmed === "0.0" || trimmed === "0") {
    return { display: "—", ratio: null };
  }

  const percentMatch = trimmed.match(/^(\d+(?:\.\d+)?)%$/);
  if (percentMatch) {
    const num = Number(percentMatch[1]);
    return { display: percentMatch[1], ratio: num / 100, suffix: "%" };
  }

  const numeric = Number.parseFloat(trimmed);
  if (!Number.isNaN(numeric) && numeric > 0) {
    return { display: trimmed, ratio: Math.min(numeric / 10, 1) };
  }

  return { display: "—", ratio: null };
}
