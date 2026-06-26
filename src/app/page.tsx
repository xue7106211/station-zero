import Link from "next/link";
import { getPublishedMovies } from "@/lib/movie-api";
import { MovieCard, movieCardGridClassName } from "@/components/movie-card";
import { SectionHeading, SiteShell } from "@/components/site-shell";

export const revalidate = 86400;

export default async function Home() {
  const movies = await getPublishedMovies();

  return (
    <SiteShell>
      <section className="mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-20">
        <SectionHeading
          eyebrow="Movies"
          title="精选影片决策"
          description="每张卡片先给判断，再展开资料、正版路径、高清版本和设备建议。"
        />
        <div className={movieCardGridClassName}>
          {movies.map((movie) => (
            <Link
              key={movie.slug}
              href={`/movies/${movie.slug}`}
              className="group block"
            >
              <MovieCard movie={movie} />
            </Link>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
