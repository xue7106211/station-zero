import assert from "node:assert/strict";
import test from "node:test";

import {
  parseStagingMovieLimit,
  parseStagingMovieOffset,
  selectRowsForPilot,
  type CsvRow,
} from "../scripts/bulk-ingest/shared.mts";

function row(titleZh: string, year: string, note = "a"): CsvRow {
  return {
    title: titleZh,
    title_zh: titleZh,
    original_title: titleZh,
    year,
    platform: "磁力",
    type: "磁力",
    note,
    url: `magnet:${titleZh}-${note}`,
    slug: "",
  };
}

test("selectRowsForPilot selects first N unique movies and all magnet rows per movie", () => {
  const rows = [
    row("片A", "2020", "1"),
    row("片A", "2020", "2"),
    row("片B", "2021"),
    row("片C", "2022"),
  ];

  const selected = selectRowsForPilot(rows, 2);
  assert.equal(selected.length, 3);
  assert.deepEqual(
    selected.map((item) => item.note),
    ["1", "2", "a"],
  );
});

test("selectRowsForPilot skips offset unique movies before applying limit", () => {
  const rows = [
    row("片A", "2020"),
    row("片B", "2021"),
    row("片C", "2022"),
    row("片D", "2023"),
    row("片E", "2024"),
  ];

  const selected = selectRowsForPilot(rows, 2, 2);
  assert.deepEqual(
    selected.map((item) => item.title_zh),
    ["片C", "片D"],
  );
});

test("selectRowsForPilot offset skips all magnet rows for skipped movies", () => {
  const rows = [
    row("片A", "2020", "1"),
    row("片A", "2020", "2"),
    row("片B", "2021"),
    row("片C", "2022"),
  ];

  const selected = selectRowsForPilot(rows, 1, 1);
  assert.deepEqual(
    selected.map((item) => item.title_zh),
    ["片B"],
  );
});

test("selectRowsForPilot ignores rows without year", () => {
  const rows = [row("片A", ""), row("片B", "2021")];
  assert.deepEqual(selectRowsForPilot(rows, 10).map((item) => item.title_zh), ["片B"]);
});

test("selectRowsForPilot with zero limit selects all movies after offset", () => {
  const rows = [row("片A", "2020"), row("片B", "2021"), row("片C", "2022")];
  assert.deepEqual(
    selectRowsForPilot(rows, 0, 1).map((item) => item.title_zh),
    ["片B", "片C"],
  );
});

test("parseStagingMovieLimit rejects zero and invalid values", () => {
  assert.throws(() => parseStagingMovieLimit("0"), /--limit-movies must be a positive integer/);
  assert.throws(() => parseStagingMovieLimit("abc"), /--limit-movies must be a positive integer/);
  assert.equal(parseStagingMovieLimit(undefined), 100);
  assert.equal(parseStagingMovieLimit("400"), 400);
});

test("parseStagingMovieOffset rejects negative and invalid values", () => {
  assert.throws(() => parseStagingMovieOffset("-1"), /--offset-movies must be a non-negative integer/);
  assert.throws(() => parseStagingMovieOffset("abc"), /--offset-movies must be a non-negative integer/);
  assert.equal(parseStagingMovieOffset(undefined), 0);
  assert.equal(parseStagingMovieOffset("500"), 500);
});
