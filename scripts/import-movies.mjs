#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { mergeMovieRecords, readMovieDatabase, writeMovieDatabase } from './movie-database.mjs';

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
