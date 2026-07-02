/**
 * 【共享库】bulk-ingest 流水线公共工具
 *
 * 提供：CSV 解析、CLI 参数、Drizzle 连接、TMDB 客户端、TMDB→SQL 字段映射等。
 * 不直接运行；由 bulk-ingest/ 下各步骤脚本 import。
 */
import { readFileSync } from "node:fs";
import { createDatabaseClient, closeDatabaseClient } from "../../src/db/index";
import { imdbIdFromTmdbExternalIds } from "../../src/lib/movie-search";

export type CsvRow = {
  title: string;
  title_zh: string;
  original_title: string;
  year: string;
  platform: string;
  type: string;
  note: string;
  url: string;
  slug: string;
};

export type CliArgs = Record<string, string | boolean>;

export function parseCliArgs(argv: string[]): CliArgs {
  const args: CliArgs = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    index += 1;
  }
  return args;
}

export function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (inQuotes) {
      if (char === '"') {
        if (line[index + 1] === '"') {
          current += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

export function parseCsvFile(path: string): CsvRow[] {
  const content = readFileSync(path, "utf8").replace(/^\uFEFF/, "");
  const lines = content.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = values[index] ?? "";
    });
    return record as CsvRow;
  });
}

export function selectRowsForPilot(rows: CsvRow[], limitMovies: number): CsvRow[] {
  const allowed = new Set<string>();
  const selected: CsvRow[] = [];

  for (const row of rows) {
    if (!row.year?.trim()) continue;
    const key = `${row.title_zh}\t${row.year}`;
    if (allowed.has(key)) {
      selected.push(row);
      continue;
    }
    if (allowed.size < limitMovies) {
      allowed.add(key);
      selected.push(row);
    }
  }

  return selected;
}

export function movieGroupKey(title: string, year: string | null | undefined) {
  return `${title.trim()}\t${(year ?? "").trim()}`;
}

export type TitleContext = {
  titleZh: string;
  originalTitle: string;
  slug: string;
};

export type TmdbSearchCandidate = {
  id: number;
  title?: string;
  original_title?: string;
  release_date?: string;
  popularity?: number;
  vote_count?: number;
};

export function buildTitleContextMap(rows: CsvRow[]) {
  const map = new Map<string, TitleContext>();
  for (const row of rows) {
    const key = movieGroupKey(row.title, row.year);
    if (map.has(key)) continue;
    map.set(key, {
      titleZh: row.title_zh.trim(),
      originalTitle: row.original_title.trim(),
      slug: row.slug.trim(),
    });
  }
  return map;
}

