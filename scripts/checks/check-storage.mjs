/**
 * 【预检】Supabase Storage 上传凭证
 *
 * npm run check:storage
 */
import { resolveSupabaseStorageConfig } from "../bulk-ingest/storage-media.mts";

if (!process.env.DATABASE_URL?.trim()) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const config = resolveSupabaseStorageConfig();
if (!config) {
  console.error("Supabase Storage upload is not configured.");
  console.error("");
  console.error("Add to .env.local:");
  console.error("  SUPABASE_SERVICE_ROLE_KEY=...   # Project Settings → API → service_role secret");
  console.error("Optional:");
  console.error("  SUPABASE_URL=https://<project-ref>.supabase.co");
  console.error("  SUPABASE_MEDIA_BUCKET=media");
  process.exit(1);
}

console.log("Supabase Storage upload ready.");
console.log(`  url: ${config.supabaseUrl}`);
console.log(`  bucket: ${config.bucket}`);
