import assert from "node:assert/strict";
import test from "node:test";

import {
  moviesEligibleForBatchPublish,
  shouldBlockStagingClear,
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

test("moviesEligibleForBatchPublish only promotes draft rows", () => {
  const rows = [
    { slug: "a", contentStatus: "draft" },
    { slug: "b", contentStatus: "review" },
    { slug: "c", contentStatus: "published" },
  ];

  assert.deepEqual(moviesEligibleForBatchPublish(rows).map((row) => row.slug), ["a"]);
});

test("shouldBlockStagingClear blocks wiping resolved batches unless forced", () => {
  assert.equal(
    shouldBlockStagingClear(3, { clearBatch: true, forceClear: false }),
    true,
  );
  assert.equal(
    shouldBlockStagingClear(3, { clearBatch: true, forceClear: true }),
    false,
  );
  assert.equal(
    shouldBlockStagingClear(3, { clearBatch: false, forceClear: false }),
    false,
  );
});
