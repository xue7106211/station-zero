import assert from "node:assert/strict";
import test from "node:test";

import { shouldReplaceMovieRelations } from "../scripts/lib/migrate-json-relations.mts";

test("shouldReplaceMovieRelations replaces children only on first insert", () => {
  assert.equal(shouldReplaceMovieRelations(false), true);
  assert.equal(shouldReplaceMovieRelations(true), false);
});
