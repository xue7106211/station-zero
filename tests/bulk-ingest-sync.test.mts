import assert from "node:assert/strict";
import test from "node:test";

import {
  syncMovieConflictMediaFields,
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

test("syncMovieConflictMediaFields omits undefined media so conflict update keeps existing URLs", () => {
  assert.deepEqual(
    syncMovieConflictMediaFields({
      posterUrl: undefined,
      backdropUrl: "https://cdn.example/backdrop.webp",
      palette: undefined,
    }),
    {
      backdropUrl: "https://cdn.example/backdrop.webp",
    },
  );
});

test("syncMovieConflictMediaFields includes all provided media fields", () => {
  assert.deepEqual(
    syncMovieConflictMediaFields({
      posterUrl: "https://cdn.example/poster.webp",
      sourcePosterUrl: "https://image.tmdb.org/t/p/w500/x.jpg",
      imageCachedAt: "2026-07-07T00:00:00.000Z",
    }),
    {
      posterUrl: "https://cdn.example/poster.webp",
      sourcePosterUrl: "https://image.tmdb.org/t/p/w500/x.jpg",
      imageCachedAt: "2026-07-07T00:00:00.000Z",
    },
  );
});
