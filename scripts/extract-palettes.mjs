#!/usr/bin/env node
// 调色板回填脚本（后台专用，无需网络）。
//
// 读取 data/movies.json，对每部影片「已缓存到本站的本地海报」用 node-vibrant 取色，
// 把结果写回 palette 字段。适用于：海报早已同步、但库中还没有 palette 的历史数据补齐，
// 或想在不触网 TMDB 的情况下单独重算取色。
//
// 用法：node scripts/extract-palettes.mjs            # 仅补齐缺失 palette 的影片
//      node scripts/extract-palettes.mjs --force    # 强制对所有有本地海报的影片重新取色
//
// 与 sync-movies.mjs 的取色逻辑共用 scripts/palette.mjs，保证产出格式一致。

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { mergeMovieRecords, readMovieDatabase, writeMovieDatabase } from './movie-database.mjs';
import { extractPalette } from './palette.mjs';

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
