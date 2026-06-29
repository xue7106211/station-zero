/**
 * Supabase Storage 上传（bulk-ingest 脚本专用，仅服务端）
 *
 * bucket 默认 `media`，对象路径 `posters/{slug}.webp` / `backdrops/{slug}.webp`（bulk-ingest 压缩入库）。
 * 公网 URL：`{SUPABASE_URL}/storage/v1/object/public/media/posters/...`
 */
import { readFileSync } from "node:fs";
import { extname } from "node:path";
import { cleanEnv } from "./shared.mts";

export type SupabaseStorageConfig = {
  supabaseUrl: string;
  serviceRoleKey: string;
  bucket: string;
};

export type UploadedMedia = {
  storageKey: string;
  publicUrl: string;
  mimeType: string;
  byteSize: number;
};

export function deriveSupabaseProjectRef(databaseUrl: string) {
  const direct = databaseUrl.match(/postgres\.([a-z0-9]+)/i);
  if (direct?.[1]) return direct[1];

  const host = databaseUrl.match(/@([a-z0-9]+)\.supabase\.co/i);
  if (host?.[1]) return host[1];

  return "";
}

export function resolveSupabaseStorageConfig(): SupabaseStorageConfig | null {
  const serviceRoleKey = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);
  let supabaseUrl = cleanEnv(process.env.SUPABASE_URL);

  if (!supabaseUrl) {
    const databaseUrl = cleanEnv(process.env.DATABASE_URL);
    const projectRef = deriveSupabaseProjectRef(databaseUrl);
    if (projectRef) {
      supabaseUrl = `https://${projectRef}.supabase.co`;
    }
  }

  const bucket = cleanEnv(process.env.SUPABASE_MEDIA_BUCKET) || "media";

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return { supabaseUrl, serviceRoleKey, bucket };
}

export function isSupabaseStorageConfigured() {
  return resolveSupabaseStorageConfig() !== null;
}

export function buildStorageObjectPath(kind: "poster" | "backdrop", slug: string, extension: string) {
  const folder = kind === "poster" ? "posters" : "backdrops";
  return `${folder}/${slug}.${extension}`;
}

export function buildSupabasePublicUrl(config: SupabaseStorageConfig, objectPath: string) {
  return `${config.supabaseUrl}/storage/v1/object/public/${config.bucket}/${objectPath}`;
}

export function mimeTypeFromExtension(extension: string) {
  switch (extension.toLowerCase()) {
    case "webp":
      return "image/webp";
    case "png":
      return "image/png";
    case "avif":
      return "image/avif";
    default:
      return "image/jpeg";
  }
}

export function normalizeWebMediaPath(value: string | null | undefined) {
  if (!value) return undefined;
  return value.replace(/\\/g, "/");
}

export function localPathFromMediaUrl(value: string | null | undefined, kind: "poster" | "backdrop") {
  const normalized = normalizeWebMediaPath(value);
  if (!normalized) return undefined;

  if (normalized.includes("/object/public/")) {
    const marker = "/object/public/";
    const index = normalized.indexOf(marker);
    if (index >= 0) {
      const after = normalized.slice(index + marker.length);
      const parts = after.split("/");
      if (parts.length >= 2) {
        const fileName = parts.at(-1);
        const folder = parts.at(-2);
        if (fileName && folder) {
          return `public/media/${folder}/${fileName}`;
        }
      }
    }
  }

  const trimmed = normalized.replace(/^\/+/, "");
  if (trimmed.startsWith("media/")) {
    return `public/${trimmed}`;
  }

  const fileName = trimmed.split("/").pop();
  if (!fileName) return undefined;
  const folder = kind === "poster" ? "posters" : "backdrops";
  return `public/media/${folder}/${fileName}`;
}

export async function uploadLocalFileToSupabaseStorage(
  config: SupabaseStorageConfig,
  localFilePath: string,
  objectPath: string,
) {
  const extension = extname(localFilePath).replace(".", "") || "jpg";
  const mimeType = mimeTypeFromExtension(extension);
  const bytes = readFileSync(localFilePath);

  const uploadUrl = `${config.supabaseUrl}/storage/v1/object/${config.bucket}/${objectPath}`;
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.serviceRoleKey}`,
      apikey: config.serviceRoleKey,
      "Content-Type": mimeType,
      "x-upsert": "true",
    },
    body: bytes,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Storage upload failed (${response.status}) ${objectPath}${detail ? `: ${detail.slice(0, 200)}` : ""}`,
    );
  }

  return {
    storageKey: objectPath,
    publicUrl: buildSupabasePublicUrl(config, objectPath),
    mimeType,
    byteSize: bytes.length,
  } satisfies UploadedMedia;
}

export async function publishLocalMediaFile(
  config: SupabaseStorageConfig,
  localFilePath: string | undefined,
  kind: "poster" | "backdrop",
  slug: string,
) {
  if (!localFilePath) return undefined;

  const extension = extname(localFilePath).replace(".", "") || "jpg";
  const objectPath = buildStorageObjectPath(kind, slug, extension);
  const uploaded = await uploadLocalFileToSupabaseStorage(config, localFilePath, objectPath);
  console.log(
    `[storage] ${kind} ${objectPath} (${Math.round(uploaded.byteSize / 1024)}KB) -> ${uploaded.publicUrl}`,
  );
  return uploaded;
}
