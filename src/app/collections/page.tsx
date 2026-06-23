import { Card, Chip } from "@heroui/react";
import { collections } from "@/lib/content";
import { SectionHeading, SiteShell } from "@/components/site-shell";

export default function CollectionsPage() {
  return (
    <SiteShell>
      <section className="mx-auto max-w-7xl px-6 py-16 md:px-10">
        <SectionHeading eyebrow="Collections" title="策展片单" description="用设备、心情、审美和场景组织影片，而不是只给排行榜。" />
        <div className="grid gap-5 md:grid-cols-3">
          {collections.map((collection) => (
            <Card.Root<"article"> key={collection.slug} className="rounded-3xl border border-[color:var(--sz-border)] bg-[var(--sz-card)] p-6 text-[var(--sz-text)]">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--sz-accent)]">{collection.kicker}</p>
              <h2 className="mt-4 text-2xl font-semibold">{collection.title}</h2>
              <p className="mt-3 leading-7 text-[var(--sz-text-soft)]">{collection.description}</p>
              <div className="mt-6 flex flex-wrap gap-2">
                {collection.movies.map((movie) => <Chip key={movie} variant="soft" className="bg-[var(--sz-surface-soft)] text-[var(--sz-text-soft)]">{movie}</Chip>)}
              </div>
            </Card.Root>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
