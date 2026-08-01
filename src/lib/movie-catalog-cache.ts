/**
 * 影片目录分页的 Next.js Data Cache 封装。
 *
 * 首页 ISR 与 `/api/movies` 共用同一缓存条目，避免「首屏缓存 + 加载更多实时查询」
 * 在 bulk publish 后产生排序错位、漏片或重复。
 */

import { unstable_cache } from "next/cache";

import { listPublishedMoviesPageFromSql } from "./movie-sql-store";

/** `revalidateTag` / `revalidatePath` 使用的统一标签。 */
export const MOVIES_CATALOG_CACHE_TAG = "movies-catalog";

/** 列表页 ISR 重新验证间隔（秒）。 */
export const MOVIES_CATALOG_REVALIDATE_SECONDS = 86400;

/**
 * 带 Data Cache 的已发布影片分页查询（仅 SQL 路径）。
 *
 * @param page - 页码，从 1 开始
 * @param pageSize - 每页条数
 */
export function getCachedPublishedMoviesPageFromSql(page: number, pageSize: number) {
  return unstable_cache(
    async () => listPublishedMoviesPageFromSql(page, pageSize),
    ["movies-page-sql", String(page), String(pageSize)],
    {
      revalidate: MOVIES_CATALOG_REVALIDATE_SECONDS,
      tags: [MOVIES_CATALOG_CACHE_TAG],
    },
  )();
}
