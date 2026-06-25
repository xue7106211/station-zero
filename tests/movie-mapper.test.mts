import test from "node:test";
import assert from "node:assert/strict";
import { mapMovieRowToMovie, mapViewingPathRow } from "../src/lib/movie-mapper";

test("mapViewingPathRow keeps public viewing path fields", () => {
  const path = mapViewingPathRow({
    id: "00000000-0000-4000-8000-000000000001",
    movieId: "00000000-0000-4000-8000-000000000002",
    platform: "Apple TV",
    type: "租赁/购买",
    note: "4K HDR",
    url: "https://tv.apple.com/example",
    visibility: "public",
    sortOrder: 0,
    createdAt: "2026-06-25T00:00:00.000Z",
  });

  assert.equal(path.platform, "Apple TV");
  assert.equal(path.type, "租赁/购买");
  assert.equal(path.url, "https://tv.apple.com/example");
});

test("mapMovieRowToMovie maps SQL row into public Movie shape", () => {
  const movie = mapMovieRowToMovie(
    {
      id: "00000000-0000-4000-8000-000000000003",
      slug: "dune-part-two",
      tmdbId: 693134,
      title: "沙丘 2",
      originalTitle: "Dune: Part Two",
      year: "2024",
      genres: ["科幻"],
      director: "丹尼斯·维伦纽瓦",
      cast: ["提莫西·查拉梅"],
      runtime: "166 分钟",
      writers: null,
      countries: null,
      languages: null,
      releaseDate: null,
      aka: null,
      rating: "8.8 / 10",
      ratings: { imdb: "8.5" },
      posterTone: "from-amber-500 via-orange-700 to-stone-900",
      posterUrl: "/media/posters/dune-part-two.jpg",
      backdropUrl: null,
      sourcePosterUrl: null,
      sourceBackdropUrl: null,
      palette: null,
      summary: "史诗科幻续作。",
      verdict: "优先选择大屏版本",
      bestWay: "IMAX / 4K HDR",
      idealScene: "影院或家庭影院沉浸观看",
      notFor: "没看过前作的观众",
      versionSignals: [{ label: "4K", value: "有", verdict: "强推荐" }],
      deviceAdvice: ["投影优先"],
      related: ["沙丘"],
      contentStatus: "published",
      sourceProvider: "tmdb",
      sourceUpdatedAt: "2026-06-25T00:00:00.000Z",
      imageCachedAt: null,
      createdAt: "2026-06-25T00:00:00.000Z",
      updatedAt: "2026-06-25T00:00:00.000Z",
    },
    [
      {
        id: "00000000-0000-4000-8000-000000000004",
        movieId: "00000000-0000-4000-8000-000000000003",
        platform: "Apple TV",
        type: "租赁/购买",
        note: "4K",
        url: null,
        visibility: "public",
        sortOrder: 0,
        createdAt: "2026-06-25T00:00:00.000Z",
      },
    ],
  );

  assert.equal(movie.slug, "dune-part-two");
  assert.equal(movie.viewingPaths.length, 1);
  assert.equal(movie.versionSignals[0]?.verdict, "强推荐");
});
