#!/usr/bin/env node
// 同步影视资源数据脚本

import { createHash } from 'node:crypto'; // 计算图片字节的 SHA-1 短指纹（取前 8 位），仅用于日志标识缓存版本，非安全用途
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mergeMovieRecords, readMovieDatabase, toPublicMediaPath, writeMovieDatabase } from './movie-database.mjs';
import { extractPalette } from './palette.mjs'; // 基于 node-vibrant 从本地海报取色

const execFileAsync = promisify(execFile);
const databasePath = process.env.MOVIE_DATABASE_PATH || 'data/movies.json';
const seedPath = process.env.MOVIE_SEED_PATH || 'data/movie-seeds.json';
const posterDir = process.env.MOVIE_POSTER_DIR || 'public/media/posters';
const backdropDir = process.env.MOVIE_BACKDROP_DIR || 'public/media/backdrops';
const imageBase = process.env.TMDB_IMAGE_BASE_URL || 'https://image.tmdb.org/t/p/w780';
const apiBase = clean(process.env.TMDB_API_BASE_URL) || 'https://api.themoviedb.org/3';
const token = clean(process.env.TMDB_READ_ACCESS_TOKEN).replace(/^Bearer\s+/i, '').trim();
const apiKey = clean(process.env.TMDB_API_KEY);
const curlFallback = clean(process.env.TMDB_CURL_FALLBACK).toLowerCase() !== 'false';
const now = new Date().toISOString();

if (!existsSync(seedPath)) {
  console.error(`Missing seed file: ${seedPath}`);
  process.exit(1);
}

const seeds = JSON.parse(readFileSync(seedPath, 'utf8'));
if (!Array.isArray(seeds) || seeds.length === 0) {
  console.error(`Seed file must contain a non-empty array: ${seedPath}`);
  process.exit(1);
}

if (!token && !apiKey) {
  console.error('Missing TMDB_READ_ACCESS_TOKEN or TMDB_API_KEY. Add one to .env.local before syncing.');
  process.exit(1);
}

mkdirSync(posterDir, { recursive: true });
mkdirSync(backdropDir, { recursive: true });

const incomingRecords = [];

for (const seed of seeds) {
  try {
    const tmdbId = seed.tmdbId ?? await findTmdbId(seed.query ?? seed.originalTitle ?? seed.title ?? seed.slug);
    const details = await tmdbFetch(`/movie/${tmdbId}?language=zh-CN&append_to_response=credits,watch/providers`);
    const record = await mapTmdbMovie(details, seed);
    incomingRecords.push(record);
    console.log(`Synced ${record.slug}`);
  } catch (error) {
    console.error(`Failed to sync ${seed.slug ?? seed.title ?? seed.tmdbId}: ${formatError(error)}`);
  }
}

if (!incomingRecords.length) {
  console.error('No movies synced. Database was not changed.');
  process.exit(1);
}

const database = readMovieDatabase(databasePath);
const movies = mergeMovieRecords(database.movies, incomingRecords, now);
writeMovieDatabase(databasePath, movies, now);
console.log(`Updated ${databasePath} with ${incomingRecords.length} movie(s).`);

async function findTmdbId(query) {
  if (!query) throw new Error('Seed requires tmdbId or query/title.');
  const search = await tmdbFetch(`/search/movie?query=${encodeURIComponent(query)}&language=zh-CN&page=1`);
  const first = search.results?.[0];
  if (!first) throw new Error(`No TMDB result for ${query}.`);
  return first.id;
}

async function mapTmdbMovie(movie, seed) {
  const title = movie.title || movie.original_title || seed.title || seed.slug;
  const originalTitle = movie.original_title || title;
  const slug = seed.slug || slugify(originalTitle);
  const director = movie.credits?.crew?.find((member) => member.job === 'Director')?.name ?? seed.director;
  const cast = movie.credits?.cast?.slice(0, 5).map((member) => member.name).filter(Boolean);
  const providers = movie['watch/providers']?.results?.CN;
  const sourcePosterUrl = movie.poster_path ? `${imageBase}${movie.poster_path}` : undefined;
  const sourceBackdropUrl = movie.backdrop_path ? `${imageBase}${movie.backdrop_path}` : undefined;
  // 先拿到海报的本地文件路径，再分别用于：1) 转成公开静态路径 posterUrl；2) 本地取色 palette
  const posterFile = sourcePosterUrl ? await downloadImage(sourcePosterUrl, posterDir, slug, 'poster') : undefined;
  const posterUrl = posterFile ? toPublicMediaPath(posterFile) : seed.posterUrl;
  const backdropUrl = sourceBackdropUrl ? toPublicMediaPath(await downloadImage(sourceBackdropUrl, backdropDir, slug, 'backdrop')) : seed.backdropUrl;
  // 调色板：对刚下载的本地海报取色；取色失败不应中断整条同步，降级为种子里的 palette（若有）
  const palette = posterFile ? await safeExtractPalette(posterFile, slug) : seed.palette;

  return {
    ...seed,
    slug,
    tmdbId: movie.id,
    title,
    originalTitle,
    year: movie.release_date?.slice(0, 4) || seed.year,
    genres: movie.genres?.map((genre) => genre.name).filter(Boolean) || seed.genres,
    director,
    cast: cast?.length ? cast : seed.cast,
    runtime: movie.runtime ? `${movie.runtime} 分钟` : seed.runtime,
    rating: typeof movie.vote_average === 'number' ? `${movie.vote_average.toFixed(1)} / 10` : seed.rating,
    ratings: {
      douban: seed.ratings?.douban ?? '待补充',
      imdb: typeof movie.vote_average === 'number' ? movie.vote_average.toFixed(1) : seed.ratings?.imdb ?? '待确认',
      rottenTomatoes: seed.ratings?.rottenTomatoes ?? '待补充',
    },
    posterUrl,
    backdropUrl,
    sourcePosterUrl,
    sourceBackdropUrl,
    palette,
    summary: movie.overview || seed.summary,
    viewingPaths: seed.viewingPaths?.length ? seed.viewingPaths : mapProviders(providers),
    versionSignals: seed.versionSignals?.length ? seed.versionSignals : [
      { label: '4K', value: '需以平台和发行版本标识为准', verdict: '待确认' },
      { label: 'HDR', value: '需以平台和设备支持为准', verdict: '待确认' },
      { label: 'Blu-ray', value: '可继续补充实体发行信息', verdict: '待确认' },
      { label: '流媒体', value: '可补充画质与码率判断', verdict: '待确认' },
    ],
    contentStatus: seed.contentStatus ?? 'draft',
    sourceProvider: 'tmdb',
    sourceUpdatedAt: now,
    imageCachedAt: posterUrl || backdropUrl ? now : seed.imageCachedAt,
  };
}

