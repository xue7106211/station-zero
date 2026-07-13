/**
 * 【批量录入 · 第 2c 步】failed 重试 → 回写 import_staging.tmdb_id
 *
 * 作用：对 resolve 阶段 TMDB 无匹配的 failed 分组，用 title_zh / 去 The 前缀 /
 *       年份 ±1 容差重新搜索并打分。
 *
 * npm run ingest:resolve-failed -- --batch-id pilot-20260628
 * npm run ingest:resolve-failed -- --apply-manual data/import/failed-resolutions.csv
 *
 * 上游：resolve-tmdb-ids.mts
 * 下游：ingest:sync
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { and, eq } from "drizzle-orm";
import { importStaging } from "../../src/db/schema";
import type { Database } from "../../src/db/index";
import {
  buildTitleContextMap,
  createTmdbClient,
  defaultBatchId,
  mergeCandidates,
  movieGroupKey,
  parseCliArgs,
  parseCsvFile,
  parseCsvLine,
  pickBestCandidate,
  pickStagingSearchTitle,
  searchTmdbMovieCandidates,
  sleep,
  stripLeadingArticle,
  stagingGroupWhere,
  stagingMovieGroupKey,
  type TitleContext,
  type TmdbSearchCandidate,
  withDatabase,
} from "./shared.mts";

const DEFAULT_CSV = "data/import/movies-clean.csv";

type FailedGroup = {
  titleZh: string;
  year: string;
  searchTitle: string;
};

function escapeCsv(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

async function loadFailedGroups(batchId: string) {
  return withDatabase(async ({ db }) => {
    const rows = await db
      .select({
        title: importStaging.title,
        titleZh: importStaging.titleZh,
        year: importStaging.year,
      })
      .from(importStaging)
      .where(and(eq(importStaging.batchId, batchId), eq(importStaging.tmdbResolveStatus, "failed")));

    const groups = new Map<
      string,
      { titleZh: string; year: string; rows: Array<{ title: string; titleZh: string | null }> }
    >();
    for (const row of rows) {
      if (!row.year) continue;
      const key = stagingMovieGroupKey(row);
      const titleZh = row.titleZh?.trim() || row.title.trim();
      const existing = groups.get(key);
      if (existing) {
        existing.rows.push({ title: row.title, titleZh: row.titleZh });
        continue;
      }
      groups.set(key, {
        titleZh,
        year: row.year,
        rows: [{ title: row.title, titleZh: row.titleZh }],
      });
    }

    return [...groups.values()].map((group) => ({
      titleZh: group.titleZh,
      year: group.year,
      searchTitle: pickStagingSearchTitle(group.rows),
    }));
  });
}

async function applyResolution(
  db: Database,
  batchId: string,
  group: FailedGroup,
  tmdbId: number,
  dryRun: boolean,
) {
  if (dryRun) {
    console.log(`[dry-run] ${group.titleZh} (${group.year}) -> ${tmdbId}`);
    return;
  }

  await db
    .update(importStaging)
    .set({
      tmdbId,
      tmdbResolveStatus: "resolved",
      candidatesJson: null,
    })
    .where(stagingGroupWhere(batchId, group.titleZh, group.year));
  console.log(`[resolved] ${group.titleZh} (${group.year}) -> ${tmdbId}`);
}

function parseManualCsv(path: string) {
  const content = readFileSync(path, "utf8").replace(/^\uFEFF/, "");
  const lines = content.split(/\r?\n/).filter((line: string) => line.trim());
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line: string) => {
    const values = parseCsvLine(line);
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = values[index] ?? "";
    });
    return record;
  });
}

async function applyManualFile(batchId: string, manualPath: string, dryRun: boolean) {
  const rows = parseManualCsv(manualPath);
  let applied = 0;

  await withDatabase(async ({ db }) => {
    for (const row of rows) {
      const titleZh = row.title_zh?.trim() || row.title?.trim();
      const year = row.year?.trim();
      const tmdbId = Number(row.tmdb_id || row.recommended_tmdb_id);
      if (!titleZh || !year || !Number.isFinite(tmdbId)) continue;

      await applyResolution(
        db,
        batchId,
        { titleZh, year, searchTitle: row.title?.trim() || titleZh },
        tmdbId,
        dryRun,
      );
      applied += 1;
    }
  });

  console.log(`Applied ${applied} manual resolution(s) from ${manualPath}`);
}

async function collectCandidates(
  tmdbFetch: (path: string) => Promise<{ results?: TmdbSearchCandidate[] }>,
  group: FailedGroup,
  context: TitleContext | undefined,
  delayMs: number,
) {
  const queries = [
    context?.titleZh,
    context?.originalTitle,
    stripLeadingArticle(group.searchTitle),
    group.searchTitle,
  ].filter((value, index, list): value is string => Boolean(value) && list.indexOf(value) === index);

  let candidates: TmdbSearchCandidate[] = [];
  for (const query of queries) {
    const found = await searchTmdbMovieCandidates(tmdbFetch, query, group.year, { yearTolerance: 1 });
    candidates = mergeCandidates(candidates, found);
    if (delayMs > 0) await sleep(delayMs);
  }

  return candidates;
}

async function main() {
  const args = parseCliArgs(process.argv.slice(2));
  const batchId = String(args["batch-id"] ?? defaultBatchId("pilot"));
  const csvPath = String(args.csv ?? DEFAULT_CSV);
  const delayMs = Number(args["delay-ms"] ?? 250);
  const dryRun = args["dry-run"] === true;
  const manualPath = typeof args["apply-manual"] === "string" ? String(args["apply-manual"]) : "";

  if (manualPath) {
    await applyManualFile(batchId, manualPath, dryRun);
    return;
  }

  const contextMap = buildTitleContextMap(parseCsvFile(csvPath));
  const groups = await loadFailedGroups(batchId);

  if (!groups.length) {
    console.log(`No failed groups for batch ${batchId}.`);
    return;
  }

  const { tmdbFetch } = createTmdbClient();
  let autoResolved = 0;
  let stillManual = 0;
  const manualRows: string[] = [
    "title,year,title_zh,recommended_tmdb_id,recommended_title,recommended_original_title,top_score,second_score,reason",
  ];

  await withDatabase(async ({ db }) => {
    for (const [index, group] of groups.entries()) {
      const context = contextMap.get(movieGroupKey(group.titleZh, group.year));
      const candidates = await collectCandidates(tmdbFetch, group, context, index < groups.length - 1 ? delayMs : 0);

      const outcomes = [pickBestCandidate(candidates, context, group.searchTitle, { minScore: 50, minGap: 10 })];
      if (context?.titleZh && context.titleZh !== group.searchTitle) {
        outcomes.push(
          pickBestCandidate(candidates, context, context.titleZh, { minScore: 50, minGap: 10 }),
        );
      }

      const resolvedOutcome = outcomes
        .filter((outcome) => outcome.decision === "resolved" && outcome.pick)
        .sort((left, right) => (right.pick?.score ?? 0) - (left.pick?.score ?? 0))[0];

      const outcome =
        resolvedOutcome ??
        outcomes.sort((left, right) => (right.scored[0]?.score ?? 0) - (left.scored[0]?.score ?? 0))[0];
      const top = outcome.scored[0];
      const second = outcome.scored[1];

      if (resolvedOutcome?.pick) {
        await applyResolution(db, batchId, group, resolvedOutcome.pick.candidate.id, dryRun);
        autoResolved += 1;
        continue;
      }

      stillManual += 1;
      manualRows.push(
        [
          group.searchTitle,
          group.year,
          group.titleZh,
          top?.candidate.id ?? "",
          top?.candidate.title ?? "",
          top?.candidate.original_title ?? "",
          top?.score ?? "",
          second?.score ?? "",
          top?.reasons.join("|") ?? "",
        ]
          .map(escapeCsv)
          .join(","),
      );
      console.log(`[manual] ${group.titleZh} (${group.year}) top=${top?.candidate.id ?? "none"} score=${top?.score ?? 0}`);
    }
  });

  mkdirSync("data/import", { recursive: true });
  if (manualRows.length > 1) {
    writeFileSync("data/import/failed-manual.csv", `${manualRows.join("\n")}\n`, "utf8");
  }

  const report = [
    "resolve-failed report",
    `batch_id: ${batchId}`,
    `groups: ${groups.length}`,
    `auto_resolved: ${autoResolved}`,
    `still_manual: ${stillManual}`,
    dryRun ? "mode: dry-run" : "",
  ]
    .filter(Boolean)
    .join("\n");

  writeFileSync("data/import/resolve-failed-report.txt", `${report}\n`, "utf8");
  console.log(report);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
