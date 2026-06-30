import Link from "next/link";
import type { Metadata } from "next";
import { MovieCard, movieCardGridClassName } from "@/components/movie-card";
import { MovieSearchInput } from "@/components/movie-search-input";
import { MovieSearchPagination } from "@/components/movie-search-pagination";
import { SectionHeading, SiteShell } from "@/components/site-shell";
import { searchMovies } from "@/lib/movie-api";
import { isSearchQueryValid, searchMatchKindLabel } from "@/lib/movie-search";
import { parseMoviesPage } from "@/lib/movies-pagination";

export const revalidate = 3600;

type SearchPageProps = {
  searchParams: Promise<{ q?: string; page?: string }>;
};

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  if (!query) {
    return { title: "搜索影片" };
  }
  return { title: `「${query}」的搜索结果` };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q, page: pageParam } = await searchParams;
  const query = q?.trim() ?? "";
  const page = parseMoviesPage(pageParam);

  const hasValidQuery = isSearchQueryValid(query);
  const result = hasValidQuery ? await searchMovies(query, page) : null;

  return (
    <SiteShell>
      <section className="mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-20">
        <SectionHeading
          eyebrow="Search"
          title="搜索影片"
          description="支持片名、IMDB 编号（如 tt0137523）与影人（导演 / 主演 / 编剧）。仅搜索本站已发布索引。"
        />

        <div className="mb-10 max-w-2xl">
          <MovieSearchInput defaultValue={query} />
        </div>

        {!query ? (
          <p className="text-sm text-[var(--sz-muted)]">输入关键词开始搜索。</p>
        ) : !hasValidQuery ? (
          <p className="text-sm text-[var(--sz-muted)]">请输入至少 2 个字符，或有效的 IMDB 编号。</p>
        ) : result && result.totalItems === 0 ? (
          <p className="text-sm text-[var(--sz-muted)]">
            本站暂无与「{query}」相关的已发布影片。可尝试换个片名、IMDB 编号或影人名。
          </p>
        ) : result ? (
          <>
            <p className="mb-6 text-sm text-[var(--sz-muted)]">
              按{searchMatchKindLabel(result.matchKind)}匹配「{query}」，共 {result.totalItems} 部
            </p>
            <div className={movieCardGridClassName}>
              {result.items.map((movie, index) => (
                <Link key={movie.slug} href={`/movies/${movie.slug}`} className="group block">
                  <MovieCard movie={movie} priority={result.currentPage === 1 && index < 6} />
                </Link>
              ))}
            </div>
            <MovieSearchPagination
              query={query}
              page={result.currentPage}
              totalPages={result.totalPages}
            />
          </>
        ) : null}
      </section>
    </SiteShell>
  );
}
