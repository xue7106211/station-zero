import { defaultMovies, type Movie, type ViewingPath } from "./content";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

type TmdbMovieSummary = {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  overview?: string;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  genre_ids?: number[];
  poster_path?: string | null;
  backdrop_path?: string | null;
};

type TmdbMovieDetails = TmdbMovieSummary & {
  runtime?: number;
  genres?: { id: number; name: string }[];
  credits?: {
    cast?: { name: string }[];
    crew?: { name: string; job: string }[];
  };
  "watch/providers"?: {
    results?: Record<
      string,
      {
        flatrate?: { provider_name: string }[];
        rent?: { provider_name: string }[];
        buy?: { provider_name: string }[];
      }
    >;
  };
};

type TmdbWatchProviderRegion = NonNullable<
  NonNullable<TmdbMovieDetails["watch/providers"]>["results"]
>[string];

const DEFAULT_TMDB_API_BASE = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w780";
const execFileAsync = promisify(execFile);

const genreFallback: Record<number, string> = {
  12: "冒险",
  18: "剧情",
  28: "动作",
  35: "喜剧",
  53: "惊悚",
  878: "科幻",
};

export function hasMovieApiConfig() {
  return Boolean(getEnvValue("TMDB_API_KEY") || getEnvValue("TMDB_READ_ACCESS_TOKEN"));
}

export async function getMovies(): Promise<Movie[]> {
  if (!hasMovieApiConfig()) {
    return defaultMovies;
  }

  try {
    const discovered = await tmdbFetch<{ results: TmdbMovieSummary[] }>(
      "/discover/movie?language=zh-CN&sort_by=vote_count.desc&with_original_language=en&vote_average.gte=7.2&page=1",
    );
    const seeds = discovered.results.slice(0, 6);
    const apiMovies = await Promise.all(seeds.map((movie) => getMovieByTmdbId(movie.id)));

    return mergeCuratedDefaults(apiMovies.filter(Boolean) as Movie[]);
  } catch (error) {
    console.warn(`TMDB movie fetch failed; falling back to curated defaults. ${formatTmdbError(error)}`);
    return defaultMovies;
  }
}

export async function getMovie(slug: string): Promise<Movie | undefined> {
  const fallback = defaultMovies.find((movie) => movie.slug === slug);

  if (!hasMovieApiConfig()) {
    return fallback;
  }

  try {
    if (fallback) {
      return mergeMovie(fallback, await searchTmdbMovie(fallback.originalTitle));
    }

    const query = slug.replaceAll("-", " ");
    return searchTmdbMovie(query);
  } catch (error) {
    console.warn(`TMDB movie fetch failed for ${slug}; using fallback. ${formatTmdbError(error)}`);
    return fallback;
  }
}

export async function getMovieSlugs() {
  const movies = await getMovies();
  return movies.map((movie) => movie.slug);
}

async function searchTmdbMovie(query: string) {
  const search = await tmdbFetch<{ results: TmdbMovieSummary[] }>(
    `/search/movie?query=${encodeURIComponent(query)}&language=zh-CN&page=1`,
  );
  const first = search.results[0];

  if (!first) {
    return undefined;
  }

  return getMovieByTmdbId(first.id);
}

async function getMovieByTmdbId(id: number) {
  const details = await tmdbFetch<TmdbMovieDetails>(
    `/movie/${id}?language=zh-CN&append_to_response=credits,watch/providers`,
  );

  return mapTmdbMovie(details);
}

async function tmdbFetch<T>(path: string): Promise<T> {
  const token = normalizeBearerToken(getEnvValue("TMDB_READ_ACCESS_TOKEN"));
  const apiKey = getEnvValue("TMDB_API_KEY");
  const apiBase = getEnvValue("TMDB_API_BASE_URL") || DEFAULT_TMDB_API_BASE;
  const separator = path.includes("?") ? "&" : "?";
  const url = `${apiBase}${path}${apiKey && !token ? `${separator}api_key=${encodeURIComponent(apiKey)}` : ""}`;
  try {
    const response = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      next: { revalidate: 60 * 60 * 24 },
    });

    if (!response.ok) {
      throw new Error(`TMDB request failed: ${response.status}`);
    }

    return response.json() as Promise<T>;
  } catch (error) {
    if (!shouldUseCurlFallback()) {
      throw error;
    }

    return curlFetchJson<T>(url, token, error);
  }
}

async function curlFetchJson<T>(url: string, token: string, originalError: unknown): Promise<T> {
  const args = ["--silent", "--show-error", "--fail", "--location", "--max-time", getEnvValue("TMDB_CURL_TIMEOUT") || "12"];

  if (token) {
    args.push("--header", `Authorization: Bearer ${token}`);
  }

  args.push(url);

  try {
    const { stdout } = await execFileAsync("curl", args, {
      maxBuffer: 1024 * 1024 * 4,
    });

    return JSON.parse(stdout) as T;
  } catch (curlError) {
    const error = new Error(`TMDB curl fallback failed after fetch failed. fetch=${formatTmdbError(originalError)} curl=${formatTmdbError(curlError)}`);
    error.cause = curlError;
    throw error;
  }
}

function shouldUseCurlFallback() {
  return getEnvValue("TMDB_CURL_FALLBACK").toLowerCase() !== "false";
}

