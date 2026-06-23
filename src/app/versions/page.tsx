import { Card } from "@heroui/react";
import { versionUpdates } from "@/lib/content";
import { SectionHeading, SiteShell } from "@/components/site-shell";

export default function VersionsPage() {
  return (
    <SiteShell>
      <section className="mx-auto max-w-7xl px-6 py-16 md:px-10">
        <SectionHeading eyebrow="Version tracking" title="版本追踪" description="MVP 阶段先以人工编辑的方式记录值得关注的 4K、HDR、蓝光和修复版信号。" />
        <div className="grid gap-4">
          {versionUpdates.map((update, index) => (
            <Card.Root<"article"> key={update} className="rounded-3xl border border-[color:var(--sz-border)] bg-[var(--sz-card)] p-6 text-[var(--sz-text)]">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--sz-accent)]">Signal {String(index + 1).padStart(2, "0")}</p>
              <h2 className="mt-3 text-2xl font-semibold">{update}</h2>
            </Card.Root>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
