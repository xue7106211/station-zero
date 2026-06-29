"use client";

/**
 * MovieLoadMoreGrid — 首页影片网格（增量加载）。
 *
 * 首屏数据由 Server Component 经 `getMoviesPage(1)` SSR 注入；
 * 用户点击「加载更多」时请求 `/api/movies?page=` 追加下一页，不切换 URL。
 */

import { Button } from "@heroui/react";
import Link from "next/link";
import { useState } from "react";
import { MovieCard, movieCardGridClassName } from "@/components/movie-card";
import type { Movie } from "@/lib/content";

/** `MovieLoadMoreGrid` 组件的属性。 */
type MovieLoadMoreGridProps = {
  /** SSR 首屏影片列表（通常为第 1 页）。 */
  initialMovies: Movie[];
  /** SSR 首屏已加载到的页码（从 1 开始）。 */
  initialPage: number;
  /** 影片库总页数，用于判断是否还有下一页。 */
  totalPages: number;
  /** 已发布影片总数，用于底部进度文案。 */
  totalItems: number;
};

/**
 * 首页影片网格：首屏 SSR 第一页，底部「加载更多」追加后续页。
 *
 * 行为说明：
 * - 分页大小与 `/movies` 一致（`MOVIES_PAGE_SIZE`，默认 30）；
 * - 仅首屏前 6 张海报开启 `priority`，优化 LCP；
 * - `totalPages <= 1` 时不显示按钮，仅保留进度文案；
 * - 请求失败时保留已加载内容，展示错误提示并可重试。
 *
 * @param props - 首屏分页状态（来自 `getMoviesPage(1)`）
 * @returns 影片卡片网格与加载更多控件
 */
export function MovieLoadMoreGrid({
  initialMovies,
  initialPage,
  totalPages,
  totalItems,
}: MovieLoadMoreGridProps) {
  const [movies, setMovies] = useState(initialMovies);
  const [page, setPage] = useState(initialPage);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasMore = page < totalPages;

  /** 拉取下一页并追加到当前列表；并发点击或已无更多页时直接返回。 */
  async function loadMore() {
    if (loading || !hasMore) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/movies?page=${page + 1}`);
      if (!response.ok) {
        throw new Error(`请求失败（${response.status}）`);
      }

      const data = (await response.json()) as {
        items: Movie[];
        currentPage: number;
      };

      setMovies((current) => [...current, ...data.items]);
      setPage(data.currentPage);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "加载失败，请重试",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className={movieCardGridClassName}>
        {movies.map((movie, index) => (
          <Link
            key={movie.slug}
            href={`/movies/${movie.slug}`}
            className="group block"
          >
            {/* 仅首屏前 6 张开启 priority，与 `/movies` 第 1 页策略一致 */}
            <MovieCard movie={movie} priority={index < 6} />
          </Link>
        ))}
      </div>

      <div className="mt-12 flex flex-col items-center gap-4">
        <p className="text-sm text-[var(--sz-muted)]">
          已展示 {movies.length} / {totalItems} 部
        </p>

        {hasMore ? (
          <>
            <Button
              variant="outline"
              size="md"
              onPress={loadMore}
              isPending={loading}
            >
              {loading ? "加载中…" : "加载更多"}
            </Button>
            {error ? (
              <p className="text-sm text-[var(--sz-danger,theme(colors.red.500))]">
                {error}
              </p>
            ) : null}
          </>
        ) : totalItems > initialMovies.length ? (
          <p className="text-sm text-[var(--sz-muted)]">已全部加载</p>
        ) : null}
      </div>
    </>
  );
}
