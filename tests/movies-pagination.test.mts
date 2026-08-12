import assert from "node:assert/strict";
import test from "node:test";

import { clampPageNumber, MOVIES_PAGE_SIZE, paginateMovies } from "../src/lib/movies-pagination";

test("clampPageNumber clamps out-of-range pages", () => {
  assert.equal(clampPageNumber(999, 516, MOVIES_PAGE_SIZE), 18);
  assert.equal(clampPageNumber(0, 516, MOVIES_PAGE_SIZE), 1);
  assert.equal(clampPageNumber(1, 0, MOVIES_PAGE_SIZE), 1);
});

test("paginateMovies returns last page items when page exceeds totalPages", () => {
  const items = Array.from({ length: 516 }, (_, index) => index + 1);
  const { items: pageItems, currentPage, totalPages } = paginateMovies(items, 999, MOVIES_PAGE_SIZE);

  assert.equal(currentPage, 18);
  assert.equal(totalPages, 18);
  assert.equal(pageItems.length, 6);
  assert.deepEqual(pageItems.slice(0, 2), [511, 512]);
});
