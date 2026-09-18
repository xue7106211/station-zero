import assert from "node:assert/strict";
import test from "node:test";

import {
  syncUpsertContentStatusFields,
  syncUpsertOptionalTmdbFields,
} from "../scripts/bulk-ingest/shared.mts";

test("syncUpsertContentStatusFields publishes when --publish is set", () => {
  assert.deepEqual(syncUpsertContentStatusFields(true, "published"), {
    contentStatus: "published",
  });
});

test("syncUpsertContentStatusFields preserves status on update when not publishing", () => {
  assert.deepEqual(syncUpsertContentStatusFields(false, "draft"), {});
});

test("syncUpsertOptionalTmdbFields omits undefined keywords and collection on conflict update", () => {
  assert.deepEqual(syncUpsertOptionalTmdbFields({}), {});
  assert.deepEqual(syncUpsertOptionalTmdbFields({ keywords: undefined, collection: undefined }), {});
});

test("syncUpsertOptionalTmdbFields writes keywords and collection when present", () => {
  assert.deepEqual(
    syncUpsertOptionalTmdbFields({
      keywords: ["heist", "dream"],
      collection: { tmdbId: 1, name: "Test Collection" },
    }),
    {
      keywords: ["heist", "dream"],
      collection: { tmdbId: 1, name: "Test Collection" },
    },
  );
});
