"use client";

import { Pagination } from "@heroui/react";
import { useRouter } from "next/navigation";
import { buildMoviesPageHref, getPaginationRange } from "@/lib/movies-pagination";

/** `MoviePagination` 组件的属性。 */
type MoviePaginationProps = {
  /** 当前页码（从 1 开始）。 */
  currentPage: number;
  /** 总页数。 */
  totalPages: number;
  /** 影片总数（用于摘要文案）。 */
  totalItems: number;
};

/**
 * 影片列表分页器：基于 HeroUI `Pagination` 组合组件，通过客户端路由切换 `/movies?page=`。
 *
 * 行为说明：
 * - `totalPages <= 1` 时不渲染，避免单页时出现多余控件；
 * - 页码序列由 `getPaginationRange` 生成，页数过多时自动插入省略号；
 * - 上一页 / 下一页在边界页禁用，重复点击当前页会被忽略。
 *
 * @param props - 分页状态
 * @param props.currentPage - 当前页码
 * @param props.totalPages - 总页数
 * @param props.totalItems - 影片总数
 * @returns 分页导航；仅一页时返回 `null`
 */
export function MoviePagination({ currentPage, totalPages, totalItems }: MoviePaginationProps) {
  const router = useRouter();

  if (totalPages <= 1) {
    return null;
  }

  const pages = getPaginationRange(currentPage, totalPages);

  /** 跳转到指定页；越界或与当前页相同时不触发导航。 */
  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    router.push(buildMoviesPageHref(page));
  };

  return (
    <nav className="mt-12 flex flex-col items-center gap-4" aria-label="影片列表分页">
      <p className="text-sm text-[var(--sz-muted)]">
        共 {totalItems} 部 · 第 {currentPage} / {totalPages} 页
      </p>
      <Pagination size="sm">
        <Pagination.Content>
          <Pagination.Item>
            <Pagination.Previous isDisabled={currentPage <= 1} onPress={() => goToPage(currentPage - 1)}>
              <Pagination.PreviousIcon />
            </Pagination.Previous>
          </Pagination.Item>

          {pages.map((page, index) =>
            page === "ellipsis" ? (
              <Pagination.Item key={`ellipsis-${index}`}>
                <Pagination.Ellipsis />
              </Pagination.Item>
            ) : (
              <Pagination.Item key={page}>
                <Pagination.Link isActive={page === currentPage} onPress={() => goToPage(page)}>
                  {page}
                </Pagination.Link>
              </Pagination.Item>
            ),
          )}

          <Pagination.Item>
            <Pagination.Next isDisabled={currentPage >= totalPages} onPress={() => goToPage(currentPage + 1)}>
              <Pagination.NextIcon />
            </Pagination.Next>
          </Pagination.Item>
        </Pagination.Content>
      </Pagination>
    </nav>
  );
}
