import test from "node:test";
import assert from "node:assert/strict";
import {
  CURATION_PLACEHOLDER,
  isCurationPlaceholder,
  resolveDecisionTags,
} from "../src/lib/decision-tags";

test("isCurationPlaceholder treats empty and bulk-ingest default as placeholder", () => {
  assert.equal(isCurationPlaceholder(""), true);
  assert.equal(isCurationPlaceholder("  "), true);
  assert.equal(isCurationPlaceholder(CURATION_PLACEHOLDER), true);
  assert.equal(isCurationPlaceholder("值得大屏观看"), false);
});

test("resolveDecisionTags hides placeholder curation text", () => {
  const tags = resolveDecisionTags(CURATION_PLACEHOLDER, CURATION_PLACEHOLDER, {
    genres: ["剧情"],
    runtime: "91 分钟",
    rating: "7.2 / 10",
  });

  assert.deepEqual(tags, [
    { text: "剧情", emphasis: true },
    { text: "91 分钟", emphasis: false },
    { text: "7.2 / 10", emphasis: false },
  ]);
});

test("resolveDecisionTags keeps curated verdict and bestWay when present", () => {
  const tags = resolveDecisionTags("值得安静大屏观看", "4K HDR + Blu-ray", {
    genres: ["剧情"],
    runtime: "91 分钟",
  });

  assert.deepEqual(tags, [
    { text: "值得安静大屏观看", emphasis: true },
    { text: "4K HDR", emphasis: false },
    { text: "Blu-ray", emphasis: false },
  ]);
});

test("resolveDecisionTags uses rating when genres are missing", () => {
  const tags = resolveDecisionTags(CURATION_PLACEHOLDER, CURATION_PLACEHOLDER, {
    runtime: "120 分钟",
    rating: "8.1 / 10",
  });

  assert.deepEqual(tags, [
    { text: "8.1 / 10", emphasis: true },
    { text: "120 分钟", emphasis: false },
  ]);
});

test("resolveDecisionTags returns empty when placeholders have no fallback data", () => {
  const tags = resolveDecisionTags(CURATION_PLACEHOLDER, CURATION_PLACEHOLDER);
  assert.deepEqual(tags, []);
});
