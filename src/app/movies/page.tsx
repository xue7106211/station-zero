import Link from "next/link";
import { getMoviesPage } from "@/lib/movie-api";
import { MovieCard, movieCardGridClassName } from "@/components/movie-card";
import { MoviePagination } from "@/components/movie-pagination";
import { SectionHeading, SiteShell } from "@/components/site-shell";
import { parseMoviesPage } from "@/lib/movies-pagination";

export const revalidate = 86400;

type MoviesPageProps = {
  searchParams: Promise<{ page?: string }>;
};

export default async function MoviesPage({ searchParams }: MoviesPageProps) {
  const { page: pageParam } = await searchParams;
  const { items, currentPage, totalPages, totalItems } = await getMoviesPage(parseMoviesPage(pageParam));

  return (
    <SiteShell>
      <section className="mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-20">
        <SectionHeading eyebrow="Movies" title="影片决策库" description="先以少量人工策展影片验证详情页的信息组织方式。" />
        <div className={movieCardGridClassName}>
          {items.map((movie, index) => (
            <Link key={movie.slug} href={`/movies/${movie.slug}`} className="group block">
              <MovieCard movie={movie} priority={currentPage === 1 && index < 6} />
            </Link>
          ))}
        </div>
        <MoviePagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} />
      </section>
    </SiteShell>
  );
}
