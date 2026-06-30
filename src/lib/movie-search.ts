/**
 * 影片搜索查询解析与 JSON 回退匹配。
 *
 * SQL 路径（pg_trgm）见 `movie-sql-store`；本模块供门面与无库环境复用。
 */

import type { Movie } from "./content";

export type SearchMatchKind = "imdb" | "title" | "person";

const IMDB_ID_PATTERN = /^(?:tt)?(\d{7,8})$/i;
const MIN_TEXT_QUERY_LENGTH = 2;

/** 将用户输入规范为可搜索文本（trim + 合并空白）。 */
export function normalizeSearchQuery(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

/**
 * 解析 IMDB 外部 ID（`tt0137523` 或 `0137523`）。
 *
 * @returns 规范形态 `tt` + 7–8 位数字；无法解析时返回 `null`
 */
export function parseImdbId(raw: string): string | null {
  const trimmed = normalizeSearchQuery(raw).toLowerCase();
  if (!trimmed) return null;

  const match = trimmed.match(IMDB_ID_PATTERN);
  if (!match?.[1]) return null;

  return `tt${match[1]}`;
}

/** 从 TMDB `external_ids.imdb_id` 提取规范 IMDB ID。 */
export function imdbIdFromTmdbExternalIds(externalIds?: { imdb_id?: string | null } | null): string | undefined {
  const raw = externalIds?.imdb_id?.trim();
  if (!raw) return undefined;
  return parseImdbId(raw) ?? undefined;
}

/**
 * 判断查询是否可执行搜索。
 *
 * IMDB 模式允许更短输入；普通文本至少 2 个字符。
 */
export function isSearchQueryValid(raw: string): boolean {
  const normalized = normalizeSearchQuery(raw);
  if (!normalized) return false;
  if (parseImdbId(normalized)) return true;
  return normalized.length >= MIN_TEXT_QUERY_LENGTH;
}

/** 根据查询形态推断匹配类型（用于结果页文案）。 */
export function inferSearchMatchKind(raw: string): SearchMatchKind {
  return parseImdbId(raw) ? "imdb" : "title";
}

function includesInsensitive(haystack: string, needle: string) {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

function arrayIncludesInsensitive(values: string[] | undefined, needle: string) {
  if (!values?.length) return false;
  return values.some((value) => includesInsensitive(value, needle));
}

/**
 * JSON 回退：判断单部影片是否命中搜索词。
 *
 * @returns 命中原因；未命中时返回 `null`
 */
export function matchMovieForSearch(movie: Movie, rawQuery: string): SearchMatchKind | null {
  const imdbId = parseImdbId(rawQuery);
  if (imdbId) {
    return movie.imdbId?.toLowerCase() === imdbId ? "imdb" : null;
  }

  const query = normalizeSearchQuery(rawQuery);
  if (!isSearchQueryValid(query)) return null;

  if (
    includesInsensitive(movie.title, query) ||
    includesInsensitive(movie.originalTitle, query) ||
    arrayIncludesInsensitive(movie.aka, query)
  ) {
    return "title";
  }

  if (
    includesInsensitive(movie.director, query) ||
    arrayIncludesInsensitive(movie.cast, query) ||
    arrayIncludesInsensitive(movie.writers, query)
  ) {
    return "person";
  }

  return null;
}

/** 搜索匹配原因的中文标签。 */
export function searchMatchKindLabel(kind: SearchMatchKind): string {
  switch (kind) {
    case "imdb":
      return "IMDB 编号";
    case "person":
      return "影人";
    default:
      return "片名";
  }
}

export function buildSearchPageHref(query: string, page = 1): string {
  const params = new URLSearchParams();
  params.set("q", query);
  if (page > 1) params.set("page", String(page));
  return `/search?${params.toString()}`;
}
