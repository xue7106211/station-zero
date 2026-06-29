/**
 * 【批量录入 · 第 3 步】staging + TMDB → movies / viewing_paths / 海报
 *
 * 作用：读取 resolved 的 staging 行，拉 TMDB 详情 UPSERT 到 movies 表，
 *       写入磁力 viewing_paths（优先于 TMDB 正版路径），下载海报（w500/w1280）并压缩为 WebP，
 *       写入 public/media/；若配置了 SUPABASE_SERVICE_ROLE_KEY 则上传到 Supabase Storage。
 *
 * npm run ingest:sync -- --batch-id pilot-20260628
 * npm run ingest:sync -- --batch-id pilot-20260628 --publish   # 写入 published，上列表页
 *
 * 上游：resolve-tmdb-ids.mts
 * 下游：Next.js /movies 列表与详情页（读 SQL）
 */
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { promisify } from "node:util";
import { and, eq } from "drizzle-orm";
import { importStaging, mediaAssets, movies, viewingPaths } from "../../src/db/schema";
import { toPublicMediaPath } from "../lib/movie-database.mjs";
import { extractPalette } from "../lib/palette.mjs";
import {
  cleanEnv,
  createTmdbClient,
  defaultBatchId,
  mapTmdbDetailsToMovieValues,
  parseCliArgs,
  slugify,
  sleep,
  withDatabase,
} from "./shared.mts";
import {
  buildWebpOutputPath,
  compressBackdropToWebp,
  compressPosterToWebp,
} from "./compress-image.mts";
import {
  publishLocalMediaFile,
  resolveSupabaseStorageConfig,
} from "./storage-media.mts";

const execFileAsync = promisify(execFile);
const posterDir = process.env.MOVIE_POSTER_DIR || "public/media/posters";
const backdropDir = process.env.MOVIE_BACKDROP_DIR || "public/media/backdrops";
const imageBase = process.env.TMDB_IMAGE_BASE_URL || "https://image.tmdb.org/t/p/w500";
const backdropImageBase =
  process.env.TMDB_BACKDROP_IMAGE_BASE_URL || "https://image.tmdb.org/t/p/w1280";
const curlFallback = cleanEnv(process.env.TMDB_CURL_FALLBACK).toLowerCase() !== "false";

type StagingRow = {
  id: string;
  title: string;
  year: string | null;
  platform: string | null;
  type: string | null;
  note: string | null;
  url: string | null;
  tmdbId: number | null;
};

type ViewingPathInput = {
  platform: string;
  type: "订阅" | "租赁/购买" | "实体发行" | "网盘" | "磁力" | "资料来源";
  note: string;
  url?: string;
};