function getEnvValue(name: string) {
  const value = process.env[name];

  if (!value) {
    return "";
  }

  return value.trim().replace(/^['"]|['"]$/g, "").trim();
}

function normalizeBearerToken(value: string) {
  return value.replace(/^Bearer\s+/i, "").trim();
}

function formatTmdbError(error: unknown) {
  if (!(error instanceof Error)) {
    return String(error);
  }

  const cause = error.cause as { code?: string; reason?: string; host?: string } | undefined;

  if (cause?.code === "ERR_TLS_CERT_ALTNAME_INVALID") {
    return `TLS certificate mismatch for ${cause.host ?? "TMDB"}; check DNS/proxy or set TMDB_API_BASE_URL to a working proxy. ${cause.reason ?? ""}`;
  }

  return `${error.name}: ${error.message}`;
}

function mapTmdbMovie(movie: TmdbMovieDetails): Movie {
  const releaseDate = movie.release_date || movie.first_air_date || "";
  const year = releaseDate.slice(0, 4) || "年份待确认";
  const title = movie.title || movie.name || movie.original_title || "Untitled";
  const originalTitle = movie.original_title || movie.original_name || title;
  const genres = movie.genres?.map((genre) => genre.name) || movie.genre_ids?.map((id) => genreFallback[id]).filter(Boolean) || [];
  const director = movie.credits?.crew?.find((person) => person.job === "Director")?.name || "导演待确认";
  const cast = movie.credits?.cast?.slice(0, 4).map((person) => person.name) || [];
  const providers = movie["watch/providers"]?.results?.US || movie["watch/providers"]?.results?.CN;

  return {
    slug: slugify(originalTitle),
    title,
    originalTitle,
    year,
    genres: genres.length ? genres : ["类型待确认"],
    director,
    cast: cast.length ? cast : ["演员待确认"],
    runtime: movie.runtime ? `${movie.runtime} 分钟` : "片长待确认",
    rating: typeof movie.vote_average === "number" ? `${movie.vote_average.toFixed(1)} / 10` : "评分待确认",
    ratings: {
      douban: "待补充",
      imdb: typeof movie.vote_average === "number" ? movie.vote_average.toFixed(1) : "待确认",
      rottenTomatoes: "待补充",
    },
    posterTone: "from-slate-600 via-zinc-800 to-black",
    posterUrl: movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : undefined,
    backdropUrl: movie.backdrop_path ? `${TMDB_IMAGE_BASE}${movie.backdrop_path}` : undefined,
    summary: movie.overview || "简介待补充。",
    verdict: "适合纳入观影决策",
    bestWay: "优先确认正版平台、4K / HDR 标识和发行版本",
    idealScene: "适合根据设备与片源规格选择观看方式",
    notFor: "不适合只看标题就决定版本的场景",
    viewingPaths: mapProviders(providers),
    versionSignals: [
      { label: "4K", value: "需以平台和发行版本标识为准", verdict: "待确认" },
      { label: "HDR", value: "需以平台和设备支持为准", verdict: "待确认" },
      { label: "Blu-ray", value: "可继续补充实体发行信息", verdict: "待确认" },
      { label: "流媒体", value: movie.backdrop_path || movie.poster_path ? "可补充画质与码率判断" : "待补充视觉资料", verdict: "待确认" },
    ],
    deviceAdvice: ["先确认片源规格", "大屏观看前检查 HDR 标识", "声音表现需结合平台音轨", "收藏前确认发行版本"],
    related: genres.slice(0, 3),
  };
}

function mapProviders(providers: TmdbWatchProviderRegion | undefined): ViewingPath[] {
  if (!providers) {
    return [{ platform: "TMDB Watch Providers", type: "资料来源", note: "暂无可用平台数据，需人工补充地区可用性" }];
  }

  const paths: ViewingPath[] = [];

  providers.flatrate?.slice(0, 2).forEach((provider) => paths.push({ platform: provider.provider_name, type: "订阅", note: "平台可用性以实时地区结果为准" }));
  providers.rent?.slice(0, 2).forEach((provider) => paths.push({ platform: provider.provider_name, type: "租赁/购买", note: "租赁信息以平台实时结果为准" }));
  providers.buy?.slice(0, 2).forEach((provider) => paths.push({ platform: provider.provider_name, type: "租赁/购买", note: "购买信息以平台实时结果为准" }));

  return paths.length ? paths.slice(0, 4) : [{ platform: "TMDB Watch Providers", type: "资料来源", note: "暂无订阅、租赁或购买数据" }];
}

function mergeCuratedDefaults(apiMovies: Movie[]) {
  const defaultSlugs = new Set(defaultMovies.map((movie) => movie.slug));
  return [...defaultMovies, ...apiMovies.filter((movie) => !defaultSlugs.has(movie.slug))];
}

function mergeMovie(fallback: Movie, apiMovie: Movie | undefined): Movie {
  if (!apiMovie) {
    return fallback;
  }

  return {
    ...fallback,
    title: apiMovie.title || fallback.title,
    originalTitle: apiMovie.originalTitle || fallback.originalTitle,
    year: apiMovie.year || fallback.year,
    genres: apiMovie.genres.length ? apiMovie.genres : fallback.genres,
    director: apiMovie.director || fallback.director,
    cast: apiMovie.cast.length ? apiMovie.cast : fallback.cast,
    runtime: apiMovie.runtime || fallback.runtime,
    rating: apiMovie.rating || fallback.rating,
    ratings: {
      douban: fallback.ratings?.douban ?? "待补充",
      imdb: apiMovie.ratings?.imdb || fallback.ratings?.imdb || fallback.rating.split(" ")[0],
      rottenTomatoes: fallback.ratings?.rottenTomatoes ?? "待补充",
    },
    posterUrl: apiMovie.posterUrl || fallback.posterUrl,
    backdropUrl: apiMovie.backdropUrl || fallback.backdropUrl,
    summary: apiMovie.summary || fallback.summary,
    viewingPaths: apiMovie.viewingPaths.length ? apiMovie.viewingPaths : fallback.viewingPaths,
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