async function safeExtractPalette(posterFile, slug) {
  try {
    const palette = await extractPalette(posterFile);
    if (palette) console.log(`Palette ${slug}: ${Object.values(palette).join(' ')}`);
    return palette;
  } catch (error) {
    console.warn(`Palette extraction failed for ${slug}: ${formatError(error)}`);
    return undefined;
  }
}

async function downloadImage(url, outputDir, slug, kind) {
  const extension = imageExtension(url);
  const filePath = join(outputDir, `${slug}.${extension}`);
  const response = await fetch(url);

  if (!response.ok) {
    if (!curlFallback) throw new Error(`Image request failed: ${response.status} ${url}`);
    await curlDownload(url, filePath);
    return filePath;
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  writeFileSync(filePath, bytes);
  const digest = createHash('sha1').update(bytes).digest('hex').slice(0, 8);
  console.log(`Cached ${kind} ${basename(filePath)} (${Math.round(bytes.length / 1024)}KB, ${digest})`);
  return filePath;
}

async function curlDownload(url, filePath) {
  await execFileAsync('curl', ['--silent', '--show-error', '--fail', '--location', '--max-time', clean(process.env.TMDB_CURL_TIMEOUT) || '20', '--output', filePath, url]);
}

async function tmdbFetch(path) {
  const separator = path.includes('?') ? '&' : '?';
  const url = `${apiBase}${path}${apiKey && !token ? `${separator}api_key=${encodeURIComponent(apiKey)}` : ''}`;
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

  try {
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error(`TMDB request failed: ${response.status}`);
    return response.json();
  } catch (error) {
    if (!curlFallback) throw error;
    return curlFetchJson(url, token, error);
  }
}

async function curlFetchJson(url, bearerToken, originalError) {
  const args = ['--silent', '--show-error', '--fail', '--location', '--max-time', clean(process.env.TMDB_CURL_TIMEOUT) || '12'];
  if (bearerToken) args.push('--header', `Authorization: Bearer ${bearerToken}`);
  args.push(url);

  try {
    const { stdout } = await execFileAsync('curl', args, { maxBuffer: 1024 * 1024 * 4 });
    return JSON.parse(stdout);
  } catch (error) {
    throw new Error(`TMDB curl fallback failed after fetch failed. fetch=${formatError(originalError)} curl=${formatError(error)}`);
  }
}

function mapProviders(providers) {
  if (!providers) return [{ platform: 'TMDB Watch Providers', type: '资料来源', note: '暂无可用平台数据，需人工补充地区可用性' }];
  const paths = [];
  const link = providers.link;
  providers.flatrate?.slice(0, 2).forEach((provider) => paths.push({ platform: provider.provider_name, type: '订阅', note: '平台可用性以实时地区结果为准', url: link }));
  providers.rent?.slice(0, 2).forEach((provider) => paths.push({ platform: provider.provider_name, type: '租赁/购买', note: '租赁信息以平台实时结果为准', url: link }));
  providers.buy?.slice(0, 2).forEach((provider) => paths.push({ platform: provider.provider_name, type: '租赁/购买', note: '购买信息以平台实时结果为准', url: link }));
  return paths.length ? paths.slice(0, 4) : [{ platform: 'TMDB Watch Providers', type: '资料来源', note: '暂无订阅、租赁或购买数据', url: link }];
}

function imageExtension(url) {
  const extension = extname(new URL(url).pathname).replace('.', '').toLowerCase();
  return ['jpg', 'jpeg', 'png', 'webp', 'avif'].includes(extension) ? extension : 'jpg';
}

function slugify(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function clean(value = '') {
  return String(value).trim().replace(/^['"]|['"]$/g, '').trim();
}

function formatError(error) {
  return error instanceof Error ? error.message.replaceAll(token, '[redacted-token]').replaceAll(apiKey, '[redacted-api-key]') : String(error);
}
