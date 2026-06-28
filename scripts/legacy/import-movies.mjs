#!/usr/bin/env node
/**
 * 【单部 / 少量录入 · 文件库】合并外部 JSON 到 data/movies.json
 *
 * 作用：把人工整理好的影片 JSON 片段合并进现有 movies.json（按 slug 去重合并）。
 *
 * npm run import:movies -- path/to/movies.json
 *
 * 常与 sync:movies 配合：先 import 策展字段，再 sync 补 TMDB 与图片。
 */
import { readFileSync } from 'node:fs';
import { mergeMovieRecords, readMovieDatabase, writeMovieDatabase } from '../lib/movie-database.mjs';

const databasePath = process.env.MOVIE_DATABASE_PATH || 'data/movies.json';
const importPath = process.argv[2];
const now = new Date().toISOString();

if (!importPath) {
  console.error('Usage: npm run import:movies -- path/to/movies.json');
  process.exit(1);
}

const incoming = JSON.parse(readFileSync(importPath, 'utf8'));
const records = Array.isArray(incoming) ? incoming : incoming.movies;

if (!Array.isArray(records) || records.length === 0) {
  console.error('Import file must be an array or an object with a non-empty movies array.');
  process.exit(1);
}

const database = readMovieDatabase(databasePath);
const movies = mergeMovieRecords(database.movies, records, now);
writeMovieDatabase(databasePath, movies, now);
console.log(`Imported ${records.length} movie(s) into ${databasePath}.`);
