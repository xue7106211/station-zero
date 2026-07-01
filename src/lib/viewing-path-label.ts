/**
 * 观看路径行文案格式化。
 *
 * 将 DB / bulk-ingest 存的原始 `ViewingPath.note` 清洗为详情页 `ProviderRow` 的展示文案；
 * 不修改数据源，仅作用于 UI。调用方见 `watch-providers`。
 */

import type { ViewingPath } from "@/lib/content";

/** 与 bulk-ingest `RELEASE_RE` 对齐：发布站括号水印（如「高清影视之家发布」）。 */
const RELEASE_WATERMARK_RE =
  /【(?:高清影视之家发布|首发于高清影视之家|高清影视之家首发|高清影视之家)[^】]*】/g;

/** 从 note 中提取第一个体积 token，供 Chip 与主文案拆分。 */
const FILE_SIZE_PATTERN = /(\d+(?:\.\d+)?\s*(?:GB|MB|TB|KB))/i;

/**
 * 磁力分类下手风琴标题已表达来源时，行内不再重复的平台名。
 * 含 `磁力`（与 type 同名）及 legacy 录入的 `高清影视之家`。
 */
const REDUNDANT_MAGNET_PLATFORMS = new Set(["磁力", "高清影视之家"]);

/**
 * 移除发布站括号水印并规整空白。
 *
 * @example
 * stripReleaseWatermark("【高清影视之家发布 www.HDBTHD.com】错位.1986")
 * // => "错位.1986"
 */
export function stripReleaseWatermark(text: string): string {
  return text
    .replace(RELEASE_WATERMARK_RE, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * 判断是否应在 note 前拼接 `platform ·`。
 *
 * 正版平台（如 Netflix）保留前缀以便区分；磁力手风琴内冗余平台名省略。
 */
function shouldPrefixPlatform(path: ViewingPath, movieTitle: string): boolean {
  if (!path.platform || path.platform === movieTitle) {
    return false;
  }
  if (path.type === "磁力" && REDUNDANT_MAGNET_PLATFORMS.has(path.platform)) {
    return false;
  }
  return true;
}

/** 拼出清洗后、尚未拆分体积的整行展示文本。 */
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

/**
 * 从主文案中移除已识别出的体积片段，避免与 Chip 重复展示。
 *
 * `sizeToken` 会经正则转义后再匹配，支持 `· 5.29GB` 与 `| 5.29GB` 等分隔形式。
 */
export function stripSizeToken(text: string, sizeToken: string): string {
  if (!sizeToken) return text.trim();
  const escaped = sizeToken.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text
    .replace(new RegExp(`\\s*[·|]\\s*${escaped}`, "gi"), "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s*[·|]\s*$/g, "")
    .trim();
}

/**
 * 将单条观看路径格式化为 `ProviderRow` 所需的 `{ label, sizeLabel }`。
 *
 * - `label`：两行摘要段落（`line-clamp-2`）
 * - `sizeLabel`：若有体积则抽出，供底部 Chip 单独展示
 *
 * @param path - 观看路径记录（platform / type / note）
 * @param movieTitle - 当前影片中文或展示标题，用于避免 `片名 · 片名` 重复前缀
 */
export function formatProviderRow(
  path: ViewingPath,
  movieTitle: string,
): { label: string; sizeLabel?: string } {
  const rawText = buildDisplayText(path, movieTitle);
  const sizeMatch = rawText.match(FILE_SIZE_PATTERN);
  const sizeLabel = sizeMatch?.[1]?.trim();
  const label = sizeLabel ? stripSizeToken(rawText, sizeLabel) : rawText;

  return { label, sizeLabel };
}
