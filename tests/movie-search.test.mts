import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSearchPageHref,
  imdbIdFromTmdbExternalIds,
  isSearchQueryValid,
  matchMovieForSearch,
  normalizeSearchQuery,
  parseImdbId,
} from "../src/lib/movie-search";
import type { Movie } from "../src/lib/content";

const sampleMovie: Movie = {
  slug: "the-shawshank-redemption",
  imdbId: "tt0111161",
  title: "肖申克的救赎",
  originalTitle: "The Shawshank Redemption",
  year: "1994",
  genres: ["剧情"],
  director: "弗兰克·德拉邦特",
  cast: ["蒂姆·罗宾斯", "摩根·弗里曼"],
  runtime: "142 分钟",
  writers: ["弗兰克·德拉邦特"],
  aka: ["刺激1995"],
  rating: "9.3 / 10",
  posterTone: "from-slate-600 via-zinc-800 to-black",
  summary: "监狱题材经典。",
  verdict: "值得反复观看",
  bestWay: "4K 修复版",
  idealScene: "安静夜晚大屏观看",
  notFor: "追求快节奏的观众",
  viewingPaths: [],
  versionSignals: [],
  deviceAdvice: [],
  related: [],
};

test("normalizeSearchQuery trims and collapses whitespace", () => {
  assert.equal(normalizeSearchQuery("  沙丘   2 "), "沙丘 2");
});

test("parseImdbId accepts tt-prefixed and bare numeric ids", () => {
  assert.equal(parseImdbId("tt0137523"), "tt0137523");
  assert.equal(parseImdbId("0137523"), "tt0137523");
  assert.equal(parseImdbId("invalid"), null);
});

test("isSearchQueryValid allows imdb ids and requires 2+ chars for text", () => {
  assert.equal(isSearchQueryValid("tt0111161"), true);
  assert.equal(isSearchQueryValid("沙丘"), true);
  assert.equal(isSearchQueryValid("a"), false);
  assert.equal(isSearchQueryValid(""), false);
});

test("imdbIdFromTmdbExternalIds normalizes TMDB payload", () => {
  assert.equal(imdbIdFromTmdbExternalIds({ imdb_id: "tt0111161" }), "tt0111161");
  assert.equal(imdbIdFromTmdbExternalIds({ imdb_id: "0111161" }), "tt0111161");
  assert.equal(imdbIdFromTmdbExternalIds({ imdb_id: null }), undefined);
});

test("matchMovieForSearch matches imdb, title, person, and rejects misses", () => {
  assert.equal(matchMovieForSearch(sampleMovie, "tt0111161"), "imdb");
  assert.equal(matchMovieForSearch(sampleMovie, "肖申克的救赎"), "title");
  assert.equal(matchMovieForSearch(sampleMovie, "The Shawshank"), "title");
  assert.equal(matchMovieForSearch(sampleMovie, "刺激1995"), "title");
  assert.equal(matchMovieForSearch(sampleMovie, "摩根·弗里曼"), "person");
  assert.equal(matchMovieForSearch(sampleMovie, "弗兰克·德拉邦特"), "person");
  assert.equal(matchMovieForSearch(sampleMovie, "不存在的片名"), null);
});

test("buildSearchPageHref encodes query and optional page", () => {
  assert.equal(buildSearchPageHref("沙丘 2"), "/search?q=%E6%B2%99%E4%B8%98+2");
  assert.equal(buildSearchPageHref("沙丘", 2), "/search?q=%E6%B2%99%E4%B8%98&page=2");
});
