import Link from "next/link";
import Image from "next/image";
import { Button, Card } from "@heroui/react";
import { ArrowRight, BookOpen } from "lucide-react";
import { collections, knowledgeEntries, versionUpdates } from "@/lib/content";
import { getMovies } from "@/lib/movie-api";
import {
  DecisionCard,
  SectionHeading,
  SiteShell,
} from "@/components/site-shell";

export const revalidate = 86400;

export default async function Home() {
  const movies = await getMovies();
  const featured = movies[0];

  return (
    <SiteShell>
      <section className="mx-auto grid max-w-7xl gap-12 px-6 py-16 md:grid-cols-[1.05fr_0.95fr] md:px-10 md:py-24">
        <div>
          <p className="mb-5 font-mono text-xs uppercase tracking-[0.28em] text-[var(--sz-accent)]">
            高清观影决策系统
          </p>
          <h1 className="max-w-4xl text-5xl font-semibold leading-tight tracking-tight md:text-7xl">
            不找资源，判断一部片应该怎么被看见。
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-9 text-[var(--sz-text-soft)]">
            Station Zero
            帮你判断一部片值不值得看、哪里能合法看、哪个高清版本最值得看。第一版先把单部影片决策页做到足够清楚、可信、有审美。
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href={`/movies/${featured.slug}`}>
              <Button className="gap-2 rounded-full bg-[var(--sz-accent)] px-6 py-3 text-sm font-semibold text-[var(--sz-accent-contrast)] transition hover:opacity-90">
                查看影片决策样例
                <ArrowRight className="size-4" />
              </Button>
            </Link>
            <Link href="/knowledge">
              <Button
                variant="secondary"
                className="gap-2 rounded-full border-[color:var(--sz-border)] px-6 py-3 text-sm font-semibold text-[var(--sz-text)] transition hover:border-[color:var(--sz-accent-soft)] hover:text-[var(--sz-accent)]"
              >
                <BookOpen className="size-4" />
                进入高清知识库
              </Button>
            </Link>
          </div>
        </div>
        <Card className="rounded-[2rem] border border-[color:var(--sz-border)] bg-[var(--sz-card-strong)] p-5 text-[var(--sz-text)] backdrop-blur">
          <div
            className={`relative mb-5 h-72 overflow-hidden rounded-[1.5rem] bg-gradient-to-br ${featured.posterTone}`}
          >
            {featured.posterUrl ? (
              <Image
                src={featured.posterUrl}
                alt={`${featured.title} poster`}
                fill
                className="object-cover"
                priority
                sizes="(min-width: 768px) 40vw, 100vw"
              />
            ) : null}
          </div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--sz-accent)]">
            Featured decision
          </p>
          <h2 className="mt-3 text-3xl font-semibold">{featured.title}</h2>
          <p className="mt-3 leading-7 text-[var(--sz-text-soft)]">{featured.summary}</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <DecisionCard label="结论" value={featured.verdict} />
            <DecisionCard label="最佳观看" value={featured.bestWay} />
          </div>
        </Card>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14 md:px-10">
        <SectionHeading
          eyebrow="Movies"
          title="精选影片决策"
          description="每张卡片先给判断，再展开资料、正版路径、高清版本和设备建议。"
        />
        <div className="grid gap-5 md:grid-cols-3">
          {movies.map((movie) => (
            <Link
              key={movie.slug}
              href={`/movies/${movie.slug}`}
              className="group block"
            >
              <Card className="h-full rounded-3xl border border-[color:var(--sz-border)] bg-[var(--sz-card)] p-5 text-[var(--sz-text)] transition hover:-translate-y-1 hover:border-[color:var(--sz-accent-soft)]">
                <div
                  className={`relative mb-5 h-44 overflow-hidden rounded-2xl bg-gradient-to-br ${movie.posterTone}`}
                >
                  {movie.posterUrl ? (
                    <Image
                      src={movie.posterUrl}
                      alt={`${movie.title} poster`}
                      fill
                      className="object-cover"
                      loading="lazy"
                      sizes="(min-width: 768px) 33vw, 100vw"
                    />
                  ) : null}
                </div>
                <p className="text-sm text-[var(--sz-muted)]">
                  {movie.year} · {movie.genres.join(" / ")}
                </p>
                <h3 className="mt-2 text-2xl font-semibold group-hover:text-[var(--sz-accent)]">
                  {movie.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-[var(--sz-text-soft)]">
                  {movie.verdict} · {movie.bestWay}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-14 md:grid-cols-3 md:px-10">
        <div className="md:col-span-1">
          <SectionHeading
            eyebrow="Curation"
            title="片单不是排行榜"
            description="围绕设备、心情、审美和观看场景组织内容。"
          />
        </div>
        <div className="grid gap-4 md:col-span-2">
          {collections.map((collection) => (
            <Link key={collection.slug} href="/collections" className="block">
              <Card className="rounded-3xl border border-[color:var(--sz-border)] bg-[var(--sz-card)] p-6 text-[var(--sz-text)] transition hover:border-[color:var(--sz-accent-soft)]">
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--sz-accent)]">
                  {collection.kicker}
                </p>
                <h3 className="mt-3 text-2xl font-semibold">
                  {collection.title}
                </h3>
                <p className="mt-2 text-[var(--sz-text-soft)]">
                  {collection.description}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-6 py-14 md:grid-cols-2 md:px-10">
        <Card className="rounded-3xl border border-[color:var(--sz-border)] bg-[var(--sz-accent)] p-8 text-[var(--sz-accent-contrast)]">
          <p className="font-mono text-xs uppercase tracking-[0.2em]">
            Version tracking
          </p>
          <h2 className="mt-4 text-3xl font-semibold">
            版本追踪先从编辑样本开始
          </h2>
          <ul className="mt-6 space-y-3 text-sm leading-7">
            {versionUpdates.map((item) => (
              <li key={item}>· {item}</li>
            ))}
          </ul>
        </Card>
        <Card className="rounded-3xl border border-[color:var(--sz-border)] bg-[var(--sz-card)] p-8 text-[var(--sz-text)]">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--sz-accent)]">
            Knowledge
          </p>
          <h2 className="mt-4 text-3xl font-semibold">高清知识要服务判断</h2>
          <div className="mt-6 space-y-4">
            {knowledgeEntries.map((entry) => (
              <p
                key={entry.slug}
                className="text-sm leading-7 text-[var(--sz-text-soft)]"
              >
                <span className="text-[var(--sz-text)]">{entry.term}</span>：
                {entry.summary}
              </p>
            ))}
          </div>
        </Card>
      </section>
    </SiteShell>
  );
}
