/**
 * 入库图片压缩（bulk-ingest 专用）
 *
 * TMDB 下载后 resize + WebP，产出 public/media/{posters|backdrops}/{slug}.webp
 */
import { existsSync, mkdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

export type ImageCompressPreset = {
  maxWidth: number;
  quality: number;
};

export type ImageCompressConfig = {
  poster: ImageCompressPreset;
  backdrop: ImageCompressPreset;
};

function cleanEnv(value: string | undefined) {
  return String(value ?? "")
    .trim()
    .replace(/^['"]|['"]$/g, "")
    .trim();
}

function readPositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : fallback;
}

export function readImageCompressConfig(): ImageCompressConfig {
  return {
    poster: {
      maxWidth: readPositiveInt(cleanEnv(process.env.POSTER_MAX_WIDTH), 480),
      quality: readPositiveInt(cleanEnv(process.env.POSTER_WEBP_QUALITY), 78),
    },
    backdrop: {
      maxWidth: readPositiveInt(cleanEnv(process.env.BACKDROP_MAX_WIDTH), 1280),
      quality: readPositiveInt(cleanEnv(process.env.BACKDROP_WEBP_QUALITY), 72),
    },
  };
}

export function buildWebpOutputPath(outputDir: string, slug: string) {
  return join(outputDir, `${slug}.webp`);
}

export async function compressImageToWebp(
  inputPath: string,
  outputDir: string,
  slug: string,
  kind: "poster" | "backdrop",
  preset: ImageCompressPreset,
) {
  mkdirSync(outputDir, { recursive: true });
  const outputPath = buildWebpOutputPath(outputDir, slug);

  if (existsSync(outputPath)) {
    const outputMtime = statSync(outputPath).mtimeMs;
    const inputMtime = statSync(inputPath).mtimeMs;
    if (outputMtime >= inputMtime) {
      console.log(`[skip] ${kind} ${slug}.webp (up to date)`);
      return outputPath;
    }
  }

  const inputBytes = readFileSync(inputPath);
  const outputBytes = await sharp(inputBytes)
    .resize({ width: preset.maxWidth, withoutEnlargement: true })
    .webp({ quality: preset.quality })
    .toBuffer();

  writeFileSync(outputPath, outputBytes);
  console.log(
    `Compressed ${kind} ${slug}.webp (${Math.round(inputBytes.length / 1024)}KB -> ${Math.round(outputBytes.length / 1024)}KB)`,
  );

  return outputPath;
}

export async function compressPosterToWebp(inputPath: string, outputDir: string, slug: string) {
  const config = readImageCompressConfig();
  const outputPath = await compressImageToWebp(inputPath, outputDir, slug, "poster", config.poster);
  maybeDeleteRawSource(inputPath, outputPath);
  return outputPath;
}

export async function compressBackdropToWebp(inputPath: string, outputDir: string, slug: string) {
  const config = readImageCompressConfig();
  const outputPath = await compressImageToWebp(inputPath, outputDir, slug, "backdrop", config.backdrop);
  maybeDeleteRawSource(inputPath, outputPath);
  return outputPath;
}

function maybeDeleteRawSource(inputPath: string, outputPath: string) {
  if (inputPath === outputPath) return;
  if (!inputPath.toLowerCase().endsWith(".webp") && existsSync(inputPath)) {
    unlinkSync(inputPath);
  }
}

export function resolveCompressedMediaFile(outputDir: string, slug: string) {
  const webpPath = buildWebpOutputPath(outputDir, slug);
  if (existsSync(webpPath)) return webpPath;
  return undefined;
}
