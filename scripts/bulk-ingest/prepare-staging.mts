/**
 * 【批量录入 · 第 1 步】CSV → Supabase import_staging
 *
 * 作用：读取 movies-clean.csv，按行写入 import_staging 缓冲表。
 *       一行 = 一条观看路径（磁力）；同一部片可有多行。
 *
 * npm run ingest:staging -- --limit-movies 100 --batch-id pilot-20260628
 *
 * 上游：clean-import-txt.mjs 产出的 CSV
 * 下游：resolve-tmdb-ids.mts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { eq } from "drizzle-orm";
import { importStaging } from "../../src/db/schema";
import {
  defaultBatchId,
  parseCliArgs,
  parseCsvFile,
  selectRowsForPilot,
  withDatabase,
} from "./shared.mts";

const DEFAULT_CSV = "data/import/movies-clean.csv";

async function main() {
  const args = parseCliArgs(process.argv.slice(2));
  const csvPath = String(args.csv ?? DEFAULT_CSV);
  const batchId = String(args["batch-id"] ?? defaultBatchId("pilot"));
  const limitMovies = Number(args["limit-movies"] ?? 100);
  const clearBatch = args["no-clear-batch"] !== true;

  const allRows = parseCsvFile(csvPath);
  if (!allRows.length) {
    throw new Error(`No rows found in ${csvPath}`);
  }

  const rows = limitMovies > 0 ? selectRowsForPilot(allRows, limitMovies) : allRows;
  const uniqueMovies = new Set(rows.map((row) => `${row.title_zh}\t${row.year}`));

  await withDatabase(async ({ db }) => {
    if (clearBatch) {
      await db.delete(importStaging).where(eq(importStaging.batchId, batchId));
    }

    const chunkSize = 500;
    for (let offset = 0; offset < rows.length; offset += chunkSize) {
      const chunk = rows.slice(offset, offset + chunkSize);
      await db.insert(importStaging).values(
        chunk.map((row) => ({
          title: row.title.trim(),
          year: row.year.trim(),
          platform: row.platform.trim() || "磁力",
          type: row.type.trim() || "磁力",
          note: row.note.trim(),
          url: row.url.trim(),
          batchId,
          tmdbResolveStatus: "pending" as const,
        })),
      );
    }
  });

  const report = [
    "prepare-staging report",
    `csv: ${csvPath}`,
    `batch_id: ${batchId}`,
    `rows_inserted: ${rows.length}`,
    `unique_movies: ${uniqueMovies.size}`,
    `limit_movies: ${limitMovies}`,
  ].join("\n");

  mkdirSync("data/import", { recursive: true });
  writeFileSync("data/import/staging-report.txt", `${report}\n`, "utf8");
  console.log(report);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
