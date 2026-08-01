/**
 * MoviesPage — 影片库列表页（`/movies`）。
 *
 * Server Component：经 `movie-api` 读取已发布影片，SQL 优先、JSON 回退；
 * 支持 `?page=` 分页，首页前 6 张海报使用 `priority` 预加载。
 */

import Link from "next/link";
import { getMoviesPage } from "@/lib/movie-api";
import { MovieCard, movieCardGridClassName } from "@/components/movie-card";
import { MoviePagination } from "@/components/movie-pagination";
import { SectionHeading, SiteShell } from "@/components/site-shell";
import { parseMoviesPage } from "@/lib/movies-pagination";

/** ISR 重新验证间隔（秒）：列表数据每日刷新一次。 */
export const revalidate = 86400;

/** `/movies` 路由的 searchParams 类型（Next.js App Router 中为 Promise）。 */
type MoviesPageProps = {
  searchParams: Promise<{ page?: string }>;
};

/**
 * 影片库列表页：展示分页网格与页码导航。
 *
 * @param props - 页面属性
 * @param props.searchParams - URL 查询参数；`page` 为 1 基页码，缺省或非法时回退第 1 页
 * @returns 带站点外壳的影片卡片网格与分页器
 */
export default async function MoviesPage({ searchParams }: MoviesPageProps) {
  const { page: pageParam } = await searchParams;
  const { items, currentPage, totalPages, totalItems } = await getMoviesPage(parseMoviesPage(pageParam));

  return (
    <SiteShell>
      <section className="mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-20">
        <SectionHeading
          eyebrow="All 4K Movies"
          title="全部电影"
          description="每张卡片先给判断，再展开资料、正版路径、高清版本和设备建议。"
        />
        <div className={movieCardGridClassName}>
          {items.map((movie, index) => (
            <Link key={movie.slug} href={`/movies/${movie.slug}`} className="group block">
              {/* 仅第 1 页前 6 张开启 priority，优化 LCP */}
              <MovieCard movie={movie} priority={currentPage === 1 && index < 6} />
            </Link>
          ))}
        </div>
        <MoviePagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} />
      </section>
    </SiteShell>
  );
}
