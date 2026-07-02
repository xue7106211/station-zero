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

/** `note` 中 `片源标签:` 分段。 */
const SOURCE_TAG_SEGMENT_RE = /^片源标签:\s*(.+)$/i;

/** `YYYY-MM-DD` 或 `YYYY-MM-DD · …` 分段。 */
const DATE_SEGMENT_RE = /^(\d{4}-\d{2}-\d{2})(?:\s*[·|]\s*(.+))?$/;

/** 方括号内字幕 / 音轨标注。 */
const BRACKET_SUBTITLE_RE = /\[([^\]]*(?:字幕|音轨)[^\]]*)\]/;

/**
 * 磁力分类下手风琴标题已表达来源时，行内不再重复的平台名。
 * 含 `磁力`（与 type 同名）及 legacy 录入的 `高清影视之家`。
 */
const REDUNDANT_MAGNET_PLATFORMS = new Set(["磁力", "高清影视之家"]);

/** 详情页主行展示的技术 token 识别顺序。 */
const TECH_TOKEN_PATTERNS: RegExp[] = [
  /\b(2160p|1080p|720p|4320p|4K|UHD)\b/i,
  /\b(HDR10\+|HDR10|DV|Dolby\.?Vision)\b/i,
  /\b(REPACK)\b/i,
  /\b(REMUX)\b/i,
  /\b(Blu-?Ray)\b/i,
  /\b(AMZN)\b/i,
  /\b(WEB-DL)\b/i,
  /\b(WEBRip)\b/i,
  /\b(HDTV)\b/i,
  /\b(DVD)\b/i,
  /\b(DDP?\d+(?:\.\d+)?|DTS(?:-HD)?(?:\s*MA)?|FLAC(?:\.\d+(?:\.\d+)?)?|TrueHD|Atmos|AAC(?:\.\d+)?)\b/i,
];

/** 详情页资源行 Tag 区最多展示数量（含体积 Chip）。 */
export const MAX_PROVIDER_ROW_TAGS = 5;

export type ProviderRowDisplay = {
  /** 清洗后的原始 note（去水印 / 片源标签 / 体积，保留 release 名） */
  detail: string;
  /** 上传 / 收录日期（YYYY-MM-DD） */
  uploadDate?: string;
  /** 清晰度 / 片源 / 音轨 / 字幕等次级 Tag（不含视频编码） */
  specTags?: string[];
  sizeLabel?: string;
  /** 完整清洗后原文，供 hover tooltip */
  tooltip?: string;
};

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
 * 规整技术 token 并按忽略大小写去重。
 *
 * 当短 token 已被更具体的长 token 覆盖时跳过短 token，例如 `H.265` 可被
 * `H.265 10bit` 覆盖，避免主行展示重复信息。
 */
function dedupeTokens(tokens: string[]): string[] {
  const normalized = tokens.map((token) => formatTechToken(token));
  const result: string[] = [];

  for (const token of normalized) {
    const key = token.toLowerCase();
    const subsumed = normalized.some(
      (other) =>
        other !== token &&
        other.length > token.length &&
        other.toLowerCase().startsWith(key),
    );
    if (subsumed) continue;
    if (!result.some((existing) => existing.toLowerCase() === key)) {
      result.push(token);
    }
  }

  return result;
}

/**
 * 统一技术 token 的展示格式。
 *
 * 主要处理常见点分 / 空格差异，例如 `H265` → `H.265`、`x265.10bit` →
 * `x265 10bit`，让页面上的 Chip / 文案更一致。
 */
