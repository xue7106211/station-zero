import { getMoviesPage } from "@/lib/movie-api";
import { MovieLoadMoreGrid } from "@/components/movie-load-more-grid";
import { SectionHeading, SiteShell } from "@/components/site-shell";

export const revalidate = 86400;

export default async function Home() {
  const { items, currentPage, totalPages, totalItems } = await getMoviesPage(1);

  return (
    <SiteShell>
      <section className="mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-20">
        <SectionHeading
          eyebrow="Movies"
          title="精选影片决策"
          description="每张卡片先给判断，再展开资料、正版路径、高清版本和设备建议。"
        />
        <MovieLoadMoreGrid
          initialMovies={items}
          initialPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
        />
      </section>
    </SiteShell>
  );
}
