import Link from "next/link";
import Image from "next/image";
import { Button, Card } from "@heroui/react";
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
          <p className="mb-5 font-mono text-xs uppercase tracking-[0.28em] text-[#f4c95d]">
            高清观影决策系统
          </p>
          <h1 className="max-w-4xl text-5xl font-semibold leading-tight tracking-tight md:text-7xl">
            不找资源，判断一部片应该怎么被看见。
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-9 text-[#f8f3e8]/68">
            Station Zero
            帮你判断一部片值不值得看、哪里能合法看、哪个高清版本最值得看。第一版先把单部影片决策页做到足够清楚、可信、有审美。
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href={`/movies/${featured.slug}`}>
              <Button className="rounded-full bg-[#f4c95d] px-6 py-3 text-sm font-semibold text-[#09090b] transition hover:bg-[#ffe08a]">
                查看影片决策样例
              </Button>
            </Link>
            <Link href="/knowledge">
              <Button
                variant="secondary"
                className="rounded-full border-white/15 px-6 py-3 text-sm font-semibold text-[#f8f3e8] transition hover:border-[#f4c95d]/60 hover:text-[#f4c95d]"
              >
                进入高清知识库
              </Button>
            </Link>
          </div>
        </div>
        <Card className="rounded-[2rem] border border-white/10 bg-white/[0.05] p-5 text-[#f8f3e8] backdrop-blur">
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
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#f4c95d]/80">
            Featured decision
          </p>
          <h2 className="mt-3 text-3xl font-semibold">{featured.title}</h2>
          <p className="mt-3 leading-7 text-[#f8f3e8]/64">{featured.summary}</p>
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
              <Card className="h-full rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-[#f8f3e8] transition hover:-translate-y-1 hover:border-[#f4c95d]/50">
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
                <p className="text-sm text-[#f8f3e8]/50">
                  {movie.year} · {movie.genres.join(" / ")}
                </p>
                <h3 className="mt-2 text-2xl font-semibold group-hover:text-[#f4c95d]">
                  {movie.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-[#f8f3e8]/60">
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
              <Card className="rounded-3xl border border-white/10 bg-white/[0.035] p-6 text-[#f8f3e8] transition hover:border-[#f4c95d]/50">
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#f4c95d]/80">
                  {collection.kicker}
                </p>
                <h3 className="mt-3 text-2xl font-semibold">
                  {collection.title}
                </h3>
                <p className="mt-2 text-[#f8f3e8]/62">
                  {collection.description}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-6 py-14 md:grid-cols-2 md:px-10">
        <Card className="rounded-3xl border border-white/10 bg-[#f4c95d] p-8 text-[#09090b]">
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
        <Card className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-[#f8f3e8]">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#f4c95d]">
            Knowledge
          </p>
          <h2 className="mt-4 text-3xl font-semibold">高清知识要服务判断</h2>
          <div className="mt-6 space-y-4">
            {knowledgeEntries.map((entry) => (
              <p
                key={entry.slug}
                className="text-sm leading-7 text-[#f8f3e8]/65"
              >
                <span className="text-[#f8f3e8]">{entry.term}</span>：
                {entry.summary}
              </p>
            ))}
          </div>
        </Card>
      </section>
    </SiteShell>
  );
}
