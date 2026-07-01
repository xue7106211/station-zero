import type { ViewingPath } from "@/lib/content";

/** 与 bulk-ingest `RELEASE_RE` 对齐：发布站括号水印 */
const RELEASE_WATERMARK_RE =
  /【(?:高清影视之家发布|首发于高清影视之家|高清影视之家首发|高清影视之家)[^】]*】/g;

const FILE_SIZE_PATTERN = /(\d+(?:\.\d+)?\s*(?:GB|MB|TB|KB))/i;

/** 分类手风琴已表达来源时，行内不再重复平台名 */
const REDUNDANT_MAGNET_PLATFORMS = new Set(["磁力", "高清影视之家"]);

export function stripReleaseWatermark(text: string): string {
  return text.replace(RELEASE_WATERMARK_RE, "").replace(/\s{2,}/g, " ").trim();
}

function shouldPrefixPlatform(path: ViewingPath, movieTitle: string): boolean {
  if (!path.platform || path.platform === movieTitle) {
    return false;
  }
  if (path.type === "磁力" && REDUNDANT_MAGNET_PLATFORMS.has(path.platform)) {
    return false;
  }
  return true;
}

function buildDisplayText(path: ViewingPath, movieTitle: string): string {
  const cleanNote = stripReleaseWatermark(path.note ?? "");

  if (!cleanNote) {
    return path.platform;
  }

  if (shouldPrefixPlatform(path, movieTitle)) {
    return `${path.platform} · ${cleanNote}`;
  }

  return cleanNote;
}

export function stripSizeToken(text: string, sizeToken: string): string {
  if (!sizeToken) return text.trim();
  const escaped = sizeToken.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text
    .replace(new RegExp(`\\s*[·|]\\s*${escaped}`, "gi"), "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s*[·|]\s*$/g, "")
    .trim();
}

export function formatProviderRow(path: ViewingPath, movieTitle: string) {
  const rawText = buildDisplayText(path, movieTitle);
  const sizeMatch = rawText.match(FILE_SIZE_PATTERN);
  const sizeLabel = sizeMatch?.[1]?.trim();
  const label = sizeLabel ? stripSizeToken(rawText, sizeLabel) : rawText;

  return { label, sizeLabel };
}
