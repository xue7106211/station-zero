/**
 * 影片内容读取门面。
 *
 * 页面与构建脚本应通过本模块取数，而不是直接访问 `movie-sql-store` 或 `movie-store`。
 * 读取策略：配置了 `DATABASE_URL` 时优先走 Supabase SQL；连接失败或未配置时回退 `data/movies.json`。
 */

import {
  getMovieFromStore,
  getMovieSlugsFromStore,
  listPublishedMovieSlugsFromStore,
  listPublishedMoviesFromStore,
  searchPublishedMoviesFromStore,
} from "./movie-store";
import {
  getMovieBySlugFromSql,
  isSqlStoreAvailable,
  listPublishedMovieSlugsFromSql,
  listPublishedMoviesFromSql,
  listPublishedMoviesPageFromSql,
  searchPublishedMoviesFromSql,
} from "./movie-sql-store";
import { inferSearchMatchKind, isSearchQueryValid, normalizeSearchQuery, type SearchMatchKind } from "./movie-search";
import { MOVIES_PAGE_SIZE, paginateMovies } from "./movies-pagination";

/** 构建期 `generateStaticParams` 预热的 published 影片上限，避免万级库全量 SSG。 */
export const MOVIES_STATIC_BUILD_LIMIT = 50;

/** `/movies` 分页查询结果，字段与 `paginateMovies` 输出保持一致。 */
export type MoviesPageResult = {
  items: Awaited<ReturnType<typeof getMovies>>[number][];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
};

/** `/search` 查询结果。 */
export type SearchMoviesResult = MoviesPageResult & {
  query: string;
  matchKind: SearchMatchKind;
};

/**
 * 在 SQL 与 JSON 两个存储后端之间自动切换。
 *
 * 无 `DATABASE_URL` 时直接走 JSON；SQL 抛错时记录警告并回退，保证页面在无库或库故障时仍可渲染。
 *
 * @param runSql - 优先执行的 Supabase 查询
 * @param runJson - SQL 不可用或失败时的 JSON 回退逻辑
 */
async function withStoreFallback<T>(runSql: () => Promise<T>, runJson: () => Promise<T>): Promise<T> {
  if (!isSqlStoreAvailable()) {
    return runJson();
  }

  try {
    return await runSql();
  } catch (error) {
    console.warn(`SQL movie store failed; falling back to JSON. ${formatStoreError(error)}`);
    return runJson();
  }
}

/**
 * 获取全部已发布影片列表。
 *
 * 按 `updated_at DESC` 排序（SQL 路径）；仅包含 `contentStatus = published` 的条目。
 *
 * @returns 前端展示用的 `Movie` 数组
 */
export async function getMovies() {
  return withStoreFallback(
    () => listPublishedMoviesFromSql(),
    () => listPublishedMoviesFromStore(),
  );
}

/**
 * 获取已发布影片，可选条数上限。
 *
 * 用于首页精选等不需要完整片库的场景。
 *
 * @param limit - 最多返回条数；省略时返回全部已发布影片
 */
export async function getPublishedMovies(limit?: number) {
  return withStoreFallback(
    () => listPublishedMoviesFromSql(limit),
    async () => {
      const movies = await listPublishedMoviesFromStore();
      return typeof limit === "number" ? movies.slice(0, limit) : movies;
    },
  );
}

/**
 * 分页获取已发布影片。
 *
 * SQL 路径在数据库侧完成 `LIMIT/OFFSET`；JSON 回退则在内存中对已发布列表分页。
 *
 * @param page - 页码，从 1 开始；越界时钳制到有效范围
 * @param pageSize - 每页条数，默认 `MOVIES_PAGE_SIZE`（30）
 */
export async function getMoviesPage(page: number, pageSize = MOVIES_PAGE_SIZE): Promise<MoviesPageResult> {
  return withStoreFallback(
    async () => {
      const { items, totalItems } = await listPublishedMoviesPageFromSql(page, pageSize);
      const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
      const currentPage = Math.min(Math.max(1, page), totalPages);

      return {
        items,
        currentPage,
        totalPages,
        totalItems,
        pageSize,
      };
    },
    async () => {
      const movies = await listPublishedMoviesFromStore();
      const { items, currentPage, totalPages, totalItems } = paginateMovies(movies, page, pageSize);
      return { items, currentPage, totalPages, totalItems, pageSize };
    },
  );
}

/**
 * 搜索已发布影片（片名 / IMDB / 影人）。
 *
 * SQL 路径使用 `pg_trgm`；无库时回退 JSON 内存过滤。
 *
 * @param rawQuery - 用户输入
 * @param page - 页码，从 1 开始
 * @param pageSize - 每页条数，默认 30
 */
export async function searchMovies(
  rawQuery: string,
  page: number,
  pageSize = MOVIES_PAGE_SIZE,
): Promise<SearchMoviesResult> {
  const query = normalizeSearchQuery(rawQuery);
  const emptyResult: SearchMoviesResult = {
    query,
    matchKind: inferSearchMatchKind(query),
    items: [],
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    pageSize,
  };

  if (!isSearchQueryValid(query)) {
    return emptyResult;
  }

  return withStoreFallback(
    async () => {
      const { items, totalItems, matchKind } = await searchPublishedMoviesFromSql(query, page, pageSize);
      const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
      const currentPage = Math.min(Math.max(1, page), totalPages);

      return {
        query,
        matchKind,
        items,
        currentPage,
        totalPages,
        totalItems,
        pageSize,
      };
    },
    async () => {
      const { items, totalItems, matchKind } = await searchPublishedMoviesFromStore(query, page, pageSize);
      const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
      const currentPage = Math.min(Math.max(1, page), totalPages);

      return {
        query,
        matchKind,
        items,
        currentPage,
        totalPages,
        totalItems,
        pageSize,
      };
    },
  );
}

/**
 * 按 slug 获取单部影片详情。
 *
 * SQL 路径会 JOIN `viewing_paths`；若库中未找到（例如仅存在于 JSON 的 draft），会再尝试 JSON 回退。
 * 详情页不按 `contentStatus` 过滤，draft 影片仍可通过直链访问。
 *
 * @param slug - 影片公开 URL 标识
 * @returns 匹配影片；不存在时返回 `undefined`
 */
export async function getMovie(slug: string) {
  return withStoreFallback(
    async () => (await getMovieBySlugFromSql(slug)) ?? (await getMovieFromStore(slug)),
    () => getMovieFromStore(slug),
  );
}

/**
 * 获取构建期需要预渲染的 published slug 列表。
 *
 * 供 `generateStaticParams` 使用；其余 slug 依赖 `dynamicParams` 按需 ISR。
 *
 * @param limit - 最多返回条数，默认 `MOVIES_STATIC_BUILD_LIMIT`（50）
 */
export async function getMovieSlugsForBuild(limit = MOVIES_STATIC_BUILD_LIMIT) {
  return withStoreFallback(
    () => listPublishedMovieSlugsFromSql(limit),
    async () => {
      const slugs = await listPublishedMovieSlugsFromStore();
      return slugs.slice(0, limit);
    },
  );
}

/**
 * 获取全部影片 slug（含未发布）。
 *
 * @deprecated 构建期请改用 {@link getMovieSlugsForBuild}，避免万级库触发全量 SSG。
 */
export async function getMovieSlugs() {
  return withStoreFallback(
    () => listPublishedMovieSlugsFromSql(Number.MAX_SAFE_INTEGER),
    () => getMovieSlugsFromStore(),
  );
}

/** 将存储层错误格式化为单行日志文本。 */
function formatStoreError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