async function main() {
  const args = parseCliArgs(process.argv.slice(2));
  const batchId = String(args["batch-id"] ?? defaultBatchId("pilot"));
  const delayMs = Number(args["delay-ms"] ?? 250);
  const publish = args.publish === true;
  const contentStatus = publish ? "published" : "draft";
  const { tmdbFetch } = createTmdbClient();
  const now = new Date().toISOString();
  const storageConfig = resolveSupabaseStorageConfig();
  if (storageConfig) {
    console.log(`Storage upload enabled: bucket=${storageConfig.bucket}`);
  } else {
    console.warn(
      "Storage upload disabled. Set SUPABASE_SERVICE_ROLE_KEY in .env.local to upload posters to Supabase Storage.",
    );
  }

  mkdirSync(posterDir, { recursive: true });
  mkdirSync(backdropDir, { recursive: true });

  const resolvedRows = await withDatabase(async ({ db }) =>
    db
      .select({
        id: importStaging.id,
        title: importStaging.title,
        year: importStaging.year,
        platform: importStaging.platform,
        type: importStaging.type,
        note: importStaging.note,
        url: importStaging.url,
        tmdbId: importStaging.tmdbId,
      })
      .from(importStaging)
      .where(and(eq(importStaging.batchId, batchId), eq(importStaging.tmdbResolveStatus, "resolved"))),
  );

  const groups = new Map<number, StagingRow[]>();
  for (const row of resolvedRows) {
    if (!row.tmdbId) continue;
    const list = groups.get(row.tmdbId) ?? [];
    list.push(row);
    groups.set(row.tmdbId, list);
  }

  if (!groups.size) {
    console.log(`No resolved rows to sync for batch ${batchId}.`);
    return;
  }

  let synced = 0;
  let failed = 0;
  const failures: string[] = [];

  for (const [index, [tmdbId, rows]] of [...groups.entries()].entries()) {
    try {
      const details = await tmdbFetch(
        `/movie/${tmdbId}?language=zh-CN&append_to_response=credits,alternative_titles`,
      );
      const slug = await pickSlug(details, rows);
      const seedPaths = dedupeViewingPaths(rows);
      const sourcePosterUrl = details.poster_path ? `${imageBase}${details.poster_path}` : undefined;
      const sourceBackdropUrl = details.backdrop_path
        ? `${backdropImageBase}${details.backdrop_path}`
        : undefined;
      const posterFile = sourcePosterUrl
        ? await ensureCompressedMedia(sourcePosterUrl, posterDir, slug, "poster")
        : undefined;
      const backdropFile = sourceBackdropUrl
        ? await ensureCompressedMedia(sourceBackdropUrl, backdropDir, slug, "backdrop")
        : undefined;

      let posterUrl = posterFile ? toPublicMediaPath(posterFile) : undefined;
      let backdropUrl = backdropFile ? toPublicMediaPath(backdropFile) : undefined;
      let posterMediaAsset:
        | { storageKey: string; publicUrl: string; mimeType: string; byteSize: number }
        | undefined;
      let backdropMediaAsset:
        | { storageKey: string; publicUrl: string; mimeType: string; byteSize: number }
        | undefined;

      if (storageConfig) {
        posterMediaAsset = await publishLocalMediaFile(storageConfig, posterFile, "poster", slug);
        backdropMediaAsset = await publishLocalMediaFile(storageConfig, backdropFile, "backdrop", slug);
        posterUrl = posterMediaAsset?.publicUrl ?? posterUrl;
        backdropUrl = backdropMediaAsset?.publicUrl ?? backdropUrl;
      }

      const palette = posterFile ? await safeExtractPalette(posterFile, slug) : undefined;

      const mapped = mapTmdbDetailsToMovieValues(details, {
        slug,
        seedPaths,
        contentStatus,
        now,
        posterUrl,
        backdropUrl,
        sourcePosterUrl,
        sourceBackdropUrl,
        palette,
      });

      await withDatabase(async ({ db }) => {
        const [movie] = await db
          .insert(movies)
          .values({
            slug: mapped.slug,
            tmdbId: mapped.tmdbId,
            title: mapped.title,
            originalTitle: mapped.originalTitle,
            year: mapped.year,
            genres: mapped.genres,
            director: mapped.director,
            cast: mapped.cast,
            runtime: mapped.runtime,
            writers: mapped.writers,
            countries: mapped.countries,
            languages: mapped.languages,
            releaseDate: mapped.releaseDate,
            aka: mapped.aka,
            rating: mapped.rating,
            ratings: mapped.ratings,
            posterTone: mapped.posterTone,
            posterUrl: mapped.posterUrl,
            backdropUrl: mapped.backdropUrl,
            sourcePosterUrl: mapped.sourcePosterUrl,
            sourceBackdropUrl: mapped.sourceBackdropUrl,
            palette: mapped.palette,
            summary: mapped.summary,
            verdict: mapped.verdict,
            bestWay: mapped.bestWay,
            idealScene: mapped.idealScene,
            notFor: mapped.notFor,
            versionSignals: mapped.versionSignals,
            deviceAdvice: mapped.deviceAdvice,
            related: mapped.related,
            contentStatus: mapped.contentStatus,
            sourceProvider: mapped.sourceProvider,
            sourceUpdatedAt: mapped.sourceUpdatedAt,
            imageCachedAt: mapped.imageCachedAt,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: movies.slug,
            set: {
              tmdbId: mapped.tmdbId,
              title: mapped.title,
              originalTitle: mapped.originalTitle,
              year: mapped.year,
              genres: mapped.genres,
              director: mapped.director,
              cast: mapped.cast,
              runtime: mapped.runtime,
              writers: mapped.writers,
              countries: mapped.countries,
              languages: mapped.languages,
              releaseDate: mapped.releaseDate,
              aka: mapped.aka,
              rating: mapped.rating,
              ratings: mapped.ratings,
              posterTone: mapped.posterTone,
              posterUrl: mapped.posterUrl,
              backdropUrl: mapped.backdropUrl,
              sourcePosterUrl: mapped.sourcePosterUrl,
              sourceBackdropUrl: mapped.sourceBackdropUrl,
              palette: mapped.palette,
              summary: mapped.summary,
              versionSignals: mapped.versionSignals,
              deviceAdvice: mapped.deviceAdvice,
              related: mapped.related,
              contentStatus: mapped.contentStatus,
              sourceProvider: mapped.sourceProvider,
              sourceUpdatedAt: mapped.sourceUpdatedAt,
              imageCachedAt: mapped.imageCachedAt,
              updatedAt: now,
            },
          })
          .returning({ id: movies.id, slug: movies.slug });

        await db.delete(viewingPaths).where(eq(viewingPaths.movieId, movie.id));
        await db.delete(mediaAssets).where(eq(mediaAssets.movieId, movie.id));

        if (mapped.viewingPaths.length > 0) {
          await db.insert(viewingPaths).values(
            mapped.viewingPaths.map((path, sortOrder) => ({
              movieId: movie.id,
              platform: path.platform,
              type: path.type,
              note: path.note,
              url: path.url,
              sortOrder,
            })),
          );
        }

        const mediaRows = [
          posterUrl
            ? {
                movieId: movie.id,
                kind: "poster" as const,
                storageKey: posterMediaAsset?.storageKey ?? posterUrl.replace(/^\/media\//, ""),
                publicUrl: posterUrl,
                mimeType: posterMediaAsset?.mimeType ?? (posterUrl.endsWith(".webp") ? "image/webp" : "image/jpeg"),
                byteSize: posterMediaAsset?.byteSize,
                sourceUrl: mapped.sourcePosterUrl,
              }
            : null,
          backdropUrl
            ? {
                movieId: movie.id,
                kind: "backdrop" as const,
                storageKey: backdropMediaAsset?.storageKey ?? backdropUrl.replace(/^\/media\//, ""),
                publicUrl: backdropUrl,
                mimeType:
                  backdropMediaAsset?.mimeType ?? (backdropUrl.endsWith(".webp") ? "image/webp" : "image/jpeg"),
                byteSize: backdropMediaAsset?.byteSize,
                sourceUrl: mapped.sourceBackdropUrl,
              }
            : null,
        ].filter((row) => row !== null);

        if (mediaRows.length > 0) {
          await db.insert(mediaAssets).values(mediaRows);
        }
      });

      synced += 1;
      console.log(`[synced] ${slug} (${details.title ?? details.original_title}) paths=${seedPaths.length}`);
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${tmdbId}: ${message}`);
      console.error(`[failed] tmdbId=${tmdbId}: ${message}`);
    }

    if (index < groups.size - 1 && delayMs > 0) {
      await sleep(delayMs);
    }
  }

  mkdirSync("data/import", { recursive: true });
  const report = [
    "sync-movies-to-sql report",
    `batch_id: ${batchId}`,
    `content_status: ${contentStatus}`,
    `groups: ${groups.size}`,
    `synced: ${synced}`,
    `failed: ${failed}`,
    ...(failures.length ? ["", "failures:", ...failures] : []),
  ].join("\n");
  writeFileSync("data/import/sync-report.txt", `${report}\n`, "utf8");
  console.log(report);
}

function dedupeViewingPaths(rows: StagingRow[]): ViewingPathInput[] {
  const seen = new Set<string>();
  const paths: ViewingPathInput[] = [];

  for (const row of rows) {
    const url = row.url?.trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    paths.push({
      platform: row.platform?.trim() || "磁力",
      type: normalizePathType(row.type),
      note: row.note?.trim() || "批量导入",
      url,
    });
  }

  return paths;
}

function normalizePathType(value: string | null | undefined): ViewingPathInput["type"] {
  const allowed = new Set<ViewingPathInput["type"]>([
    "订阅",
    "租赁/购买",
    "实体发行",
    "网盘",
    "磁力",
    "资料来源",
  ]);
  const normalized = (value ?? "").trim() as ViewingPathInput["type"];
  return allowed.has(normalized) ? normalized : "磁力";
}

async function pickSlug(
  details: { id: number; title?: string; original_title?: string; release_date?: string },
  rows: StagingRow[],
) {
  const base = slugify(details.original_title || details.title || rows[0]?.title || "movie");
  let candidate = base || `movie-${details.id}`;

  const existing = await withDatabase(async ({ db }) => {
    const [byTmdb] = await db
      .select({ slug: movies.slug, tmdbId: movies.tmdbId })
      .from(movies)
      .where(eq(movies.tmdbId, details.id))
      .limit(1);
    if (byTmdb) return byTmdb.slug;

    const [bySlug] = await db.select({ slug: movies.slug }).from(movies).where(eq(movies.slug, candidate)).limit(1);
    if (bySlug) {
      const year = details.release_date?.slice(0, 4);
      candidate = year ? `${base}-${year}` : `${base}-${details.id}`;
    }
    return candidate;
  });

  return existing;
}

async function safeExtractPalette(posterFile: string, slug: string) {
  try {
    return await extractPalette(posterFile);
  } catch (error) {
    console.warn(`Palette extraction failed for ${slug}: ${error instanceof Error ? error.message : error}`);
    return undefined;
  }
}

async function ensureCompressedMedia(
  url: string,
  outputDir: string,
  slug: string,
  kind: "poster" | "backdrop",
) {
  const webpPath = buildWebpOutputPath(outputDir, slug);
  if (existsSync(webpPath)) {
    return webpPath;
  }

  const rawFile = await downloadImage(url, outputDir, slug, kind);
  if (!rawFile) return undefined;

  return kind === "poster"
    ? compressPosterToWebp(rawFile, outputDir, slug)
    : compressBackdropToWebp(rawFile, outputDir, slug);
}

async function downloadImage(url: string, outputDir: string, slug: string, kind: string) {
  const extension = imageExtension(url);
  const filePath = join(outputDir, `${slug}.${extension}`);
  if (existsSync(filePath)) {
    return filePath;
  }

  const response = await fetch(url);
  if (!response.ok) {
    if (!curlFallback) throw new Error(`Image request failed: ${response.status} ${url}`);
    await curlDownload(url, filePath);
    return filePath;
  }

  const { writeFileSync } = await import("node:fs");
  const bytes = Buffer.from(await response.arrayBuffer());
  writeFileSync(filePath, bytes);
  const digest = createHash("sha1").update(bytes).digest("hex").slice(0, 8);
  console.log(`Cached ${kind} ${basename(filePath)} (${Math.round(bytes.length / 1024)}KB, ${digest})`);
  return filePath;
}

async function curlDownload(url: string, filePath: string) {
  await execFileAsync("curl", [
    "--silent",
    "--show-error",
    "--fail",
    "--location",
    "--max-time",
    cleanEnv(process.env.TMDB_CURL_TIMEOUT) || "20",
    "--output",
    filePath,
    url,
  ]);
}

function imageExtension(url: string) {
  const extension = extname(new URL(url).pathname).replace(".", "").toLowerCase();
  return ["jpg", "jpeg", "png", "webp", "avif"].includes(extension) ? extension : "jpg";
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
