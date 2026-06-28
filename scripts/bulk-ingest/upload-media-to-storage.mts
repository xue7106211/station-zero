/**
 * 【批量录入 · 第 3b 步】本地海报/背景 → Supabase Storage + 回写 movies / media_assets
 *
 * 用于补传 bulk-ingest 已下载到 public/media/ 但未上传 Storage 的条目，
 * 或修复 poster_url 被写成本地路径 / Windows 反斜杠的记录。
 *
 * npm run ingest:upload-media
 * npm run ingest:upload-media -- --slug the-shrouds
 * npm run ingest:upload-media -- --dry-run
 *
 * 需要 .env.local：
 *   DATABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 * 可选：SUPABASE_URL、SUPABASE_MEDIA_BUCKET（默认 media）
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { eq, sql } from "drizzle-orm";
import { mediaAssets, movies } from "../../src/db/schema";
import { parseCliArgs, withDatabase } from "./shared.mts";
import {
  isSupabaseStorageConfigured,
  localPathFromMediaUrl,
  publishLocalMediaFile,
  resolveSupabaseStorageConfig,
} from "./storage-media.mts";

type MovieRow = {
  id: string;
  slug: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  sourcePosterUrl: string | null;
  sourceBackdropUrl: string | null;
};

function needsUpload(url: string | null | undefined) {
  if (!url) return false;
  const normalized = url.replace(/\\/g, "/");
  return !normalized.includes("supabase.co/storage/v1/object/public/");
}

function resolveLocalMediaFile(slug: string, kind: "poster" | "backdrop", currentUrl: string | null) {
  const fromUrl = localPathFromMediaUrl(currentUrl, kind);
  if (fromUrl && existsSync(fromUrl)) return fromUrl;

  const folder = kind === "poster" ? "posters" : "backdrops";
  for (const extension of ["jpg", "jpeg", "webp", "png"]) {
    const candidate = `public/media/${folder}/${slug}.${extension}`;
    if (existsSync(candidate)) return candidate;
  }

  return fromUrl;
}

async function loadTargets(slugFilter: string) {
  return withDatabase(async ({ db }) => {
    const rows = await db
      .select({
        id: movies.id,
        slug: movies.slug,
        posterUrl: movies.posterUrl,
        backdropUrl: movies.backdropUrl,
        sourcePosterUrl: movies.sourcePosterUrl,
        sourceBackdropUrl: movies.sourceBackdropUrl,
      })
      .from(movies)
      .where(
        slugFilter
          ? eq(movies.slug, slugFilter)
          : sql`(
              ${movies.posterUrl} is not null and ${movies.posterUrl} not like '%supabase.co/storage/v1/object/public/%'
            ) or (
              ${movies.backdropUrl} is not null and ${movies.backdropUrl} not like '%supabase.co/storage/v1/object/public/%'
            )`,
      );

    return rows as MovieRow[];
  });
}

async function updateMovieMedia(
  movie: MovieRow,
  poster: Awaited<ReturnType<typeof publishLocalMediaFile>> | undefined,
  backdrop: Awaited<ReturnType<typeof publishLocalMediaFile>> | undefined,
  dryRun: boolean,
) {
  if (!poster && !backdrop) return false;

  if (dryRun) {
    console.log(`[dry-run] ${movie.slug} poster=${poster?.publicUrl ?? "-"} backdrop=${backdrop?.publicUrl ?? "-"}`);
    return true;
  }

  const now = new Date().toISOString();

  await withDatabase(async ({ db }) => {
    await db
      .update(movies)
      .set({
        posterUrl: poster?.publicUrl ?? movie.posterUrl ?? undefined,
        backdropUrl: backdrop?.publicUrl ?? movie.backdropUrl ?? undefined,
        imageCachedAt: now,
        updatedAt: now,
      })
      .where(eq(movies.id, movie.id));

    await db.delete(mediaAssets).where(eq(mediaAssets.movieId, movie.id));

    const mediaRows = [
      poster
        ? {
            movieId: movie.id,
            kind: "poster" as const,
            storageKey: poster.storageKey,
            publicUrl: poster.publicUrl,
            mimeType: poster.mimeType,
            byteSize: poster.byteSize,
            sourceUrl: movie.sourcePosterUrl ?? undefined,
          }
        : null,
      backdrop
        ? {
            movieId: movie.id,
            kind: "backdrop" as const,
            storageKey: backdrop.storageKey,
            publicUrl: backdrop.publicUrl,
            mimeType: backdrop.mimeType,
            byteSize: backdrop.byteSize,
            sourceUrl: movie.sourceBackdropUrl ?? undefined,
          }
        : null,
    ].filter((row) => row !== null);

    if (mediaRows.length > 0) {
      await db.insert(mediaAssets).values(mediaRows);
    }
  });

  console.log(`[updated] ${movie.slug}`);
  return true;
}

async function main() {
  const args = parseCliArgs(process.argv.slice(2));
  const slugFilter = typeof args.slug === "string" ? String(args.slug).trim() : "";
  const dryRun = args["dry-run"] === true;

  if (!isSupabaseStorageConfigured()) {
    throw new Error(
      "Supabase Storage is not configured. Add SUPABASE_SERVICE_ROLE_KEY to .env.local (Project Settings → API → service_role). SUPABASE_URL is optional if DATABASE_URL is set.",
    );
  }

  const config = resolveSupabaseStorageConfig();
  if (!config) {
    throw new Error("Failed to resolve Supabase Storage config.");
  }

  const targets = await loadTargets(slugFilter);
  if (!targets.length) {
    console.log(slugFilter ? `No movie found for slug ${slugFilter}.` : "No movies need Storage upload.");
    return;
  }

  let uploaded = 0;
  let skipped = 0;
  let failed = 0;
  const failures: string[] = [];

  for (const movie of targets) {
    try {
      let posterUpload;
      let backdropUpload;

      if (needsUpload(movie.posterUrl)) {
        const localPoster = resolveLocalMediaFile(movie.slug, "poster", movie.posterUrl);
        if (localPoster && existsSync(localPoster)) {
          posterUpload = await publishLocalMediaFile(config, localPoster, "poster", movie.slug);
        } else {
          console.warn(`[skip] ${movie.slug} poster file missing: ${localPoster ?? "unknown"}`);
        }
      }

      if (needsUpload(movie.backdropUrl)) {
        const localBackdrop = resolveLocalMediaFile(movie.slug, "backdrop", movie.backdropUrl);
        if (localBackdrop && existsSync(localBackdrop)) {
          backdropUpload = await publishLocalMediaFile(config, localBackdrop, "backdrop", movie.slug);
        } else {
          console.warn(`[skip] ${movie.slug} backdrop file missing: ${localBackdrop ?? "unknown"}`);
        }
      }

      const changed = await updateMovieMedia(movie, posterUpload, backdropUpload, dryRun);
      if (changed) uploaded += 1;
      else skipped += 1;
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${movie.slug}: ${message}`);
      console.error(`[failed] ${movie.slug}: ${message}`);
    }
  }

  mkdirSync("data/import", { recursive: true });
  const report = [
    "upload-media-to-storage report",
    `targets: ${targets.length}`,
    `uploaded: ${uploaded}`,
    `skipped: ${skipped}`,
    `failed: ${failed}`,
    dryRun ? "mode: dry-run" : "",
    ...(failures.length ? ["", "failures:", ...failures] : []),
  ]
    .filter(Boolean)
    .join("\n");

  writeFileSync("data/import/upload-media-report.txt", `${report}\n`, "utf8");
  console.log(report);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
