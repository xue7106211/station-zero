import { Card } from "@heroui/react";
import { knowledgeEntries } from "@/lib/content";
import { SectionHeading, SiteShell } from "@/components/site-shell";

export default function KnowledgePage() {
  return (
    <SiteShell>
      <section className="mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-20">
        <SectionHeading eyebrow="Knowledge" title="高清知识库" description="解释格式、版本和设备概念，让用户知道什么时候值得追求更高规格。" />
        <div className="space-y-5">
          {knowledgeEntries.map((entry) => (
            <Card.Root<"article"> key={entry.slug} className="rounded-3xl border border-[color:var(--sz-border)] bg-[var(--sz-card)] p-7 text-[var(--sz-text)]">
              <h2 className="text-3xl font-semibold">{entry.term}</h2>
              <p className="mt-4 text-lg leading-8 text-[var(--sz-text-soft)]">{entry.summary}</p>
              <p className="mt-4 rounded-2xl bg-[var(--sz-accent-faint)] p-4 text-sm leading-7 text-[var(--sz-accent)]">常见误区：{entry.misconception}</p>
            </Card.Root>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
