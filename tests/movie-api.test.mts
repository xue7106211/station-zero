import assert from "node:assert/strict";
import test from "node:test";

import { shouldUseJsonMovieStore } from "../src/lib/movie-api";

test("shouldUseJsonMovieStore is true without DATABASE_URL", () => {
  const previous = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  try {
    assert.equal(shouldUseJsonMovieStore(), true);
  } finally {
    if (previous === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = previous;
    }
  }
});

test("shouldUseJsonMovieStore is false when DATABASE_URL is configured", () => {
  const previous = process.env.DATABASE_URL;
  process.env.DATABASE_URL = "postgres://user:pass@localhost:6543/postgres";
  try {
    assert.equal(shouldUseJsonMovieStore(), false);
  } finally {
    if (previous === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = previous;
    }
  }
});
