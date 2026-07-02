/**
 * 【迁移 · 一次性】data/movies.json → Supabase Postgres
 *
 * 作用：把文件型 MVP 库 upsert 到 movies / viewing_paths / media_assets 表。
 * 批量万级录入请走 bulk-ingest 流水线，不要拿本脚本灌 CSV。
 *
 * npm run db:migrate:json
 *
 * 前置：DATABASE_URL、npm run db:migrate
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { closeDatabaseClient, createDatabaseClient } from "../../src/db/index";
import { importStaging, mediaAssets, movies, viewingPaths } from "../../src/db/schema";

type MovieJsonRecord = {
  slug: string;
  tmdbId?: number;
  imdbId?: string;
  title: string;
  originalTitle: string;
  year: string;
  genres: string[];
  director: string;
  cast: string[];
  runtime: string;
  writers?: string[];
  countries?: string[];
  languages?: string[];
  releaseDate?: string;
  aka?: string[];
  collection?: {
    tmdbId: number;
    name: string;
    posterPath?: string;
    backdropPath?: string;
  };
  keywords?: string[];
  rating: string;
  ratings?: {
    douban?: string;
    imdb?: string;
    rottenTomatoes?: string;
  };
  posterTone: string;
  posterUrl?: string;
  backdropUrl?: string;
  sourcePosterUrl?: string;
  sourceBackdropUrl?: string;
  palette?: Record<string, string | undefined>;
  summary: string;
  verdict: string;
  bestWay: string;
  idealScene: string;
  notFor: string;
  viewingPaths: Array<{
    platform: string;
    type: "订阅" | "租赁/购买" | "实体发行" | "网盘" | "磁力" | "资料来源";
    note: string;
    url?: string;
  }>;
  versionSignals: Array<{ label: string; value: string; verdict: string }>;
  deviceAdvice: string[];
  related: string[];
  contentStatus?: "draft" | "review" | "published";
  sourceProvider?: "tmdb" | "manual" | "other";
  sourceUpdatedAt?: string;
  imageCachedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

const database = createDatabaseClient();
if (!database) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const { db } = database;
const movieDatabasePath = join(process.cwd(), "data", "movies.json");

async function main() {
  const raw = await readFile(movieDatabasePath, "utf8");
  const parsed = JSON.parse(raw) as { movies?: MovieJsonRecord[] };
  const records = Array.isArray(parsed.movies) ? parsed.movies : [];

  if (records.length === 0) {
    console.log("No movies found in data/movies.json.");
    return;
  }

  let insertedMovies = 0;
  let insertedPaths = 0;

  for (const record of records) {
    const now = record.updatedAt ?? new Date().toISOString();
    const [movie] = await db
      .insert(movies)
      .values({
        slug: record.slug,
        tmdbId: record.tmdbId,
        imdbId: record.imdbId,
        title: record.title,
        originalTitle: record.originalTitle,
        year: record.year,
        genres: record.genres,
        director: record.director,
        cast: record.cast,
        runtime: record.runtime,
        writers: record.writers,
        countries: record.countries,
        languages: record.languages,
        releaseDate: record.releaseDate,
        aka: record.aka,
        collection: record.collection,
        keywords: record.keywords ?? [],
        rating: record.rating,
        ratings: record.ratings,
        posterTone: record.posterTone,
        posterUrl: record.posterUrl,
        backdropUrl: record.backdropUrl,
        sourcePosterUrl: record.sourcePosterUrl,
        sourceBackdropUrl: record.sourceBackdropUrl,
        palette: record.palette,
        summary: record.summary,
        verdict: record.verdict,
        bestWay: record.bestWay,
        idealScene: record.idealScene,
        notFor: record.notFor,
        versionSignals: record.versionSignals,
        deviceAdvice: record.deviceAdvice,
        related: record.related,
        contentStatus: record.contentStatus ?? "draft",
        sourceProvider: record.sourceProvider ?? "manual",
        sourceUpdatedAt: record.sourceUpdatedAt ?? now,
        imageCachedAt: record.imageCachedAt,
        createdAt: record.createdAt ?? now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: movies.slug,
        set: {
          tmdbId: record.tmdbId,
          imdbId: record.imdbId,
          title: record.title,
          originalTitle: record.originalTitle,
          year: record.year,
          genres: record.genres,
          director: record.director,
          cast: record.cast,
          runtime: record.runtime,
          writers: record.writers,
          countries: record.countries,
          languages: record.languages,
          releaseDate: record.releaseDate,
          aka: record.aka,
          collection: record.collection,
          keywords: record.keywords ?? [],
          rating: record.rating,
          ratings: record.ratings,
          posterTone: record.posterTone,
          posterUrl: record.posterUrl,
          backdropUrl: record.backdropUrl,
          sourcePosterUrl: record.sourcePosterUrl,
          sourceBackdropUrl: record.sourceBackdropUrl,
          palette: record.palette,
          summary: record.summary,
          verdict: record.verdict,
          bestWay: record.bestWay,
          idealScene: record.idealScene,
          notFor: record.notFor,
          versionSignals: record.versionSignals,
          deviceAdvice: record.deviceAdvice,
          related: record.related,
          contentStatus: record.contentStatus ?? "draft",
          sourceProvider: record.sourceProvider ?? "manual",
          sourceUpdatedAt: record.sourceUpdatedAt ?? now,
          imageCachedAt: record.imageCachedAt,
          updatedAt: now,
        },
      })
      .returning({ id: movies.id, slug: movies.slug });

    insertedMovies += 1;

    await db.delete(viewingPaths).where(eq(viewingPaths.movieId, movie.id));
    await db.delete(mediaAssets).where(eq(mediaAssets.movieId, movie.id));

    if (record.viewingPaths.length > 0) {
      await db.insert(viewingPaths).values(
        record.viewingPaths.map((path, index) => ({
          movieId: movie.id,
          platform: path.platform,
          type: path.type,
          note: path.note,
          url: path.url,
          sortOrder: index,
        })),
      );
      insertedPaths += record.viewingPaths.length;
    }

    const mediaRows = [
      record.posterUrl
        ? {
            movieId: movie.id,
            kind: "poster" as const,
            storageKey: record.posterUrl.replace(/^\//, ""),
            publicUrl: record.posterUrl,
            mimeType: record.posterUrl.endsWith(".webp") ? "image/webp" : "image/jpeg",
            sourceUrl: record.sourcePosterUrl,
          }
        : null,
      record.backdropUrl
        ? {
            movieId: movie.id,
            kind: "backdrop" as const,
            storageKey: record.backdropUrl.replace(/^\//, ""),
            publicUrl: record.backdropUrl,
            mimeType: record.backdropUrl.endsWith(".webp") ? "image/webp" : "image/jpeg",
            sourceUrl: record.sourceBackdropUrl,
          }
        : null,
    ].filter((row) => row !== null);

    if (mediaRows.length > 0) {
      await db.insert(mediaAssets).values(mediaRows);
    }
  }

  const stagingCount = await db.select({ id: importStaging.id }).from(importStaging).limit(1);
  console.log(`Migrated ${insertedMovies} movies and ${insertedPaths} viewing paths from data/movies.json.`);
  if (stagingCount.length === 0) {
    console.log("import_staging is empty (expected until bulk ingest starts).");
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await closeDatabaseClient();
  });
