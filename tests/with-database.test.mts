import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("withDatabase closes the script-scoped postgres client", () => {
  const source = readFileSync("scripts/bulk-ingest/shared.mts", "utf8");
  const withDatabaseBlock = source.slice(
    source.indexOf("export async function withDatabase"),
    source.indexOf("export const BULK_CURATION_DEFAULTS"),
  );

  assert.match(withDatabaseBlock, /await client\.sql\.end\(/);
  assert.doesNotMatch(withDatabaseBlock, /finally\s*\{[\s\S]*await closeDatabaseClient\(/);
});
