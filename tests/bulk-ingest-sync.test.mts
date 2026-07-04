import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSyncMovieSlugCandidates,
  resolveIngestMovieSlug,
  syncUpsertContentStatusFields,
} from "../scripts/bulk-ingest/shared.mts";

test("syncUpsertContentStatusFields publishes when --publish is set", () => {
  assert.deepEqual(syncUpsertContentStatusFields(true, "published"), {
    contentStatus: "published",
  });
});

test("syncUpsertContentStatusFields preserves status on update when not publishing", () => {
  assert.deepEqual(syncUpsertContentStatusFields(false, "draft"), {});
});

test("buildSyncMovieSlugCandidates prefers base, year, then tmdb id suffixes", () => {
  assert.deepEqual(buildSyncMovieSlugCandidates("heat", 550, "1988"), [
    "heat",
    "heat-1988",
    "heat-550",
    "movie-550",
  ]);
});

test("resolveIngestMovieSlug reuses slug already tied to the same tmdb id", () => {
  assert.equal(
    resolveIngestMovieSlug(550, "heat", "1988", "heat-legacy", [
      { slug: "heat", tmdbId: 100 },
    ]),
    "heat-legacy",
  );
});

test("resolveIngestMovieSlug skips slug owned by another movie", () => {
  assert.equal(
    resolveIngestMovieSlug(999, "heat", "1988", undefined, [
      { slug: "heat", tmdbId: 100 },
      { slug: "heat-1988", tmdbId: 200 },
    ]),
    "heat-999",
  );
});

test("resolveIngestMovieSlug returns first free candidate", () => {
  assert.equal(
    resolveIngestMovieSlug(550, "heat", "1988", undefined, [{ slug: "heat", tmdbId: 100 }]),
    "heat-1988",
  );
});
