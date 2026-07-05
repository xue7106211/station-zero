import assert from "node:assert/strict";
import test from "node:test";

import {
  mergeContentStatusOnConflict,
  stagingViewingPathUrlsToRefresh,
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

test("mergeContentStatusOnConflict never demotes published or review rows", () => {
  assert.equal(mergeContentStatusOnConflict("published", "draft"), "published");
  assert.equal(mergeContentStatusOnConflict("published", "review"), "published");
  assert.equal(mergeContentStatusOnConflict("review", "draft"), "review");
  assert.equal(mergeContentStatusOnConflict("draft", "published"), "published");
  assert.equal(mergeContentStatusOnConflict("draft", "review"), "review");
});

test("stagingViewingPathUrlsToRefresh only returns deduped staging URLs", () => {
  assert.deepEqual(
    stagingViewingPathUrlsToRefresh([
      { url: "magnet:?xt=1" },
      { url: "magnet:?xt=1" },
      { url: " https://pan.example/x " },
      { url: "" },
      {},
    ]),
    ["magnet:?xt=1", "https://pan.example/x"],
  );
});
