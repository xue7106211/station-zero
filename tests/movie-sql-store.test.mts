import assert from "node:assert/strict";
import test from "node:test";

import { publishedMoviesListOrder } from "../src/lib/movie-sql-store";

test("publishedMoviesListOrder includes slug tiebreaker for stable pagination", () => {
  assert.equal(publishedMoviesListOrder.length, 2);
});
