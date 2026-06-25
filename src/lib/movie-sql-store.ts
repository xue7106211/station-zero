/**
 * Supabase Postgres 影片读取层。
 *
 * 仅由服务端（`movie-api`、脚本）调用；页面组件不应直接依赖本模块。
 * 所有列表类查询默认过滤 `content_status = published`，详情查询不按状态过滤。
 */

import { asc, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { movies, viewingPaths } from "@/db/schema";
import type { Movie } from "./content";
import { mapMovieRowToMovie } from "./movie-mapper";

/**
 * 统计已发布影片总数。
 *
 * @returns 无数据库连接时返回 `0`
 */
export async function countPublishedMoviesFromSql(): Promise<number> {
  const db = getDb();
  if (!db) return 0;

  const [{ count }] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(movies)
    .where(eq(movies.contentStatus, "published"));

  return count;
}

/**
 * 分页查询已发布影片。
 *
 * 排序：`updated_at DESC`，与竞品列表页「最近更新优先」一致。
 * 列表查询不加载 `viewing_paths`，减少卡片渲染的 JOIN 开销。
 *
 * @param page - 页码，从 1 开始
 * @param pageSize - 每页条数
 * @returns 当前页 `Movie` 列表与全库已发布总数
 */
export async function listPublishedMoviesPageFromSql(
  page: number,
  pageSize: number,
): Promise<{ items: Movie[]; totalItems: number }> {
  const db = getDb();
  if (!db) {
    return { items: [], totalItems: 0 };
  }

  const offset = (page - 1) * pageSize;
  const [{ count }] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(movies)
    .where(eq(movies.contentStatus, "published"));

  const rows = await db
    .select()
    .from(movies)
    .where(eq(movies.contentStatus, "published"))
    .orderBy(desc(movies.updatedAt))
    .limit(pageSize)
    .offset(offset);

  return {
    items: rows.map((row) => mapMovieRowToMovie(row)),
    totalItems: count,
  };
}

/**
 * 查询已发布影片列表。
 *
 * @param limit - 可选条数上限；省略时返回全部已发布影片
 */
export async function listPublishedMoviesFromSql(limit?: number): Promise<Movie[]> {
  const db = getDb();
  if (!db) return [];

  const query = db
    .select()
    .from(movies)
    .where(eq(movies.contentStatus, "published"))
    .orderBy(desc(movies.updatedAt));

  const rows = typeof limit === "number" ? await query.limit(limit) : await query;
  return rows.map((row) => mapMovieRowToMovie(row));
}

/**
 * 按 slug 获取单部影片详情。
 *
 * 使用 Drizzle relational query 一次加载 `movies` 与公开 `viewing_paths`；
 * 路径按 `sort_order ASC` 排序，供 `WatchProviders` 按类型分组展示。
 * 不按 `content_status` 过滤，draft 影片仍可通过直链访问。
 *
 * @param slug - 影片公开 URL 标识
 */
export async function getMovieBySlugFromSql(slug: string): Promise<Movie | undefined> {
  const db = getDb();
  if (!db) return undefined;

  const movie = await db.query.movies.findFirst({
    where: eq(movies.slug, slug),
    with: {
      viewingPaths: {
        where: eq(viewingPaths.visibility, "public"),
        orderBy: [asc(viewingPaths.sortOrder)],
      },
    },
  });

  if (!movie) return undefined;
  return mapMovieRowToMovie(movie, movie.viewingPaths);
}

/**
 * 获取已发布影片的 slug 列表。
 *
 * 主要用于 `generateStaticParams` 构建预热。
 *
 * @param limit - 最多返回条数
 */
export async function listPublishedMovieSlugsFromSql(limit: number): Promise<string[]> {
  const db = getDb();
  if (!db) return [];

  const rows = await db
    .select({ slug: movies.slug })
    .from(movies)
    .where(eq(movies.contentStatus, "published"))
    .orderBy(desc(movies.updatedAt))
    .limit(limit);

  return rows.map((row) => row.slug);
}

/**
 * 判断当前进程是否配置了 Supabase 数据库连接。
 *
 * 仅检查 `DATABASE_URL` 是否存在，不验证连通性。
 */
export function isSqlStoreAvailable() {
  return Boolean(process.env.DATABASE_URL?.trim());
}
