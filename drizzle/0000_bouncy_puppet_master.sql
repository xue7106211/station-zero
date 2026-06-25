CREATE TYPE "public"."content_status" AS ENUM('draft', 'review', 'published');--> statement-breakpoint
CREATE TYPE "public"."media_asset_kind" AS ENUM('poster', 'backdrop');--> statement-breakpoint
CREATE TYPE "public"."source_provider" AS ENUM('tmdb', 'manual', 'other');--> statement-breakpoint
CREATE TYPE "public"."tmdb_resolve_status" AS ENUM('pending', 'resolved', 'ambiguous', 'failed');--> statement-breakpoint
CREATE TYPE "public"."viewing_path_type" AS ENUM('订阅', '租赁/购买', '实体发行', '网盘', '磁力', '资料来源');--> statement-breakpoint
CREATE TYPE "public"."viewing_path_visibility" AS ENUM('public', 'hidden');--> statement-breakpoint
CREATE TABLE "import_staging" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"year" text,
	"platform" text,
	"type" text,
	"note" text,
	"url" text,
	"batch_id" text NOT NULL,
	"tmdb_resolve_status" "tmdb_resolve_status" DEFAULT 'pending' NOT NULL,
	"tmdb_id" integer,
	"candidates_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"movie_id" uuid NOT NULL,
	"kind" "media_asset_kind" NOT NULL,
	"storage_key" text NOT NULL,
	"public_url" text NOT NULL,
	"mime_type" text NOT NULL,
	"byte_size" integer,
	"sha1" text,
	"source_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "movies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"tmdb_id" integer,
	"title" text NOT NULL,
	"original_title" text NOT NULL,
	"year" text NOT NULL,
	"genres" text[] DEFAULT '{}'::text[] NOT NULL,
	"director" text NOT NULL,
	"cast" text[] DEFAULT '{}'::text[] NOT NULL,
	"runtime" text NOT NULL,
	"writers" text[],
	"countries" text[],
	"languages" text[],
	"release_date" text,
	"aka" text[],
	"rating" text NOT NULL,
	"ratings" jsonb,
	"poster_tone" text NOT NULL,
	"poster_url" text,
	"backdrop_url" text,
	"source_poster_url" text,
	"source_backdrop_url" text,
	"palette" jsonb,
	"summary" text NOT NULL,
	"verdict" text NOT NULL,
	"best_way" text NOT NULL,
	"ideal_scene" text NOT NULL,
	"not_for" text NOT NULL,
	"version_signals" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"device_advice" text[] DEFAULT '{}'::text[] NOT NULL,
	"related" text[] DEFAULT '{}'::text[] NOT NULL,
	"content_status" "content_status" DEFAULT 'draft' NOT NULL,
	"source_provider" "source_provider" DEFAULT 'manual' NOT NULL,
	"source_updated_at" timestamp with time zone NOT NULL,
	"image_cached_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "movies_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "viewing_paths" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"movie_id" uuid NOT NULL,
	"platform" text NOT NULL,
	"type" "viewing_path_type" NOT NULL,
	"note" text NOT NULL,
	"url" text,
	"visibility" "viewing_path_visibility" DEFAULT 'public' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_movie_id_movies_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "viewing_paths" ADD CONSTRAINT "viewing_paths_movie_id_movies_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "import_staging_batch_id_idx" ON "import_staging" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "import_staging_tmdb_resolve_status_idx" ON "import_staging" USING btree ("tmdb_resolve_status");--> statement-breakpoint
CREATE INDEX "media_assets_movie_id_kind_idx" ON "media_assets" USING btree ("movie_id","kind");--> statement-breakpoint
CREATE INDEX "media_assets_storage_key_idx" ON "media_assets" USING btree ("storage_key");--> statement-breakpoint
CREATE INDEX "movies_content_status_updated_at_idx" ON "movies" USING btree ("content_status","updated_at");--> statement-breakpoint
CREATE INDEX "movies_tmdb_id_idx" ON "movies" USING btree ("tmdb_id");--> statement-breakpoint
CREATE INDEX "viewing_paths_movie_id_sort_order_idx" ON "viewing_paths" USING btree ("movie_id","sort_order");