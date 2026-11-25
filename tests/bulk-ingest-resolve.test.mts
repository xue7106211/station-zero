import assert from "node:assert/strict";
import test from "node:test";

import { decideTmdbResolveOutcome } from "../scripts/bulk-ingest/shared.mts";

test("decideTmdbResolveOutcome rejects a single TMDB hit when title score is below threshold", () => {
  const outcome = decideTmdbResolveOutcome(
    [
      {
        id: 99,
        title: "Ocean Waves",
        original_title: "Umi ga Kikoeru",
        release_date: "1993-03-15",
      },
    ],
    { titleZh: "进攻的巨人", originalTitle: "Attack on Titan" },
    "进攻的巨人",
  );

  assert.equal(outcome.status, "ambiguous");
  if (outcome.status === "ambiguous") {
    assert.equal(outcome.candidates[0]?.id, 99);
  }
});

test("decideTmdbResolveOutcome auto-resolves a single TMDB hit when title score is confident", () => {
  const outcome = decideTmdbResolveOutcome(
    [
      {
        id: 603,
        title: "黑客帝国",
        original_title: "The Matrix",
        release_date: "1999-03-31",
      },
    ],
    { titleZh: "黑客帝国", originalTitle: "The Matrix" },
    "黑客帝国",
  );

  assert.equal(outcome.status, "resolved");
  if (outcome.status === "resolved") {
    assert.equal(outcome.tmdbId, 603);
  }
});