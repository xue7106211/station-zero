import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { defaultMovies, type Movie, type VersionSignal, type ViewingPath } from "./content";

export type MovieContentStatus = "draft" | "review" | "published";
export type MovieSourceProvider = "tmdb" | "manual" | "other";

export type MovieRecord = Movie & {
  tmdbId?: number;
  sourcePosterUrl?: string;
  sourceBackdropUrl?: string;
  contentStatus: MovieContentStatus;
  sourceProvider: MovieSourceProvider;
  sourceUpdatedAt: string;
  imageCachedAt?: string;
  createdAt: string;
  updatedAt: string;
};

type MovieDatabase = {
  version: number;
  updatedAt: string | null;
  movies: MovieRecord[];
};

const movieDatabasePath = join(process.cwd(), "data", "movies.json");
const fallbackTimestamp = "2026-06-23T00:00:00.000Z";

export async function getMoviesFromStore(): Promise<Movie[]> {
  const storedMovies = await readStoredMovies();
  return mergeWithFallback(storedMovies);
}

export async function getMovieFromStore(slug: string): Promise<Movie | undefined> {
  const movies = await getMoviesFromStore();
  return movies.find((movie) => movie.slug === slug);
}

export async function getMovieSlugsFromStore(): Promise<string[]> {
  const movies = await getMoviesFromStore();
  return movies.map((movie) => movie.slug);
}

export async function listPublishedMoviesFromStore(): Promise<Movie[]> {
  const storedMovies = await readStoredMovies();
  return storedMovies
    .filter((movie) => movie.contentStatus === "published")
    .map(toPublicMovie);
}

export async function listPublishedMovieSlugsFromStore(): Promise<string[]> {
  const storedMovies = await readStoredMovies();
  return storedMovies
    .filter((movie) => movie.contentStatus === "published")
    .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""))
    .map((movie) => movie.slug);
}

export async function readStoredMovies(): Promise<MovieRecord[]> {
  try {
    const raw = await readFile(movieDatabasePath, "utf8");
    const database = JSON.parse(raw) as MovieDatabase;
    return Array.isArray(database.movies) ? database.movies.map(normalizeMovieRecord) : [];
  } catch (error) {
    if (isMissingFileError(error)) {
      return [];
    }
    console.warn(`Movie database read failed; using curated defaults. ${formatStoreError(error)}`);
    return [];
  }
}

function toPublicMovie(record: MovieRecord): Movie {
  return {
    slug: record.slug,
    tmdbId: record.tmdbId,
    title: record.title,
    originalTitle: record.originalTitle,
    year: record.year,
    genres: record.genres,
    director: record.director,
    cast: record.cast,
    runtime: record.runtime,
    writers: record.writers,
    countries: record.countries,
    languages: record.languages,
    releaseDate: record.releaseDate,
    aka: record.aka,
    rating: record.rating,
    ratings: record.ratings,
    posterTone: record.posterTone,
    posterUrl: record.posterUrl,
    backdropUrl: record.backdropUrl,
    sourcePosterUrl: record.sourcePosterUrl,
    sourceBackdropUrl: record.sourceBackdropUrl,
    palette: record.palette,
    summary: record.summary,
    verdict: record.verdict,
    bestWay: record.bestWay,
    idealScene: record.idealScene,
    notFor: record.notFor,
    viewingPaths: record.viewingPaths,
    versionSignals: record.versionSignals,
    deviceAdvice: record.deviceAdvice,
    related: record.related,
  };
}

function mergeWithFallback(storedMovies: MovieRecord[]): Movie[] {
  const fallbackBySlug = new Map(defaultMovies.map((movie) => [movie.slug, movie]));
  const storedBySlug = new Map(storedMovies.map((movie) => [movie.slug, movie]));

  const mergedDefaults = defaultMovies.map((fallback) => ({ ...fallback, ...storedBySlug.get(fallback.slug) }));
  const additionalStored = storedMovies.filter((movie) => !fallbackBySlug.has(movie.slug));

  return [...mergedDefaults, ...additionalStored];
}

function normalizeMovieRecord(record: Partial<MovieRecord>): MovieRecord {
  const now = record.updatedAt ?? fallbackTimestamp;
  const viewingPaths = Array.isArray(record.viewingPaths) ? record.viewingPaths : [];
  const versionSignals = Array.isArray(record.versionSignals) ? record.versionSignals : [];

  return {
    slug: requireString(record.slug, "slug"),
    title: record.title ?? record.originalTitle ?? requireString(record.slug, "slug"),
    originalTitle: record.originalTitle ?? record.title ?? requireString(record.slug, "slug"),
    year: String(record.year ?? "年份待确认"),
    genres: normalizeStringArray(record.genres, ["类型待确认"]),
    director: record.director ?? "导演待确认",
    cast: normalizeStringArray(record.cast, ["演员待确认"]),
    runtime: record.runtime ?? "片长待确认",
    writers: record.writers,
    countries: record.countries,
    languages: record.languages,
    releaseDate: record.releaseDate,
    aka: record.aka,
    rating: record.rating ?? "评分待确认",
    ratings: record.ratings,
    posterTone: record.posterTone ?? "from-slate-600 via-zinc-800 to-black",
    posterUrl: record.posterUrl,
    backdropUrl: record.backdropUrl,
    palette: record.palette,
    summary: record.summary ?? "简介待补充。",
    verdict: record.verdict ?? "适合纳入观影决策",
    bestWay: record.bestWay ?? "优先确认正版平台、4K / HDR 标识和发行版本",
    idealScene: record.idealScene ?? "适合根据设备与片源规格选择观看方式",
    notFor: record.notFor ?? "不适合只看标题就决定版本的场景",
    viewingPaths: viewingPaths as ViewingPath[],
    versionSignals: versionSignals as VersionSignal[],
    deviceAdvice: normalizeStringArray(record.deviceAdvice, ["先确认片源规格", "大屏观看前检查 HDR 标识"]),
    related: normalizeStringArray(record.related, []),
    tmdbId: record.tmdbId,
    sourcePosterUrl: record.sourcePosterUrl,
    sourceBackdropUrl: record.sourceBackdropUrl,
    contentStatus: record.contentStatus ?? "draft",
    sourceProvider: record.sourceProvider ?? "manual",
    sourceUpdatedAt: record.sourceUpdatedAt ?? now,
    imageCachedAt: record.imageCachedAt,
    createdAt: record.createdAt ?? now,
    updatedAt: now,
  };
}

function normalizeStringArray(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback;
  const cleaned = value.map((item) => String(item).trim()).filter(Boolean);
  return cleaned.length ? cleaned : fallback;
}

function requireString(value: unknown, field: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Movie record requires ${field}.`);
  }
  return value;
}

function isMissingFileError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

function formatStoreError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
