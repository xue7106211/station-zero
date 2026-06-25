import { relations, sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const contentStatusEnum = pgEnum("content_status", ["draft", "review", "published"]);
export const sourceProviderEnum = pgEnum("source_provider", ["tmdb", "manual", "other"]);
export const viewingPathTypeEnum = pgEnum("viewing_path_type", [
  "订阅",
  "租赁/购买",
  "实体发行",
  "网盘",
  "磁力",
  "资料来源",
]);
export const viewingPathVisibilityEnum = pgEnum("viewing_path_visibility", ["public", "hidden"]);
export const mediaAssetKindEnum = pgEnum("media_asset_kind", ["poster", "backdrop"]);
export const tmdbResolveStatusEnum = pgEnum("tmdb_resolve_status", [
  "pending",
  "resolved",
  "ambiguous",
  "failed",
]);

export const movies = pgTable(
  "movies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull().unique(),
    tmdbId: integer("tmdb_id"),
    title: text("title").notNull(),
    originalTitle: text("original_title").notNull(),
    year: text("year").notNull(),
    genres: text("genres").array().notNull().default(sql`'{}'::text[]`),
    director: text("director").notNull(),
    cast: text("cast").array().notNull().default(sql`'{}'::text[]`),
    runtime: text("runtime").notNull(),
    writers: text("writers").array(),
    countries: text("countries").array(),
    languages: text("languages").array(),
    releaseDate: text("release_date"),
    aka: text("aka").array(),
    rating: text("rating").notNull(),
    ratings: jsonb("ratings").$type<{
      douban?: string;
      imdb?: string;
      rottenTomatoes?: string;
    }>(),
    posterTone: text("poster_tone").notNull(),
    posterUrl: text("poster_url"),
    backdropUrl: text("backdrop_url"),
    sourcePosterUrl: text("source_poster_url"),
    sourceBackdropUrl: text("source_backdrop_url"),
    palette: jsonb("palette").$type<{
      vibrant?: string;
      darkVibrant?: string;
      lightVibrant?: string;
      muted?: string;
      darkMuted?: string;
      lightMuted?: string;
    }>(),
    summary: text("summary").notNull(),
    verdict: text("verdict").notNull(),
    bestWay: text("best_way").notNull(),
    idealScene: text("ideal_scene").notNull(),
    notFor: text("not_for").notNull(),
    versionSignals: jsonb("version_signals")
      .$type<Array<{ label: string; value: string; verdict: string }>>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    deviceAdvice: text("device_advice").array().notNull().default(sql`'{}'::text[]`),
    related: text("related").array().notNull().default(sql`'{}'::text[]`),
    contentStatus: contentStatusEnum("content_status").notNull().default("draft"),
    sourceProvider: sourceProviderEnum("source_provider").notNull().default("manual"),
    sourceUpdatedAt: timestamp("source_updated_at", { withTimezone: true, mode: "string" }).notNull(),
    imageCachedAt: timestamp("image_cached_at", { withTimezone: true, mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (table) => [
    index("movies_content_status_updated_at_idx").on(table.contentStatus, table.updatedAt),
    index("movies_tmdb_id_idx").on(table.tmdbId),
  ],
);

export const viewingPaths = pgTable(
  "viewing_paths",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    movieId: uuid("movie_id")
      .notNull()
      .references(() => movies.id, { onDelete: "cascade" }),
    platform: text("platform").notNull(),
    type: viewingPathTypeEnum("type").notNull(),
    note: text("note").notNull(),
    url: text("url"),
    visibility: viewingPathVisibilityEnum("visibility").notNull().default("public"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (table) => [index("viewing_paths_movie_id_sort_order_idx").on(table.movieId, table.sortOrder)],
);

export const mediaAssets = pgTable(
  "media_assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    movieId: uuid("movie_id")
      .notNull()
      .references(() => movies.id, { onDelete: "cascade" }),
    kind: mediaAssetKindEnum("kind").notNull(),
    storageKey: text("storage_key").notNull(),
    publicUrl: text("public_url").notNull(),
    mimeType: text("mime_type").notNull(),
    byteSize: integer("byte_size"),
    sha1: text("sha1"),
    sourceUrl: text("source_url"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (table) => [
    index("media_assets_movie_id_kind_idx").on(table.movieId, table.kind),
    index("media_assets_storage_key_idx").on(table.storageKey),
  ],
);

export const importStaging = pgTable(
  "import_staging",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    year: text("year"),
    platform: text("platform"),
    type: text("type"),
    note: text("note"),
    url: text("url"),
    batchId: text("batch_id").notNull(),
    tmdbResolveStatus: tmdbResolveStatusEnum("tmdb_resolve_status").notNull().default("pending"),
    tmdbId: integer("tmdb_id"),
    candidatesJson: jsonb("candidates_json"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (table) => [
    index("import_staging_batch_id_idx").on(table.batchId),
    index("import_staging_tmdb_resolve_status_idx").on(table.tmdbResolveStatus),
  ],
);

export const moviesRelations = relations(movies, ({ many }) => ({
  viewingPaths: many(viewingPaths),
  mediaAssets: many(mediaAssets),
}));

export const viewingPathsRelations = relations(viewingPaths, ({ one }) => ({
  movie: one(movies, {
    fields: [viewingPaths.movieId],
    references: [movies.id],
  }),
}));

export const mediaAssetsRelations = relations(mediaAssets, ({ one }) => ({
  movie: one(movies, {
    fields: [mediaAssets.movieId],
    references: [movies.id],
  }),
}));