function formatTechToken(token: string): string {
  return token
    .replace(/\bH(26[45])\b/gi, "H.$1")
    .replace(/\bFLAC\.(\d+(?:\.\d+)?)\b/gi, "FLAC $1")
    .replace(/\bx(26[45])[.\s]*10bit\b/gi, "x$1 10bit")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * 按预设优先级从原始发布名中提取分辨率、HDR、片源、编码、音轨等技术 token。
 */
function extractTechTokens(text: string): string[] {
  const tokens: string[] = [];
  for (const pattern of TECH_TOKEN_PATTERNS) {
    const match = text.match(pattern);
    if (match?.[0]) {
      tokens.push(match[0]);
    }
  }
  return dedupeTokens(tokens);
}

/**
 * 将字幕 / 片源标签文本压缩成便于包含判断的形式。
 */
function normalizeTagText(text: string): string {
  return text.replace(/[+，,\s]/g, "").toLowerCase();
}

/**
 * 判断 `片源标签` 是否已被字幕 / 音轨文案表达，避免重复追加。
 */
function isRedundantSourceTag(subtitle: string | undefined, sourceTags: string | undefined): boolean {
  if (!sourceTags) return true;
  if (!subtitle) return false;
  const normalizedSubtitle = normalizeTagText(subtitle);
  const normalizedSource = normalizeTagText(sourceTags);
  return (
    normalizedSource.includes(normalizedSubtitle) ||
    normalizedSubtitle.includes(normalizedSource)
  );
}

/**
 * 从发布名开头移除影片标题或常见英文文件名前缀。
 *
 * 这样主扫读行可以聚焦在 `1080p · WEB-DL · x265` 等真正有决策价值的信息上。
 */
function stripMovieTitlePrefix(line: string, movieTitle: string): string {
  if (!movieTitle) return line;
  const escaped = movieTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return line
    .replace(new RegExp(`^${escaped}(?:\\[[^\\]]*\\])?\\.?`), "")
    .replace(/^[A-Za-z0-9][A-Za-z0-9]*(?:\.[A-Za-z0-9]+)*\.(?:19|20)\d{2}\./i, "")
    .trim();
}

/**
 * 从发布名尾部提取发布组名。
 *
 * 支持常见 `...-GroupName` 形式；不符合简单字母数字规则时返回 `undefined`。
 */
function extractReleaseGroup(releaseLine: string): string | undefined {
  const lastSegment = releaseLine.split(".").pop() ?? "";
  const dashIndex = lastSegment.lastIndexOf("-");
  if (dashIndex <= 0 || dashIndex >= lastSegment.length - 1) {
    return undefined;
  }
  const group = lastSegment.slice(dashIndex + 1);
  return /^[A-Za-z0-9]{2,}$/.test(group) ? group : undefined;
}

/**
 * 将清洗后的 note 拆成发布名、日期与 `片源标签` 三类结构化片段。
 *
 * bulk-ingest 生成的 note 通常使用 `|` 分隔多个片段，本函数只做轻量识别，
 * 保留未识别的首个片段作为发布名。
 */
function splitNoteSegments(text: string): {
  releaseLine: string;
  date?: string;
  sourceTags?: string;
} {
  const parts = text.split(/\s*\|\s*/).map((part) => part.trim()).filter(Boolean);
  let releaseLine = "";
  let date: string | undefined;
  let sourceTags: string | undefined;

  for (const part of parts) {
    const tagMatch = part.match(SOURCE_TAG_SEGMENT_RE);
    if (tagMatch) {
      sourceTags = tagMatch[1].trim();
      continue;
    }

    const dateMatch = part.match(DATE_SEGMENT_RE);
    if (dateMatch) {
      date = dateMatch[1];
      continue;
    }

    if (!releaseLine) {
      releaseLine = part;
    }
  }

  return {
    releaseLine: releaseLine || text,
    date,
    sourceTags,
  };
}

/**
 * 移除 `片源标签:` 分段，保留可作为 tooltip / 解析输入的主体文本。
 */
function stripSourceTagSegments(text: string): string {
  return text
    .split(/\s*\|\s*/)
    .map((part) => part.trim())
    .filter((part) => part && !SOURCE_TAG_SEGMENT_RE.test(part))
    .join(" | ")
    .trim();
}

/**
 * 解析人工整理的短 note。
 *
 * 这类 note 多使用 `·` 分隔日期、技术规格与字幕信息；返回结果用于非完整
 * torrent 发布名的磁力行展示。
 */
function parseCuratedNote(text: string): { title: string; meta?: string } {
  const parts = text.split(/\s*·\s*/).map((part) => part.trim()).filter(Boolean);
  let date: string | undefined;
  let subtitle: string | undefined;
  const techChunks: string[] = [];

  for (const part of parts) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(part)) {
      date = part;
      continue;
    }
    if (/(?:字幕|无字|音轨)/.test(part)) {
      subtitle = part;
      continue;
    }
    techChunks.push(part);
  }

  const titleTokens = extractTechTokens(techChunks.join(" "));
  if (subtitle) {
    titleTokens.push(subtitle);
  }

  return {
    title: titleTokens.join(" · "),
    meta: date,
  };
}

/**
 * 解析完整 torrent 发布名，提取主行技术 token 与发布组 meta。
 *
 * 会先剥离影片名前缀与字幕括号，再从剩余发布名中抽取分辨率、片源、编码、
 * 音轨等信息。
 */
