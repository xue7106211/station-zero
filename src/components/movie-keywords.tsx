import { Chip } from "@heroui/react";

const keywordTagClass =
  "!rounded-md inline-flex items-center border border-[color:var(--sz-border)] bg-[rgb(var(--sz-bg-rgb)/55%)] px-2.5 py-1 text-xs leading-snug text-[var(--sz-muted)] backdrop-blur-[2px]";

type MovieKeywordsProps = {
  keywords?: string[];
  className?: string;
};

/** TMDB 关键词标签；无数据时不渲染。 */
export function MovieKeywords({ keywords, className }: MovieKeywordsProps) {
  const items = keywords?.map((keyword) => keyword.trim()).filter(Boolean) ?? [];
  if (!items.length) return null;

  return (
    <div className={className}>
      <p className="mb-2 text-xs text-[var(--sz-muted)]">关键词</p>
      <div className="flex flex-wrap gap-x-2 gap-y-1.5">
        {items.map((keyword) => (
          <Chip key={keyword} variant="soft" className={keywordTagClass}>
            {keyword}
          </Chip>
        ))}
      </div>
    </div>
  );
}
