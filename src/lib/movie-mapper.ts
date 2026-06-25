/**
 * Supabase 行数据 → 前端 `Movie` 领域的映射层。
 *
 * 负责把 Drizzle 查询结果转换为 `src/lib/content.ts` 中定义的展示类型，
 * 并对外部入库时可能出现的枚举漂移做安全回退。
 */

import type { Movie, VersionSignal, ViewingPath } from "./content";
import type { movies, viewingPaths } from "@/db/schema";

/** `movies` 表 SELECT 行类型。 */
type MovieRow = typeof movies.$inferSelect;

/** `viewing_paths` 表 SELECT 行类型。 */
type ViewingPathRow = typeof viewingPaths.$inferSelect;

/** 前端认可的版本信号结论枚举，用于校验 JSONB 入库值。 */
const versionVerdicts = new Set<VersionSignal["verdict"]>(["强推荐", "推荐", "够用", "待确认"]);

/** 前端认可的观看路径类型枚举，用于校验 Postgres enum 入库值。 */
const viewingPathTypes = new Set<ViewingPath["type"]>([
  "订阅",
  "租赁/购买",
  "实体发行",
  "网盘",
  "磁力",
  "资料来源",
]);

/**
 * 将 `viewing_paths` 表行映射为前端 `ViewingPath`。
 *
 * 未知 `type` 回退为「资料来源」，避免脏数据导致渲染中断。
 *
 * @param row - Drizzle 查询得到的观看路径行
 */
export function mapViewingPathRow(row: ViewingPathRow): ViewingPath {
  return {
    platform: row.platform,
    type: viewingPathTypes.has(row.type as ViewingPath["type"])
      ? (row.type as ViewingPath["type"])
      : "资料来源",
    note: row.note,
    url: row.url ?? undefined,
  };
}

/**
 * 将 `movies` 表行（及关联观看路径）映射为前端 `Movie`。
 *
 * - `null` 列转为 `undefined`，与 JSON 回退路径的缺省语义一致。
 * - `ratings` 各平台缺省时填「待补充」，保证 `RatingPanel` 始终有占位文案。
 * - `versionSignals.verdict` 未知时回退为「待确认」。
 *
 * @param row - 影片主记录
 * @param pathRows - 关联的公开观看路径，默认空数组
 */
export function mapMovieRowToMovie(row: MovieRow, pathRows: ViewingPathRow[] = []): Movie {
  return {
    slug: row.slug,
    tmdbId: row.tmdbId ?? undefined,
    title: row.title,
    originalTitle: row.originalTitle,
    year: row.year,
    genres: row.genres,
    director: row.director,
    cast: row.cast,
    runtime: row.runtime,
    writers: row.writers ?? undefined,
    countries: row.countries ?? undefined,
    languages: row.languages ?? undefined,
    releaseDate: row.releaseDate ?? undefined,
    aka: row.aka ?? undefined,
    rating: row.rating,
    ratings: row.ratings
      ? {
          douban: row.ratings.douban ?? "待补充",
          imdb: row.ratings.imdb ?? "待补充",
          rottenTomatoes: row.ratings.rottenTomatoes ?? "待补充",
        }
      : undefined,
    posterTone: row.posterTone,
    posterUrl: row.posterUrl ?? undefined,
    backdropUrl: row.backdropUrl ?? undefined,
    sourcePosterUrl: row.sourcePosterUrl ?? undefined,
    sourceBackdropUrl: row.sourceBackdropUrl ?? undefined,
    palette: row.palette ?? undefined,
    summary: row.summary,
    verdict: row.verdict,
    bestWay: row.bestWay,
    idealScene: row.idealScene,
    notFor: row.notFor,
    viewingPaths: pathRows.map(mapViewingPathRow),
    versionSignals: (row.versionSignals ?? []).map((signal) => ({
      label: signal.label,
      value: signal.value,
      verdict: versionVerdicts.has(signal.verdict as VersionSignal["verdict"])
        ? (signal.verdict as VersionSignal["verdict"])
        : "待确认",
    })),
    deviceAdvice: row.deviceAdvice,
    related: row.related,
  };
}
