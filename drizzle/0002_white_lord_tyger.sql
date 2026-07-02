ALTER TABLE "movies" ADD COLUMN "collection" jsonb;--> statement-breakpoint
ALTER TABLE "movies" ADD COLUMN "keywords" text[] DEFAULT '{}'::text[] NOT NULL;
