import assert from "node:assert/strict";
import test from "node:test";

import { selectRowsForPilot, pickStagingSearchTitle, stagingMovieGroupKey, type CsvRow } from "../scripts/bulk-ingest/shared.mts";

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

test("stagingMovieGroupKey groups by title_zh even when search title differs", () => {
  const keyA = stagingMovieGroupKey({ title: "Dune", titleZh: "沙丘", year: "2021" });
  const keyB = stagingMovieGroupKey({ title: "沙丘", titleZh: "沙丘", year: "2021" });
  assert.equal(keyA, keyB);
  assert.equal(keyA, "沙丘\t2021");
});

test("pickStagingSearchTitle prefers English search title within a title_zh group", () => {
  const searchTitle = pickStagingSearchTitle([
    { title: "沙丘", titleZh: "沙丘" },
    { title: "Dune", titleZh: "沙丘" },
  ]);
  assert.equal(searchTitle, "Dune");
});

test("stagingMovieGroupKey falls back to title when title_zh is missing", () => {
  assert.equal(stagingMovieGroupKey({ title: "片A", titleZh: null, year: "2020" }), "片A\t2020");
});
