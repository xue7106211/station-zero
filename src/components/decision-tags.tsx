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

/**
 * 将 verdict 与 bestWay 拆成独立 Tag：结论用强调色，观看规格用次要标签。
 * bestWay 按 `+`、`/`、`·` 分段（兼容人工录入的多种写法）。
 */
export function DecisionTags({ verdict, bestWay, className }: DecisionTagsProps) {
  const tags = buildDecisionTags(verdict, bestWay);
  if (!tags.length) return null;

  return (
    <div className={className ?? "mt-6 flex flex-wrap gap-2 md:mt-4"}>
      {tags.map((tag, index) => (
        <Chip
          key={`${tag.text}-${index}`}
          variant="soft"
          className={
            tag.emphasis
              ? "border border-[color:var(--sz-accent-soft)] bg-[var(--sz-accent-faint)] px-3 py-1.5 text-xs font-semibold tracking-wide text-[var(--sz-accent)]"
              : "border border-[color:var(--sz-border)] bg-[var(--sz-surface-soft)] px-3 py-1.5 text-xs text-[var(--sz-text-soft)]"
          }
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