export function normalizeTitleForMatch(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const NON_FEATURE_PATTERNS = [
  /making of/i,
  /live!/i,
  /return to/i,
  /story within/i,
  /under the hood/i,
  /tales of the/i,
  /books of/i,
  /part 3/i,
  /dispatches from/i,
  /^ecw /i,
  /true love: making/i,
  /why i, the creator/i,
  /fact or fiction/i,
  /from space/i,
];

export function isLikelyNonFeatureCandidate(candidate: TmdbSearchCandidate) {
  const text = `${candidate.title ?? ""} ${candidate.original_title ?? ""}`;
  return NON_FEATURE_PATTERNS.some((pattern) => pattern.test(text));
}

export function scoreTmdbCandidate(
  candidate: TmdbSearchCandidate,
  context: TitleContext | undefined,
  searchTitle: string,
) {
  let score = 0;
  const reasons: string[] = [];
  const candidateTitle = candidate.title ?? "";
  const candidateOriginal = candidate.original_title ?? "";
  const normSearch = normalizeTitleForMatch(searchTitle);
  const normOriginal = normalizeTitleForMatch(candidateOriginal);
  const normCandidateTitle = normalizeTitleForMatch(candidateTitle);
  const normCsvOriginal = normalizeTitleForMatch(context?.originalTitle ?? "");
  const titleZh = context?.titleZh ?? "";

  if (isLikelyNonFeatureCandidate(candidate)) {
    score -= 120;
    reasons.push("non-feature");
  }

  if (titleZh && candidateTitle === titleZh) {
    score += 120;
    reasons.push("title_zh-exact");
  } else if (titleZh && candidateTitle.includes(titleZh)) {
    score += 70;
    reasons.push("title_zh-partial");
  }

  if (titleZh && normCandidateTitle === normalizeTitleForMatch(titleZh)) {
    score += 40;
    reasons.push("title_zh-normalized");
  }

  if (normOriginal && normSearch && normOriginal === normSearch) {
    score += 90;
    reasons.push("original-search-exact");
  }

  if (normCsvOriginal && normOriginal && normCsvOriginal === normOriginal) {
    const csvOriginal = context?.originalTitle ?? "";
    const weakCsvOriginalMatch =
      csvOriginal.length <= 5 &&
      titleZh &&
      candidateTitle !== titleZh &&
      normalizeTitleForMatch(csvOriginal) === normSearch;
    score += weakCsvOriginalMatch ? 20 : 90;
    reasons.push(weakCsvOriginalMatch ? "original-csv-weak" : "original-csv-exact");
  }

  if (normOriginal && normSearch && normOriginal.includes(normSearch) && normSearch.length >= 4) {
    score += 35;
    reasons.push("original-contains-search");
  }

  if (searchTitle.length <= 4 && candidateOriginal.toUpperCase() === searchTitle.toUpperCase()) {
    score += 45;
    reasons.push("short-title-original-match");
  }

  if (candidate.popularity) {
    score += Math.min(candidate.popularity / 10, 20);
    reasons.push("popularity");
  }

  if (candidate.vote_count) {
    score += Math.min(candidate.vote_count / 100, 15);
    reasons.push("vote_count");
  }

  const extraWords = normCandidateTitle.split(" ").length - normSearch.split(" ").length;
  if (extraWords > 2 && titleZh && !candidateTitle.includes(titleZh)) {
    score -= 25;
    reasons.push("extra-title-words");
  }

  return { score, reasons };
}

export function pickBestCandidate(
  candidates: TmdbSearchCandidate[],
  context: TitleContext | undefined,
  searchTitle: string,
  options: { minScore?: number; minGap?: number } = {},
) {
  const minScore = options.minScore ?? 60;
  const minGap = options.minGap ?? 15;

  const scored = candidates
    .map((candidate) => ({
      candidate,
      ...scoreTmdbCandidate(candidate, context, searchTitle),
    }))
    .sort((left, right) => right.score - left.score);

  const top = scored[0];
  const second = scored[1];

  if (!top || top.score < minScore) {
    return { decision: "manual" as const, scored };
  }
  if (second && top.score - second.score < minGap) {
    return { decision: "manual" as const, scored };
  }
  return { decision: "resolved" as const, pick: top, scored };
}

export function mergeCandidates(...lists: TmdbSearchCandidate[][]) {
  const seen = new Set<number>();
  const merged: TmdbSearchCandidate[] = [];
  for (const list of lists) {
    for (const item of list) {
      if (!item?.id || seen.has(item.id)) continue;
      seen.add(item.id);
      merged.push(item);
    }
  }
  return merged;
}

export function filterCandidatesByYear(
  candidates: TmdbSearchCandidate[],
  year: string,
  tolerance = 0,
) {
  const target = Number(year);
  if (!Number.isFinite(target)) {
    return candidates.filter((item) => item.release_date?.startsWith(year));
  }

  return candidates.filter((item) => {
    const releaseYear = Number(item.release_date?.slice(0, 4));
    if (!Number.isFinite(releaseYear)) return false;
    return Math.abs(releaseYear - target) <= tolerance;
  });
}

export async function searchTmdbMovieCandidates(
  tmdbFetch: (path: string) => Promise<{ results?: TmdbSearchCandidate[] }>,
  query: string,
  year: string,
  options: { yearTolerance?: number } = {},
) {
  if (!query.trim()) return [] as TmdbSearchCandidate[];

  const yearTolerance = options.yearTolerance ?? 0;
  const primary = await tmdbFetch(
    `/search/movie?query=${encodeURIComponent(query)}&year=${encodeURIComponent(year)}&language=zh-CN&page=1`,
  );
  let results = filterCandidatesByYear(primary.results ?? [], year, yearTolerance);

  if (results.length === 0) {
    const fallback = await tmdbFetch(
      `/search/movie?query=${encodeURIComponent(query)}&language=zh-CN&page=1`,
    );
    results = filterCandidatesByYear(fallback.results ?? [], year, yearTolerance);
  }

  return results.slice(0, 8);
}

export function stripLeadingArticle(title: string) {
  return title.replace(/^the\s+/i, "").trim();
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function defaultBatchId(prefix = "pilot") {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `${prefix}-${stamp}`;
}

export function requireDatabase() {
  const client = createDatabaseClient();
  if (!client) {
    throw new Error("DATABASE_URL is not set. Add Supabase Transaction pooler URI to .env.local first.");
  }
  return client;
}

export async function withDatabase<T>(
  fn: (client: NonNullable<ReturnType<typeof createDatabaseClient>>) => Promise<T>,
) {
  const client = requireDatabase();
  try {
    return await fn(client);
  } finally {
    await closeDatabaseClient();
  }
}

export const BULK_CURATION_DEFAULTS = {
  verdict: "待人工补充",
  bestWay: "待人工补充",
  idealScene: "待人工补充",
  notFor: "待人工补充",
  posterTone: "from-slate-600 via-zinc-800 to-black",
  versionSignals: [
    { label: "4K", value: "需以平台和发行版本标识为准", verdict: "待确认" as const },
    { label: "HDR", value: "需以平台和设备支持为准", verdict: "待确认" as const },
    { label: "Blu-ray", value: "可继续补充实体发行信息", verdict: "待确认" as const },
    { label: "流媒体", value: "可补充画质与码率判断", verdict: "待确认" as const },
  ],
  deviceAdvice: ["待人工补充"],
  related: [] as string[],
};

export function cleanEnv(value = "") {
  return String(value).trim().replace(/^['"]|['"]$/g, "").trim();
}

const COUNTRY_ZH: Record<string, string> = {
  US: "美国",
  GB: "英国",
  HK: "中国香港",
  TW: "中国台湾",
  MO: "中国澳门",
  CN: "中国大陆",
  FR: "法国",
  CA: "加拿大",
  JP: "日本",
  KR: "韩国",
};

const LANGUAGE_ZH: Record<string, string> = {
  English: "英语",
  Cantonese: "粤语",
  Mandarin: "普通话",
  Chinese: "汉语",
  French: "法语",
  Japanese: "日语",
  Korean: "韩语",
};

function localizeCountry(country: { iso_3166_1?: string; name?: string }) {
  return COUNTRY_ZH[country?.iso_3166_1 ?? ""] || country?.name;
}

function localizeLanguage(language: { english_name?: string; name?: string }) {
  const english = language?.english_name || language?.name;
  return LANGUAGE_ZH[english ?? ""] || english;
}

function dedupe(values: unknown) {
  if (!Array.isArray(values)) return undefined;
  const unique = [...new Set(values.filter(Boolean))];
  return unique.length ? unique : undefined;
}

export function createTmdbClient() {
  const apiBase = cleanEnv(process.env.TMDB_API_BASE_URL) || "https://api.themoviedb.org/3";
  const token = cleanEnv(process.env.TMDB_READ_ACCESS_TOKEN).replace(/^Bearer\s+/i, "").trim();
  const apiKey = cleanEnv(process.env.TMDB_API_KEY);
  const curlFallback = cleanEnv(process.env.TMDB_CURL_FALLBACK).toLowerCase() !== "false";

  if (!token && !apiKey) {
    throw new Error("Missing TMDB_READ_ACCESS_TOKEN or TMDB_API_KEY in .env.local.");
  }

  async function tmdbFetch(path: string) {
    const separator = path.includes("?") ? "&" : "?";
    const url = `${apiBase}${path}${apiKey && !token ? `${separator}api_key=${encodeURIComponent(apiKey)}` : ""}`;
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

    try {
      const response = await fetch(url, { headers });
      if (!response.ok) {
        throw new Error(`TMDB request failed: ${response.status}`);
      }
      return response.json();
    } catch (error) {
      if (!curlFallback) throw error;
      return curlFetchJson(url, token, error);
    }
  }

  return { tmdbFetch, token, apiKey };
}

async function curlFetchJson(url: string, bearerToken: string, originalError: unknown) {
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const execFileAsync = promisify(execFile);
  const args = [
    "--silent",
    "--show-error",
    "--fail",
    "--location",
    "--max-time",
    cleanEnv(process.env.TMDB_CURL_TIMEOUT) || "12",
  ];
  if (bearerToken) args.push("--header", `Authorization: Bearer ${bearerToken}`);
  args.push(url);

  try {
    const { stdout } = await execFileAsync("curl", args, { maxBuffer: 1024 * 1024 * 4 });
    return JSON.parse(stdout);
  } catch (error) {
    const fetchMessage = originalError instanceof Error ? originalError.message : String(originalError);
    const curlMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`TMDB curl fallback failed. fetch=${fetchMessage} curl=${curlMessage}`);
  }
}

export function mapTmdbCollection(
  belongsToCollection?: {
    id?: number;
    name?: string;
    poster_path?: string | null;
    backdrop_path?: string | null;
  } | null,
) {
  if (!belongsToCollection?.id || !belongsToCollection?.name) {
    return undefined;
  }

  return {
    tmdbId: belongsToCollection.id,
    name: belongsToCollection.name,
    posterPath: belongsToCollection.poster_path ?? undefined,
    backdropPath: belongsToCollection.backdrop_path ?? undefined,
  };
}

export function mapTmdbKeywords(
  keywordsResponse?: {
    keywords?: Array<{ id?: number; name?: string }>;
  } | null,
) {
  const names = dedupe(
    keywordsResponse?.keywords
      ?.map((keyword) => keyword.name)
      .filter((name): name is string => Boolean(name)),
  );

  return names?.length ? names : undefined;
}

export function mapTmdbDetailsToMovieValues(
  movie: {
    id: number;
    title?: string;
    original_title?: string;
    release_date?: string;
    runtime?: number;
    vote_average?: number;
    overview?: string;
    genres?: Array<{ name?: string }>;
    belongs_to_collection?: {
      id?: number;
      name?: string;
      poster_path?: string | null;
      backdrop_path?: string | null;
    } | null;
    keywords?: {
      keywords?: Array<{ id?: number; name?: string }>;
    };
    external_ids?: { imdb_id?: string | null };
    credits?: {
      crew?: Array<{ job?: string; name?: string }>;
      cast?: Array<{ name?: string }>;
    };
    production_countries?: Array<{ iso_3166_1?: string; name?: string }>;
    spoken_languages?: Array<{ english_name?: string; name?: string }>;
    alternative_titles?: { titles?: Array<{ title?: string }> };
  },
  options: {
    slug: string;
    seedPaths: Array<{ platform: string; type: string; note: string; url?: string | null }>;
    contentStatus: "draft" | "review" | "published";
    now: string;
    posterUrl?: string | null;
    backdropUrl?: string | null;
    sourcePosterUrl?: string | null;
    sourceBackdropUrl?: string | null;
    palette?: Record<string, string | undefined> | null;
  },
) {
  const title = movie.title || movie.original_title || options.slug;
  const originalTitle = movie.original_title || title;
  const director = movie.credits?.crew?.find((member: { job?: string }) => member.job === "Director")?.name ?? "待补充";
  const cast =
    movie.credits?.cast
      ?.slice(0, 5)
      .map((member: { name?: string }) => member.name)
      .filter(Boolean) ?? [];
  const writers = dedupe(
    movie.credits?.crew
      ?.filter((member: { job?: string }) => ["Screenplay", "Writer", "Story", "Author"].includes(member.job ?? ""))
      .map((member: { name?: string }) => member.name)
      .filter(Boolean),
  );
  const countries = movie.production_countries?.map(localizeCountry).filter(Boolean);
  const languages = movie.spoken_languages?.map(localizeLanguage).filter(Boolean);
  const aka = dedupe(
    movie.alternative_titles?.titles
      ?.map((entry: { title?: string }) => entry.title)
      .filter(
        (entryTitle): entryTitle is string =>
          Boolean(entryTitle) && entryTitle !== movie.title && entryTitle !== movie.original_title,
      ),
  )?.slice(0, 6);

  return {
    slug: options.slug,
    tmdbId: movie.id,
    imdbId: imdbIdFromTmdbExternalIds(movie.external_ids),
    title,
    originalTitle,
    year: movie.release_date?.slice(0, 4) || "未知",
    genres: movie.genres?.map((genre: { name?: string }) => genre.name).filter(Boolean) ?? [],
    director,
    cast: cast.length ? cast : ["待补充"],
    runtime: movie.runtime ? `${movie.runtime} 分钟` : "待补充",
    writers,
    countries,
    languages,
    releaseDate: movie.release_date ?? undefined,
    aka,
    collection: mapTmdbCollection(movie.belongs_to_collection),
    keywords: mapTmdbKeywords(movie.keywords),
    rating: typeof movie.vote_average === "number" ? `${movie.vote_average.toFixed(1)} / 10` : "待补充",
    ratings: {
      douban: "待补充",
      imdb: typeof movie.vote_average === "number" ? movie.vote_average.toFixed(1) : "待确认",
      rottenTomatoes: "待补充",
    },
    posterTone: BULK_CURATION_DEFAULTS.posterTone,
    posterUrl: options.posterUrl ?? undefined,
    backdropUrl: options.backdropUrl ?? undefined,
    sourcePosterUrl: options.sourcePosterUrl ?? undefined,
    sourceBackdropUrl: options.sourceBackdropUrl ?? undefined,
    palette: options.palette ?? undefined,
    summary: movie.overview || "暂无简介，待人工补充。",
    verdict: BULK_CURATION_DEFAULTS.verdict,
    bestWay: BULK_CURATION_DEFAULTS.bestWay,
    idealScene: BULK_CURATION_DEFAULTS.idealScene,
    notFor: BULK_CURATION_DEFAULTS.notFor,
    versionSignals: BULK_CURATION_DEFAULTS.versionSignals,
    deviceAdvice: BULK_CURATION_DEFAULTS.deviceAdvice,
    related: BULK_CURATION_DEFAULTS.related,
    contentStatus: options.contentStatus,
    sourceProvider: "tmdb" as const,
    sourceUpdatedAt: options.now,
    imageCachedAt: options.posterUrl || options.backdropUrl ? options.now : undefined,
    viewingPaths: options.seedPaths,
  };
}
