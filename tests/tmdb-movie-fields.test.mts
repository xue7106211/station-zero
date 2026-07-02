import test from "node:test";
import assert from "node:assert/strict";
import { mapTmdbCollection, mapTmdbKeywords } from "../scripts/bulk-ingest/shared.mts";

test("mapTmdbCollection maps belongs_to_collection into stored shape", () => {
  const collection = mapTmdbCollection({
    id: 131296,
    name: "The Dark Knight Collection",
    poster_path: "/poster.jpg",
    backdrop_path: "/backdrop.jpg",
  });

  assert.deepEqual(collection, {
    tmdbId: 131296,
    name: "The Dark Knight Collection",
    posterPath: "/poster.jpg",
    backdropPath: "/backdrop.jpg",
  });
});

test("mapTmdbCollection returns undefined when collection is missing", () => {
  assert.equal(mapTmdbCollection(null), undefined);
  assert.equal(mapTmdbCollection({ id: 1 }), undefined);
});

test("mapTmdbKeywords maps keyword names and dedupes", () => {
  const keywords = mapTmdbKeywords({
    keywords: [
      { id: 1, name: "sequel" },
      { id: 2, name: "sequel" },
      { id: 3, name: "superhero" },
    ],
  });

  assert.deepEqual(keywords, ["sequel", "superhero"]);
});

test("mapTmdbKeywords returns undefined when no keywords exist", () => {
  assert.equal(mapTmdbKeywords(undefined), undefined);
  assert.equal(mapTmdbKeywords({ keywords: [] }), undefined);
});
