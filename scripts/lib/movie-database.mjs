/**
 * 【共享库】data/movies.json 读写与记录合并
 *
 * 供 legacy/ 下文件型 MVP 脚本使用：sync-movies、import-movies、extract-palettes。
 * bulk-ingest 的 SQL 同步不经过本模块。
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, relative } from 'node:path';

export const MOVIE_DATABASE_VERSION = 1;

export function readMovieDatabase(filePath) {
  if (!existsSync(filePath)) {
    return { version: MOVIE_DATABASE_VERSION, updatedAt: null, movies: [] };
  }

  const database = JSON.parse(readFileSync(filePath, 'utf8'));
  return {
    version: database.version ?? MOVIE_DATABASE_VERSION,
    updatedAt: database.updatedAt ?? null,
    movies: Array.isArray(database.movies) ? database.movies : [],
  };
}

export function writeMovieDatabase(filePath, movies, now = new Date().toISOString()) {
  mkdirSync(dirname(filePath), { recursive: true });
  const payload = {
    version: MOVIE_DATABASE_VERSION,
    updatedAt: now,
    movies,
  };
  const tempPath = `${filePath}.tmp`;
  writeFileSync(tempPath, `${JSON.stringify(payload, null, 2)}\n`);
  renameSync(tempPath, filePath);
  return payload;
}

export function mergeMovieRecords(existingRecords, incomingRecords, now = new Date().toISOString()) {
  const existingBySlug = new Map(existingRecords.map((record) => [record.slug, record]));
  const mergedBySlug = new Map(existingRecords.map((record) => [record.slug, normalizeMovieRecord(record, record.updatedAt ?? now)]));

  for (const incomingRecord of incomingRecords) {
    const existing = existingBySlug.get(incomingRecord.slug);
    mergedBySlug.set(
      incomingRecord.slug,
      normalizeMovieRecord(
        {
          ...existing,
          ...incomingRecord,
          createdAt: existing?.createdAt ?? incomingRecord.createdAt ?? now,
        },
        now,
      ),
    );
  }

  return [...mergedBySlug.values()].sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
}

export function normalizeMovieRecord(record, now = new Date().toISOString()) {
  if (!record.slug) {
    throw new Error('Movie record requires slug.');
  }

  return removeUndefined({
    slug: record.slug,
    tmdbId: record.tmdbId,
    title: record.title ?? record.originalTitle ?? record.slug,
    originalTitle: record.originalTitle ?? record.title ?? record.slug,
    year: String(record.year ?? '年份待确认'),
    genres: normalizeStringArray(record.genres, ['类型待确认']),
    director: record.director ?? '导演待确认',
    cast: normalizeStringArray(record.cast, ['演员待确认']),
    runtime: record.runtime ?? '片长待确认',
    writers: record.writers,
    countries: record.countries,
    languages: record.languages,
    releaseDate: record.releaseDate,
    aka: record.aka,
    rating: record.rating ?? '评分待确认',
    ratings: record.ratings,
    posterTone: record.posterTone ?? 'from-slate-600 via-zinc-800 to-black',
    posterUrl: record.posterUrl,
    backdropUrl: record.backdropUrl,
    sourcePosterUrl: record.sourcePosterUrl,
    sourceBackdropUrl: record.sourceBackdropUrl,
    palette: record.palette,
    summary: record.summary ?? '简介待补充。',
    verdict: record.verdict ?? '适合纳入观影决策',
    bestWay: record.bestWay ?? '优先确认正版平台、4K / HDR 标识和发行版本',
    idealScene: record.idealScene ?? '适合根据设备与片源规格选择观看方式',
    notFor: record.notFor ?? '不适合只看标题就决定版本的场景',
    viewingPaths: normalizeArray(record.viewingPaths),
    versionSignals: normalizeArray(record.versionSignals),
    deviceAdvice: normalizeStringArray(record.deviceAdvice, ['先确认片源规格', '大屏观看前检查 HDR 标识']),
    related: normalizeStringArray(record.related, []),
    contentStatus: record.contentStatus ?? 'draft',
    sourceProvider: record.sourceProvider ?? 'manual',
    sourceUpdatedAt: record.sourceUpdatedAt ?? now,
    imageCachedAt: record.imageCachedAt,
    createdAt: record.createdAt ?? now,
    updatedAt: now,
  });
}

export function toPublicMediaPath(filePath) {
  if (!filePath) return undefined;
  const normalized = String(filePath).replace(/\\/g, '/');
  if (normalized.startsWith('/')) return normalized;
  const publicRelative = relative('public', normalized).replace(/\\/g, '/');
  return publicRelative.startsWith('..') ? normalized : `/${publicRelative}`;
}

function normalizeStringArray(value, fallback) {
  if (!Array.isArray(value)) return fallback;
  const cleaned = value.map((item) => String(item).trim()).filter(Boolean);
  return cleaned.length ? cleaned : fallback;
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function removeUndefined(value) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
}
