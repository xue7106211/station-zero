#!/usr/bin/env node
/**
 * 【批量录入 · 第 0 步】原始 TXT → 标准化 CSV
 *
 * 作用：解析「高清影视之家」regex_v3 导出格式，产出 movies-clean.csv。
 * 这是 bulk-ingest 流水线的数据清洗入口（离线，不访问 DB / TMDB）。
 *
 * node scripts/bulk-ingest/clean-import-txt.mjs [input.txt] [output.csv]
 *
 * 下游：prepare-staging.mts 读取 movies-clean.csv
 */

import { createReadStream, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { createInterface } from "node:readline";

const DEFAULT_INPUT = "data/import/raw/高清影视之家-资源.txt";
const DEFAULT_OUTPUT = "data/import/movies-clean.csv";
const DEFAULT_REPORT = "data/import/clean-report.txt";

const MOVIE_HEADER_RE = /^(\d{4})(?:-\d{4})?\.(.+?)(?:\(([^)]+)\))?\s*$/;
const MOVIE_HEADER_NO_DOT_RE = /^((?:19|20)\d{2})([^(\n]+?)(?:\(([^)]+)\))?\s*$/;
const ALT_MOVIE_HEADER_RE = /^([^(\t@0-9【].+?)\(([^)]+)\)\s*$/;
const TITLE_ONLY_HEADER_RE = /^([^(\t@0-9【][^(\n]{0,80}?)\s*$/;
const MOVIE_TAGS_RE = /^\[(.+)\]$/;
const DATE_SIZE_RE = /^(\d{4}-\d{2}-\d{2})\s+([\d.]+\s*(?:GB|MB|KB|TB|B))\s*$/i;
const MAGNET_RE = /^magnet:\?xt=/i;
const RELEASE_RE = /^【(?:高清影视之家发布|首发于高清影视之家|高清影视之家首发)/;

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function englishDotsToTitle(value) {
  return value.replace(/\./g, " ").replace(/\s+/g, " ").trim();
}

function escapeCsv(value) {
  const text = value == null ? "" : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function extractYearFromTitleZh(titleZh) {
  const start = titleZh.match(/^((?:19|20)\d{2})/);
  if (start) return start[1];
  const end = titleZh.match(/((?:19|20)\d{2})$/);
  if (end) return end[1];
  return "";
}

function extractYearFromMeta(originalTitleDots, releaseLine, titleZh = "") {
  const fromRelease = releaseLine.match(/(?:^|\.)((?:19|20)\d{2})(?:\.|[A-Za-z]|$)/);
  if (fromRelease) return fromRelease[1];

  const fromDots = originalTitleDots.match(/((?:19|20)\d{2})/);
  if (fromDots) return fromDots[1];

  return extractYearFromTitleZh(titleZh);
}

function parseMovieHeader(trimmed) {
  const standardMatch = trimmed.match(MOVIE_HEADER_RE);
  if (standardMatch) {
    return {
      year: standardMatch[1],
      titleZh: standardMatch[2].trim(),
      originalTitleDots: standardMatch[3]?.trim() ?? "",
    };
  }

  const noDotMatch = trimmed.match(MOVIE_HEADER_NO_DOT_RE);
  if (noDotMatch) {
    return {
      year: noDotMatch[1],
      titleZh: noDotMatch[2].trim(),
      originalTitleDots: noDotMatch[3]?.trim() ?? "",
    };
  }

  const altMatch = trimmed.match(ALT_MOVIE_HEADER_RE);
  if (altMatch) {
    const titleZh = altMatch[1].trim();
    const originalTitleDots = altMatch[2].trim();
    return {
      year: extractYearFromMeta(originalTitleDots, "", titleZh),
      titleZh,
      originalTitleDots,
      yearPending: true,
    };
  }

  if (TITLE_ONLY_HEADER_RE.test(trimmed) && /[\u4e00-\u9fff]/.test(trimmed)) {
    return {
      year: "",
      titleZh: trimmed,
      originalTitleDots: "",
      yearPending: true,
    };
  }

  return null;
}
function extractEnglishFromRelease(releaseLine) {
  const match = releaseLine.match(/\.([A-Za-z][A-Za-z0-9.]*)\.(\d{4})\./);
  if (!match) return "";
  return englishDotsToTitle(match[1]);
}

function normalizeEnglishDots(originalTitleDots) {
  return originalTitleDots
    .replace(/(?:19|20)\d{2}CC/i, "")
    .replace(/,(?:19|20)\d{2}(?:\.\w+)*/i, "")
    .replace(/(?:19|20)\d{2}(?:\.\w+)*/i, "")
    .replace(/\.(?:BluRay|Bluray|UHD).*$/i, "")
    .replace(/\.AKA\.[^.]+/i, "")
    .replace(/\.+/g, ".")
    .replace(/^\.|\.$/g, "")
    .trim();
}

function buildSearchTitle(titleZh, originalTitleDots, releaseLine) {
  const fromRelease = extractEnglishFromRelease(releaseLine);
  if (fromRelease) return fromRelease;

  if (originalTitleDots) {
    const normalized = normalizeEnglishDots(originalTitleDots);
    if (normalized) return englishDotsToTitle(normalized);
  }

  return titleZh.trim();
}

function buildNote(releaseLine, uploadDate, size, movieTags) {
  const parts = [releaseLine.trim()];
  if (uploadDate && size) parts.push(`${uploadDate} · ${size}`);
  else if (size) parts.push(size);
  if (movieTags) parts.push(`片源标签: ${movieTags}`);
  return parts.join(" | ");
}

async function parseTxt(inputPath) {
  const rows = [];
  const issues = [];
  const slugCounts = new Map();

  let currentMovie = null;
  let currentMovieTags = "";
  let pendingRelease = "";
  let lineNo = 0;

  const rl = createInterface({
    input: createReadStream(inputPath, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  for await (const rawLine of rl) {
    lineNo += 1;
    const line = rawLine.replace(/\r$/, "");

    if (!line.trim()) continue;
    if (line.startsWith("@regex_v3_export")) continue;

    const trimmed = line.trim();
    const isIndented = /^\t/.test(line);

    if (!isIndented) {
      const parsedHeader = parseMovieHeader(trimmed);
      if (parsedHeader) {
        currentMovie = parsedHeader;
        currentMovieTags = "";
        pendingRelease = "";
        continue;
      }

      issues.push({ lineNo, type: "unexpected_top_level", text: trimmed.slice(0, 120) });
      continue;
    }

    const content = line.replace(/^\t+/, "").trim();
    if (!content) continue;

    if (MOVIE_TAGS_RE.test(content) && !RELEASE_RE.test(content)) {
      currentMovieTags = content.match(MOVIE_TAGS_RE)[1].trim();
      continue;
    }

    if (RELEASE_RE.test(content)) {
      pendingRelease = content;
      continue;
    }

    const dateSizeMatch = content.match(DATE_SIZE_RE);
    if (dateSizeMatch && pendingRelease) {
      pendingRelease = { releaseLine: pendingRelease, uploadDate: dateSizeMatch[1], size: dateSizeMatch[2] };
      continue;
    }

    if (MAGNET_RE.test(content)) {
      if (!currentMovie) {
        issues.push({ lineNo, type: "magnet_without_movie", text: content.slice(0, 80) });
        pendingRelease = "";
        continue;
      }

      if (!pendingRelease || typeof pendingRelease === "string") {
        issues.push({
          lineNo,
          type: "incomplete_resource",
          text: `${currentMovie.year}.${currentMovie.titleZh}`,
        });
        pendingRelease = "";
        continue;
      }

      const searchTitle = buildSearchTitle(
        currentMovie.titleZh,
        currentMovie.originalTitleDots,
        pendingRelease.releaseLine,
      );

      const resolvedYear =
        currentMovie.year ||
        extractYearFromMeta(currentMovie.originalTitleDots, pendingRelease.releaseLine, currentMovie.titleZh);
      if (!resolvedYear) {
        issues.push({
          lineNo,
          type: "missing_year",
          text: `${currentMovie.titleZh}${currentMovie.originalTitleDots ? ` (${currentMovie.originalTitleDots})` : ""}`,
          row: {
            title: searchTitle,
            titleZh: currentMovie.titleZh,
            originalTitle: currentMovie.originalTitleDots
              ? englishDotsToTitle(normalizeEnglishDots(currentMovie.originalTitleDots))
              : extractEnglishFromRelease(pendingRelease.releaseLine),
            year: "",
            platform: "磁力",
            type: "磁力",
            note: buildNote(
              pendingRelease.releaseLine,
              pendingRelease.uploadDate,
              pendingRelease.size,
              currentMovieTags,
            ),
            url: content,
            slug: "",
          },
        });
        pendingRelease = "";
        continue;
      }
      currentMovie.year = resolvedYear;

      const baseSlug = slugify(currentMovie.originalTitleDots || extractEnglishFromRelease(pendingRelease.releaseLine));
      const slugKey = baseSlug || `${resolvedYear}-${currentMovie.titleZh}`;
      slugCounts.set(slugKey, (slugCounts.get(slugKey) ?? 0) + 1);

      rows.push({
        title: searchTitle,
        titleZh: currentMovie.titleZh,
        originalTitle: (() => {
          const fromRelease = extractEnglishFromRelease(pendingRelease.releaseLine);
          if (fromRelease) return fromRelease;
          if (currentMovie.originalTitleDots) {
            const normalized = normalizeEnglishDots(currentMovie.originalTitleDots);
            return normalized ? englishDotsToTitle(normalized) : "";
          }
          return "";
        })(),
        year: resolvedYear,
        platform: "磁力",
        type: "磁力",
        note: buildNote(pendingRelease.releaseLine, pendingRelease.uploadDate, pendingRelease.size, currentMovieTags),
        url: content,
        slugKey,
        baseSlug,
      });

      pendingRelease = "";
      continue;
    }

    issues.push({ lineNo, type: "unrecognized_indented", text: content.slice(0, 120) });
  }

  const slugSeen = new Map();
  for (const row of rows) {
    if (!row.baseSlug) {
      row.slug = "";
      continue;
    }

    const total = slugCounts.get(row.slugKey) ?? 1;
    if (total === 1) {
      row.slug = row.baseSlug;
      continue;
    }

    const index = (slugSeen.get(row.slugKey) ?? 0) + 1;
    slugSeen.set(row.slugKey, index);
    row.slug = index === 1 ? row.baseSlug : `${row.baseSlug}-${row.year}`;
  }

  return { rows, issues, lineNo };
}

function dedupeRows(rows) {
  const seen = new Set();
  const unique = [];
  let duplicateCount = 0;

  for (const row of rows) {
    const key = `${row.title}\t${row.year}\t${row.url}`;
    if (seen.has(key)) {
      duplicateCount += 1;
      continue;
    }
    seen.add(key);
    unique.push(row);
  }

  return { unique, duplicateCount };
}

function writeCsv(outputPath, rows) {
  mkdirSync(dirname(outputPath), { recursive: true });
  const header = [
    "title",
    "title_zh",
    "original_title",
    "year",
    "platform",
    "type",
    "note",
    "url",
    "slug",
  ];
  const lines = [header.join(",")];

  for (const row of rows) {
    lines.push(
      [
        row.title,
        row.titleZh,
        row.originalTitle,
        row.year,
        row.platform,
        row.type,
        row.note,
        row.url,
        row.slug,
      ]
        .map(escapeCsv)
        .join(","),
    );
  }

  writeFileSync(outputPath, `${lines.join("\n")}\n`, "utf8");
}

function writeReport(reportPath, meta) {
  const issueCounts = meta.issues.reduce((acc, issue) => {
    acc[issue.type] = (acc[issue.type] ?? 0) + 1;
    return acc;
  }, {});

  const lines = [
    "高清影视之家 TXT 清洗报告",
    `生成时间: ${new Date().toISOString()}`,
    `源文件: ${meta.inputPath}`,
    "",
    "== 汇总 ==",
    `源文件行数: ${meta.lineNo}`,
    `解析资源行: ${meta.parsedRows}`,
    `去重后资源行: ${meta.uniqueRows}`,
    `重复资源: ${meta.duplicateCount}`,
    `唯一影片 (title+year): ${meta.uniqueMovies}`,
    `无英文片名片源: ${meta.chineseOnlyMovies}`,
    `解析异常: ${meta.issues.length}`,
    "",
    "== 异常类型 ==",
    ...Object.entries(issueCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => `${type}: ${count}`),
    "",
    "== CSV 列说明 ==",
    "title: TMDB 搜索用片名（优先英文，否则中文）",
    "title_zh: 中文片名",
    "original_title: 英文片名（若有）",
    "platform/type: 固定为 磁力",
    "note: 发布说明 + 上传日期 + 体积 + 片源标签",
    "slug: 由英文片名生成；无英文时留空，后续 TMDB 同步再定",
    "",
  ];

  if (meta.issues.length) {
    lines.push("== 异常样本（最多 50 条）==");
    for (const issue of meta.issues.slice(0, 50)) {
      lines.push(`L${issue.lineNo} [${issue.type}] ${issue.text}`);
    }
    if (meta.issues.length > 50) {
      lines.push(`... 另有 ${meta.issues.length - 50} 条未列出`);
    }
    lines.push("");
  }

  writeFileSync(reportPath, `${lines.join("\n")}\n`, "utf8");
}

function writeIssuesCsv(issuesPath, reviewCsvPath, issues) {
  mkdirSync(dirname(issuesPath), { recursive: true });
  if (issues.length) {
    const lines = [
      "line_no,type,detail",
      ...issues.map((issue) => [issue.lineNo, issue.type, escapeCsv(issue.text)].join(",")),
    ];
    writeFileSync(issuesPath, `${lines.join("\n")}\n`, "utf8");
  }

  const reviewRows = issues.filter((issue) => issue.row).map((issue) => issue.row);
  if (!reviewRows.length) return;

  const header = ["title", "title_zh", "original_title", "year", "platform", "type", "note", "url", "slug"];
  const lines = [header.join(",")];
  for (const row of reviewRows) {
    lines.push(
      [row.title, row.titleZh, row.originalTitle, row.year, row.platform, row.type, row.note, row.url, row.slug]
        .map(escapeCsv)
        .join(","),
    );
  }
  writeFileSync(reviewCsvPath, `${lines.join("\n")}\n`, "utf8");
}

async function main() {
  const inputPath = process.argv[2] || DEFAULT_INPUT;
  const outputPath = process.argv[3] || DEFAULT_OUTPUT;
  const reportPath = process.argv[4] || DEFAULT_REPORT;
  const issuesPath = "data/import/clean-issues.csv";
  const reviewCsvPath = "data/import/movies-needs-review.csv";

  const { rows, issues, lineNo } = await parseTxt(inputPath);
  const { unique, duplicateCount } = dedupeRows(rows);

  const movieKeys = new Set(unique.map((row) => `${row.titleZh}\t${row.year}`));
  const chineseOnlyMovies = new Set(
    unique.filter((row) => !row.originalTitle).map((row) => `${row.titleZh}\t${row.year}`),
  );

  writeCsv(outputPath, unique);
  writeReport(reportPath, {
    inputPath,
    lineNo,
    parsedRows: rows.length,
    uniqueRows: unique.length,
    duplicateCount,
    uniqueMovies: movieKeys.size,
    chineseOnlyMovies: chineseOnlyMovies.size,
    issues,
  });
  writeIssuesCsv(issuesPath, reviewCsvPath, issues);

  const reviewCount = issues.filter((issue) => issue.row).length;

  console.log(`Cleaned ${unique.length} rows -> ${outputPath}`);
  console.log(`Report -> ${reportPath}`);
  console.log(`Unique movies: ${movieKeys.size}, issues: ${issues.length}, needs review: ${reviewCount}, duplicates removed: ${duplicateCount}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
