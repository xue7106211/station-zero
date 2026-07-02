/**
 * Supabase Postgres 表定义（Drizzle ORM）。
 *
 * 本文件是数据库 schema 的单一来源：`npm run db:generate` 据此生成 `drizzle/*.sql`，
 * `movie-sql-store` 与 bulk-ingest 脚本通过 Drizzle 读写这些表。
 *
 * 表职责速查：
 * - `movies` — 影片主记录（资料 + 策展判断 + 发布状态）
 * - `viewing_paths` — 每部片的观看/资源路径（磁力、正版平台等）
 * - `media_assets` — Supabase Storage 海报/背景图元数据
 * - `import_staging` — 万级 CSV 批量录入暂存（页面不读）
 *
 * 页面列表/搜索仅展示 `content_status = published`；详情页不按状态过滤。
 */

import { relations, sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/** 影片发布状态：列表与搜索仅包含 `published`。 */
export const contentStatusEnum = pgEnum("content_status", [
  "draft",
  "review",
  "published",
]);

/** 资料来源：TMDB 同步、人工录入或其他。 */
export const sourceProviderEnum = pgEnum("source_provider", [
  "tmdb",
  "manual",
  "other",
]);

/** 观看路径类型（与前端 `ViewingPath.type` 对齐）。 */
export const viewingPathTypeEnum = pgEnum("viewing_path_type", [
  "订阅",
  "租赁/购买",
  "实体发行",
  "网盘",
  "磁力",
  "资料来源",
]);

/** 观看路径是否在详情页公开展示。 */
export const viewingPathVisibilityEnum = pgEnum("viewing_path_visibility", [
  "public",
  "hidden",
]);

/** Storage 媒体资源种类。 */
export const mediaAssetKindEnum = pgEnum("media_asset_kind", [
  "poster",
  "backdrop",
]);

/** bulk-ingest 流水线中 TMDB 片名消歧状态。 */
export const tmdbResolveStatusEnum = pgEnum("tmdb_resolve_status", [
  "pending",
  "resolved",
  "ambiguous",
  "failed",
]);

/**
 * 影片主表。
 *
 * 合并 TMDB 客观资料与 Station Zero 策展字段；`slug` 为公开 URL 标识。
 *
 * 字段分组：
 * - 标识：`slug`、`tmdbId`、`imdbId`（IMDB 外部 ID，用于搜索；与 `ratings.imdb` 评分无关）
 * - 客观资料：`title`、`originalTitle`、`year`、`director`、`cast`、`genres` 等
 * - 策展判断：`verdict`、`bestWay`、`idealScene`、`notFor`、`versionSignals`、`deviceAdvice`
 * - 媒体：`posterUrl` / `backdropUrl` 为页面直链；`source*Url` 为 TMDB 图源备份
 * - 发布：`contentStatus` 控制是否出现在列表/首页/搜索
 */
export const movies = pgTable(
  "movies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull().unique(),
    tmdbId: integer("tmdb_id"),
    imdbId: text("imdb_id"),
    title: text("title").notNull(),
    originalTitle: text("original_title").notNull(),
    year: text("year").notNull(),
    genres: text("genres")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    director: text("director").notNull(),
    cast: text("cast")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    runtime: text("runtime").notNull(),
    writers: text("writers").array(),
    countries: text("countries").array(),
    languages: text("languages").array(),
    releaseDate: text("release_date"),
    aka: text("aka").array(),
    collection: jsonb("collection").$type<{
      tmdbId: number;
      name: string;
      posterPath?: string | null;
      backdropPath?: string | null;
    } | null>(),
    keywords: text("keywords")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
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
    deviceAdvice: text("device_advice")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    related: text("related")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    contentStatus: contentStatusEnum("content_status")
      .notNull()
      .default("draft"),
    sourceProvider: sourceProviderEnum("source_provider")
      .notNull()
      .default("manual"),
    sourceUpdatedAt: timestamp("source_updated_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    imageCachedAt: timestamp("image_cached_at", {
      withTimezone: true,
      mode: "string",
    }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("movies_content_status_updated_at_idx").on(
      table.contentStatus,
      table.updatedAt,
    ),
    index("movies_tmdb_id_idx").on(table.tmdbId),
    uniqueIndex("movies_imdb_id_unique_idx")
      .on(table.imdbId)
      .where(sql`${table.imdbId} is not null`),
  ],
);

/**
 * 观看路径表（一对多挂在 `movies` 下）。
 *
 * 同一部片可有多条记录（多平台、多磁力等）；详情页按 `sortOrder` 展示，`visibility = public` 才渲染。
 */
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
    visibility: viewingPathVisibilityEnum("visibility")
      .notNull()
      .default("public"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("viewing_paths_movie_id_sort_order_idx").on(
      table.movieId,
      table.sortOrder,
    ),
  ],
);

/**
 * Supabase Storage 媒体资源索引（一对多挂在 `movies` 下）。
 *
 * 页面海报以 `movies.poster_url` 为准；本表记录 bucket 内 `storage_key`、体积与 TMDB 图源，供入库脚本对账。
 */
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
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("media_assets_movie_id_kind_idx").on(table.movieId, table.kind),
    index("media_assets_storage_key_idx").on(table.storageKey),
  ],
);

/**
 * 万级 CSV 批量录入暂存表。
 *
 * 由 `ingest:staging` 写入、`ingest:resolve` 消歧、`ingest:sync` 同步到 `movies` / `viewing_paths`。
 * 访客页面不读取；保留 staging 行便于审计与重跑。
 */
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
    tmdbResolveStatus: tmdbResolveStatusEnum("tmdb_resolve_status")
      .notNull()
      .default("pending"),
    tmdbId: integer("tmdb_id"),
    candidatesJson: jsonb("candidates_json"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("import_staging_batch_id_idx").on(table.batchId),
    index("import_staging_tmdb_resolve_status_idx").on(table.tmdbResolveStatus),
  ],
);

/** `movies` → `viewing_paths` / `media_assets` 一对多关系（供 Drizzle relational query 使用）。 */
export const moviesRelations = relations(movies, ({ many }) => ({
  viewingPaths: many(viewingPaths),
  mediaAssets: many(mediaAssets),
}));

/** `viewing_paths` → `movies` 多对一。 */
export const viewingPathsRelations = relations(viewingPaths, ({ one }) => ({
  movie: one(movies, {
    fields: [viewingPaths.movieId],
    references: [movies.id],
  }),
}));

/** `media_assets` → `movies` 多对一。 */
export const mediaAssetsRelations = relations(mediaAssets, ({ one }) => ({
  movie: one(movies, {
    fields: [mediaAssets.movieId],
    references: [movies.id],
  }),
}));
