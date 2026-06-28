/**
 * 【批量录入 · 一键 Pilot】串联第 1–3 步（默认 100 部）
 *
 * 作用：按顺序执行 prepare-staging → resolve-tmdb-ids → sync-movies-to-sql。
 *       适合首次验证整条流水线，再放大全量。
 *
 * npm run ingest:pilot
 * npm run ingest:pilot -- --limit-movies 100 --batch-id pilot-20260628 --publish
 *
 * 前置：check:database、check:tmdb、movies-clean.csv
 */
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { defaultBatchId, parseCliArgs } from "./shared.mts";

const BULK_INGEST_DIR = "scripts/bulk-ingest";

function runStep(scriptName: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const script = `${BULK_INGEST_DIR}/${scriptName}`;
    const child = spawn(process.execPath, ["--import", "tsx", script, ...args], {
      stdio: "inherit",
      env: process.env,
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${script} exited with code ${code}`));
    });
  });
}

async function main() {
  const args = parseCliArgs(process.argv.slice(2));
  const batchId = String(args["batch-id"] ?? defaultBatchId("pilot"));
  const limitMovies = String(args["limit-movies"] ?? 100);
  const publish = args.publish === true;
  const csv = String(args.csv ?? "data/import/movies-clean.csv");
  const sharedArgs = [`--batch-id`, batchId];

  console.log(`Starting pilot ingest batch=${batchId} limit=${limitMovies}`);

  await runStep("prepare-staging.mts", [
    ...sharedArgs,
    "--csv",
    csv,
    "--limit-movies",
    limitMovies,
  ]);

  await runStep("resolve-tmdb-ids.mts", [...sharedArgs, "--delay-ms", "250"]);

  const syncArgs = [...sharedArgs, "--delay-ms", "250"];
  if (publish) syncArgs.push("--publish");
  await runStep("sync-movies-to-sql.mts", syncArgs);

  const summary = [
    "pilot ingest complete",
    `batch_id: ${batchId}`,
    `limit_movies: ${limitMovies}`,
    `publish: ${publish}`,
    "",
    "Reports:",
    "- data/import/staging-report.txt",
    "- data/import/resolve-report.txt",
    "- data/import/sync-report.txt",
    "- data/import/ambiguous-report.csv (if any)",
  ].join("\n");

  mkdirSync("data/import", { recursive: true });
  writeFileSync("data/import/pilot-summary.txt", `${summary}\n`, "utf8");
  console.log(summary);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
