import Link from "next/link";
import { getMovies } from "@/lib/movie-api";
import { MovieCard, movieCardGridClassName } from "@/components/movie-card";
import { SectionHeading, SiteShell } from "@/components/site-shell";

export const revalidate = 86400;

export default async function MoviesPage() {
  const movies = await getMovies();

  return (
    <SiteShell>
      <section className="mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-20">
        <SectionHeading eyebrow="Movies" title="影片决策库" description="先以少量人工策展影片验证详情页的信息组织方式。" />
        <div className={movieCardGridClassName}>
          {movies.map((movie) => (
            <Link key={movie.slug} href={`/movies/${movie.slug}`} className="group block">
              <MovieCard movie={movie} />
            </Link>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
