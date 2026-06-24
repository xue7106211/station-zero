import { Chip } from "@heroui/react";

type DecisionTag = {
  text: string;
  emphasis: boolean;
};

export type DecisionTagsProps = {
  verdict: string;
  bestWay: string;
  className?: string;
};

/** 圆角矩形基底：覆盖 HeroUI Chip 默认胶囊圆角 */
const tagBase =
  "!rounded-md inline-flex items-center border px-2.5 py-1 text-xs leading-snug";

const tagEmphasis = `${tagBase} border-[color:var(--sz-accent-soft)] bg-[var(--sz-accent-faint)] font-medium text-[var(--sz-accent)] shadow-[inset_0_1px_0_rgb(255_255_255/10%)]`;

const tagMuted = `${tagBase} border-[color:var(--sz-border)] bg-[rgb(var(--sz-bg-rgb)/55%)] text-[var(--sz-muted)] backdrop-blur-[2px]`;

/**
 * 将 verdict 与 bestWay 拆成独立 Tag：结论用强调色，观看规格用次要标签。
 * bestWay 按 `+`、`/`、`·` 分段（兼容人工录入的多种写法）。
 */
export function DecisionTags({ verdict, bestWay, className }: DecisionTagsProps) {
  const tags = buildDecisionTags(verdict, bestWay);
  if (!tags.length) return null;

  return (
    <div className={className ?? "mt-6 flex flex-wrap gap-x-2 gap-y-1.5 md:mt-4"}>
      {tags.map((tag, index) => (
        <Chip
          key={`${tag.text}-${index}`}
          variant="soft"
          className={tag.emphasis ? tagEmphasis : tagMuted}
        >
          {tag.text}
        </Chip>
      ))}
    </div>
  );
}

function buildDecisionTags(verdict: string, bestWay: string): DecisionTag[] {
  const tags: DecisionTag[] = [];
  const trimmedVerdict = verdict.trim();
  if (trimmedVerdict) tags.push({ text: trimmedVerdict, emphasis: true });

  bestWay
    .split(/\s*[+/·]\s*/)
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => tags.push({ text: part, emphasis: false }));

  return tags;
}
