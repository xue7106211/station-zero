import Link from "next/link";
import Image from "next/image";
import { Card } from "@heroui/react";
import { getMovies } from "@/lib/movie-api";
import { SectionHeading, SiteShell } from "@/components/site-shell";

export const revalidate = 86400;

export default async function MoviesPage() {
  const movies = await getMovies();

  return (
    <SiteShell>
      <section className="mx-auto max-w-7xl px-6 py-16 md:px-10">
        <SectionHeading eyebrow="Movies" title="影片决策库" description="先以少量人工策展影片验证详情页的信息组织方式。" />
        <div className="grid gap-5 md:grid-cols-3">
          {movies.map((movie) => (
            <Link key={movie.slug} href={`/movies/${movie.slug}`} className="block">
              <Card className="h-full rounded-3xl border border-[color:var(--sz-border)] bg-[var(--sz-card)] p-5 text-[var(--sz-text)] transition hover:border-[color:var(--sz-accent-soft)]">
                <div className={`relative mb-5 h-52 overflow-hidden rounded-2xl bg-gradient-to-br ${movie.posterTone}`}>
                  {movie.posterUrl ? <Image src={movie.posterUrl} alt={`${movie.title} poster`} fill className="object-cover" loading="lazy" sizes="(min-width: 768px) 33vw, 100vw" /> : null}
                </div>
                <p className="text-sm text-[var(--sz-muted)]">{movie.originalTitle} · {movie.year}</p>
                <h2 className="mt-2 text-2xl font-semibold">{movie.title}</h2>
                <p className="mt-3 text-sm leading-6 text-[var(--sz-text-soft)]">{movie.summary}</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