function parseTorrentReleaseLine(
  releaseLine: string,
  movieTitle: string,
  sourceTags?: string,
): { title: string; meta?: string } {
  const bracketMatch = releaseLine.match(BRACKET_SUBTITLE_RE);
  const subtitle = bracketMatch?.[1]?.trim();
  const strippedLine = stripMovieTitlePrefix(
    releaseLine.replace(BRACKET_SUBTITLE_RE, "").replace(/\.+/g, ".").replace(/^\.|\.$/g, ""),
    movieTitle,
  );

  const titleTokens = extractTechTokens(strippedLine);
  if (subtitle) {
    titleTokens.push(subtitle);
  } else if (sourceTags && !isRedundantSourceTag(undefined, sourceTags)) {
    titleTokens.push(sourceTags);
  }

  const releaseGroup = extractReleaseGroup(strippedLine);
  const metaTokens = dedupeTokens(
    [releaseGroup].filter((token): token is string => Boolean(token)),
  );

  return {
    title: titleTokens.join(" · "),
    meta: metaTokens.length > 0 ? metaTokens.join(" · ") : undefined,
  };
}

/**
 * 从人工整理 note 末尾移除日期分段。
 */
function stripTrailingDateFromCuratedNote(text: string, uploadDate?: string): string {
  if (!uploadDate) return text;
  const escaped = uploadDate.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.replace(new RegExp(`\\s*·\\s*${escaped}\\s*$`), "").trim();
}

/**
 * 将磁力 note 转成详情页观看路径行的结构化展示字段。
 *
 * `detail` 保留清洗后的原始 release 文案；`uploadDate` 单独抽出；`specTags` 为格式次级 Tag。
 */
function structureMagnetNote(
  text: string,
  movieTitle: string,
): { detail: string; uploadDate?: string; specTags?: string[]; tooltip: string } {
  const tooltip = stripSourceTagSegments(text);
  const withoutTags = stripSourceTagSegments(text);
  const { releaseLine, date, sourceTags } = splitNoteSegments(withoutTags);
  const isTorrentNote = withoutTags.includes("|");

  const parsed = isTorrentNote
    ? parseTorrentReleaseLine(releaseLine, movieTitle, sourceTags)
    : parseCuratedNote(withoutTags);

  const uploadDate = date ?? (isTorrentNote ? undefined : parsed.meta);

  let summaryTitle = parsed.title;

  if (!summaryTitle) {
    summaryTitle = stripMovieTitlePrefix(releaseLine, movieTitle) || withoutTags;
  }

  if (
    sourceTags &&
    !isRedundantSourceTag(
      summaryTitle.match(/(?:字幕|音轨|无字)[^·|]*/)?.[0],
      sourceTags,
    ) &&
    !summaryTitle.includes(sourceTags)
  ) {
    summaryTitle = summaryTitle ? `${summaryTitle} · ${sourceTags}` : sourceTags;
  }

  const summaryParts = [summaryTitle].filter(Boolean);
  const specTags =
    summaryParts.length > 0
      ? dedupeTokens(summaryParts.flatMap((part) => part.split(/\s*·\s*/)).filter(Boolean))
      : undefined;

  const detail = isTorrentNote
    ? releaseLine
    : stripTrailingDateFromCuratedNote(withoutTags, uploadDate);

  const specSummary = specTags?.join(" · ");
  return {
    detail,
    uploadDate,
    specTags: specSummary && specSummary !== detail ? specTags : undefined,
    tooltip,
  };
}

/**
 * 将单条观看路径格式化为 `ProviderRow` 所需的结构化展示字段。
 *
 * - `detail`：清洗后的原始 note（磁力保留完整 release 名）
 * - `uploadDate`：上传 / 收录日期，单独展示
 * - `specTags`：清晰度 / 编码 / 字幕等次级 Tag
 * - `sizeLabel`：体积 Chip
 * - `tooltip`：完整清洗后原文
 */
export function formatProviderRow(
  path: ViewingPath,
  movieTitle: string,
): ProviderRowDisplay {
  const rawText = buildDisplayText(path, movieTitle);
  const sizeMatch = rawText.match(FILE_SIZE_PATTERN);
  const sizeLabel = sizeMatch?.[1]?.trim();
  const textWithoutSize = sizeLabel ? stripSizeToken(rawText, sizeLabel) : rawText;

  if (path.type === "磁力") {
    const structured = structureMagnetNote(textWithoutSize, movieTitle);
    const maxSpecTags = Math.max(0, MAX_PROVIDER_ROW_TAGS - (sizeLabel ? 1 : 0));
    return {
      detail: structured.detail,
      uploadDate: structured.uploadDate,
      specTags: structured.specTags?.slice(0, maxSpecTags),
      sizeLabel,
      tooltip: structured.tooltip,
    };
  }

  return {
    detail: textWithoutSize,
    sizeLabel,
    tooltip: textWithoutSize,
  };
}
