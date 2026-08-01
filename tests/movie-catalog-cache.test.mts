import assert from "node:assert/strict";
import test from "node:test";

import {
  MOVIES_CATALOG_CACHE_TAG,
  MOVIES_CATALOG_REVALIDATE_SECONDS,
} from "../src/lib/movie-catalog-cache";

test("movies catalog cache uses a 24h revalidate window and stable tag", () => {
  assert.equal(MOVIES_CATALOG_REVALIDATE_SECONDS, 86400);
  assert.equal(MOVIES_CATALOG_CACHE_TAG, "movies-catalog");
});
