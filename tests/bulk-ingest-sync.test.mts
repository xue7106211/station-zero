import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSyncMovieConflictUpdateSet,
  mapTmdbDetailsToMovieValues,
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

test("buildSyncMovieConflictUpdateSet omits manual curation fields on conflict update", () => {
  const mapped = mapTmdbDetailsToMovieValues(
    { id: 1, title: "Test Movie", vote_average: 8.1 },
    {
      slug: "test-movie",
      seedPaths: [],
      contentStatus: "published",
      now: "2026-07-03T00:00:00.000Z",
    },
  );
  const updateSet = buildSyncMovieConflictUpdateSet(mapped, false, "2026-07-03T00:00:00.000Z");

  for (const field of [
    "verdict",
    "bestWay",
    "idealScene",
    "notFor",
    "versionSignals",
    "deviceAdvice",
    "related",
    "contentStatus",
  ] as const) {
    assert.ok(!(field in updateSet), `should not overwrite ${field} on conflict update`);
  }
});
