/**
 * 【批量录入 · 第 2 步】TMDB 消歧 → 回写 import_staging.tmdb_id
 *
 * 作用：对 staging 中 pending 的 (title, year) 分组，带年份搜索 TMDB。
 *       唯一匹配 → resolved；多候选 → ambiguous；无结果 → failed。
 *
 * npm run ingest:resolve -- --batch-id pilot-20260628
 *
 * 上游：prepare-staging.mts
 * 下游：sync-movies-to-sql.mts（仅处理 resolved）
 * 产出：data/import/ambiguous-report.csv（需人工复核 ambiguous）
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { and, eq } from "drizzle-orm";
import { importStaging } from "../../src/db/schema";
import {
  createTmdbClient,
  defaultBatchId,
  movieGroupKey,
  parseCliArgs,
  sleep,
  withDatabase,
} from "./shared.mts";

type ResolveOutcome =
  | { status: "resolved"; tmdbId: number }
  | { status: "ambiguous"; candidates: Array<Record<string, unknown>> }
  | { status: "failed" };

async function resolveTitleYear(
  tmdbFetch: (path: string) => Promise<{ results?: Array<{ id: number; release_date?: string; title?: string; original_title?: string }> }>,
  title: string,
  year: string,
): Promise<ResolveOutcome> {
  const primary = await tmdbFetch(
    `/search/movie?query=${encodeURIComponent(title)}&year=${encodeURIComponent(year)}&language=zh-CN&page=1`,
  );
  let results = (primary.results ?? []).filter((item: { release_date?: string }) =>
    item.release_date?.startsWith(year),
  );

  if (results.length === 0) {
    const fallback = await tmdbFetch(
      `/search/movie?query=${encodeURIComponent(title)}&language=zh-CN&page=1`,
    );
    results = (fallback.results ?? []).filter((item: { release_date?: string }) =>
      item.release_date?.startsWith(year),
    );
  }

  if (results.length === 1) {
    return { status: "resolved", tmdbId: results[0].id };
  }
  if (results.length > 1) {
    return {
      status: "ambiguous",
      candidates: results.slice(0, 5).map((item: Record<string, unknown>) => ({
        id: item.id,
        title: item.title,
        original_title: item.original_title,
        release_date: item.release_date,
      })),
    };
  }
  return { status: "failed" };
}

async function main() {
  const args = parseCliArgs(process.argv.slice(2));
  const batchId = String(args["batch-id"] ?? defaultBatchId("pilot"));
  const delayMs = Number(args["delay-ms"] ?? 250);
  const { tmdbFetch } = createTmdbClient();

  const pendingGroups = await withDatabase(async ({ db }) => {
    const rows = await db
      .select({
        title: importStaging.title,
        year: importStaging.year,
      })
      .from(importStaging)
      .where(and(eq(importStaging.batchId, batchId), eq(importStaging.tmdbResolveStatus, "pending")));

    const groups = new Map<string, { title: string; year: string }>();
    for (const row of rows) {
      if (!row.year) continue;
      const key = movieGroupKey(row.title, row.year);
      if (!groups.has(key)) {
        groups.set(key, { title: row.title, year: row.year });
      }
    }
    return [...groups.values()];
  });

  if (!pendingGroups.length) {
    console.log(`No pending groups for batch ${batchId}.`);
    return;
  }

  let resolved = 0;
  let ambiguous = 0;
  let failed = 0;
  const ambiguousRows: string[] = [
    "title,year,tmdb_id,candidate_title,candidate_original_title,candidate_release_date",
  ];

  for (const [index, group] of pendingGroups.entries()) {
    const outcome = await resolveTitleYear(tmdbFetch, group.title, group.year);

    await withDatabase(async ({ db }) => {
      if (outcome.status === "resolved") {
        await db
          .update(importStaging)
          .set({
            tmdbId: outcome.tmdbId,
            tmdbResolveStatus: "resolved",
            candidatesJson: null,
          })
          .where(
            and(
              eq(importStaging.batchId, batchId),
              eq(importStaging.title, group.title),
              eq(importStaging.year, group.year),
            ),
          );
        resolved += 1;
        console.log(`[resolved] ${group.title} (${group.year}) -> ${outcome.tmdbId}`);
        return;
      }

      if (outcome.status === "ambiguous") {
        await db
          .update(importStaging)
          .set({
            tmdbResolveStatus: "ambiguous",
            candidatesJson: outcome.candidates,
          })
          .where(
            and(
              eq(importStaging.batchId, batchId),
              eq(importStaging.title, group.title),
              eq(importStaging.year, group.year),
            ),
          );
        ambiguous += 1;
        for (const candidate of outcome.candidates) {
          ambiguousRows.push(
            [
              group.title,
              group.year,
              candidate.id,
              candidate.title,
              candidate.original_title,
              candidate.release_date,
            ]
              .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
              .join(","),
          );
        }
        console.log(`[ambiguous] ${group.title} (${group.year})`);
        return;
      }

      await db
        .update(importStaging)
        .set({
          tmdbResolveStatus: "failed",
          candidatesJson: null,
        })
        .where(
          and(
            eq(importStaging.batchId, batchId),
            eq(importStaging.title, group.title),
            eq(importStaging.year, group.year),
          ),
        );
      failed += 1;
      console.log(`[failed] ${group.title} (${group.year})`);
    });

    if (index < pendingGroups.length - 1 && delayMs > 0) {
      await sleep(delayMs);
    }
  }

  mkdirSync("data/import", { recursive: true });
  if (ambiguousRows.length > 1) {
    writeFileSync("data/import/ambiguous-report.csv", `${ambiguousRows.join("\n")}\n`, "utf8");
  }

  const report = [
    "resolve-tmdb-ids report",
    `batch_id: ${batchId}`,
    `groups_processed: ${pendingGroups.length}`,
    `resolved: ${resolved}`,
    `ambiguous: ${ambiguous}`,
    `failed: ${failed}`,
  ].join("\n");
  writeFileSync("data/import/resolve-report.txt", `${report}\n`, "utf8");
  console.log(report);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
