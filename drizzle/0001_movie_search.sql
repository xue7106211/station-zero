ALTER TABLE "movies" ADD COLUMN "imdb_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX "movies_imdb_id_unique_idx" ON "movies" USING btree ("imdb_id") WHERE "imdb_id" is not null;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE INDEX "movies_title_trgm_idx" ON "movies" USING gin ("title" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "movies_original_title_trgm_idx" ON "movies" USING gin ("original_title" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "movies_director_trgm_idx" ON "movies" USING gin ("director" gin_trgm_ops);
