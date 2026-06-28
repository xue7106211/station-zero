#!/usr/bin/env node
/**
 * 【单部 / 少量录入 · 文件库】离线海报取色 → data/movies.json
 *
 * 读取 data/movies.json，对已本地化海报用 node-vibrant 提取 palette 并回写。
 * 不访问 TMDB，适合海报已有、仅补色板的场景。
 *
 * npm run extract:palettes
 * npm run extract:palettes -- --force   # 强制全部重算
 *
 * 与 legacy/sync-movies.mjs 共用 scripts/lib/palette.mjs。
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { mergeMovieRecords, readMovieDatabase, writeMovieDatabase } from '../lib/movie-database.mjs';
import { extractPalette } from '../lib/palette.mjs';

const databasePath = process.env.MOVIE_DATABASE_PATH || 'data/movies.json';
const publicDir = process.env.PUBLIC_DIR || 'public';
const force = process.argv.includes('--force');
const now = new Date().toISOString();

const database = readMovieDatabase(databasePath);
if (!database.movies.length) {
  console.error(`No movies in ${databasePath}. Run sync first.`);
  process.exit(1);
}

const updates = [];

for (const movie of database.movies) {
  // posterUrl 是站点公开路径（如 /media/posters/<slug>.jpg），本地文件位于 public 目录下
  if (!movie.posterUrl) {
    console.warn(`Skip ${movie.slug}: no posterUrl.`);
    continue;
  }
  if (movie.palette && !force) {
    console.log(`Skip ${movie.slug}: palette exists (use --force to recompute).`);
    continue;
  }

  const localPoster = join(publicDir, movie.posterUrl);
  if (!existsSync(localPoster)) {
    console.warn(`Skip ${movie.slug}: local poster not found at ${localPoster}.`);
    continue;
  }

  try {
    const palette = await extractPalette(localPoster);
    if (!palette) {
      console.warn(`Skip ${movie.slug}: no swatches extracted.`);
      continue;
    }
    updates.push({ slug: movie.slug, palette });
    console.log(`Palette ${movie.slug}: ${Object.values(palette).join(' ')}`);
  } catch (error) {
    console.error(`Failed ${movie.slug}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (!updates.length) {
  console.log('No palettes updated.');
  process.exit(0);
}

// 复用 mergeMovieRecords：以 slug 为键把 palette 合并进既有记录，其余字段保持不变
const movies = mergeMovieRecords(database.movies, updates, now);
writeMovieDatabase(databasePath, movies, now);
console.log(`Updated ${databasePath} with ${updates.length} palette(s).`);
