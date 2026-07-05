/**
 * 【批量录入 · 发布】将已 sync 的批次影片设为 published（不拉 TMDB、不重传海报）
 *
 * 通过 `import_staging.batch_id` 关联本批 resolved 的 `tmdb_id`，
 * 仅 UPDATE `movies.content_status`。
 *
 * npm run ingest:publish -- --batch-id batch-20260705-001
 * npm run ingest:publish -- --batch-id batch-20260705-001 --dry-run
 *
 * 上游：sync-movies-to-sql.mts（影片须已入库）
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { importStaging, movies } from "../../src/db/schema";
import { defaultBatchId, parseCliArgs, withDatabase } from "./shared.mts";

async function main() {
  const args = parseCliArgs(process.argv.slice(2));
  const batchId = String(args["batch-id"] ?? defaultBatchId("pilot"));
  const dryRun = args["dry-run"] === true;
  const now = new Date().toISOString();

  const report = await withDatabase(async ({ db }) => {
    const stagingRows = await db
      .selectDistinct({ tmdbId: importStaging.tmdbId })
      .from(importStaging)
      .where(
        and(
          eq(importStaging.batchId, batchId),
          eq(importStaging.tmdbResolveStatus, "resolved"),
          isNotNull(importStaging.tmdbId),
        ),
      );

    const tmdbIds = stagingRows
      .map((row) => row.tmdbId)
      .filter((id): id is number => typeof id === "number" && Number.isFinite(id));

    if (!tmdbIds.length) {
      return {
        batchId,
        stagingResolvedTmdbIds: 0,
        matchedInMovies: 0,
        published: 0,
        alreadyPublished: 0,
        missingInMovies: 0,
        dryRun,
        missingTmdbIds: [] as number[],
      };
    }

    const movieRows = await db
      .select({
        id: movies.id,
        slug: movies.slug,
        tmdbId: movies.tmdbId,
        contentStatus: movies.contentStatus,
      })
      .from(movies)
      .where(inArray(movies.tmdbId, tmdbIds));

    const matchedTmdbIds = new Set(
      movieRows.map((row) => row.tmdbId).filter((id): id is number => id != null),
    );
    const missingTmdbIds = tmdbIds.filter((id) => !matchedTmdbIds.has(id));
    const toPublish = movieRows.filter((row) => row.contentStatus !== "published");
    const alreadyPublished = movieRows.length - toPublish.length;

    if (!dryRun && toPublish.length > 0) {
      await db
        .update(movies)
        .set({ contentStatus: "published", updatedAt: now })
        .where(
          inArray(
            movies.id,
            toPublish.map((row) => row.id),
          ),
        );
    }

    if (dryRun && toPublish.length > 0) {
      for (const row of toPublish) {
        console.log(`[dry-run] ${row.slug} (tmdb=${row.tmdbId}) -> published`);
      }
    } else if (toPublish.length > 0) {
      for (const row of toPublish) {
        console.log(`[published] ${row.slug} (tmdb=${row.tmdbId})`);
      }
    }

    if (missingTmdbIds.length > 0) {
      console.warn(
        `Warning: ${missingTmdbIds.length} resolved staging tmdb_id(s) not found in movies. Run ingest:sync first.`,
      );
    }

    return {
      batchId,
      stagingResolvedTmdbIds: tmdbIds.length,
      matchedInMovies: movieRows.length,
      published: toPublish.length,
      alreadyPublished,
      missingInMovies: missingTmdbIds.length,
      dryRun,
      missingTmdbIds,
    };
  });

  const lines = [
    "publish-batch report",
    `batch_id: ${report.batchId}`,
    `staging_resolved_tmdb_ids: ${report.stagingResolvedTmdbIds}`,
    `matched_in_movies: ${report.matchedInMovies}`,
    `newly_published: ${report.published}`,
    `already_published: ${report.alreadyPublished}`,
    `missing_in_movies: ${report.missingInMovies}`,
    ...(report.dryRun ? ["mode: dry-run"] : []),
    ...(report.missingTmdbIds.length
      ? ["", "missing_tmdb_ids:", ...report.missingTmdbIds.map(String)]
      : []),
  ];

  mkdirSync("data/import", { recursive: true });
  writeFileSync("data/import/publish-report.txt", `${lines.join("\n")}\n`, "utf8");
  console.log(lines.join("\n"));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
