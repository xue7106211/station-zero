import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeMovieRecord, mergeMovieRecords, toPublicMediaPath } from '../scripts/lib/movie-database.mjs';

test('normalizeMovieRecord keeps stable local poster paths and timestamps', () => {
  const record = normalizeMovieRecord({
    slug: 'dune-part-two',
    title: '沙丘 2',
    originalTitle: 'Dune: Part Two',
    year: '2024',
    genres: ['科幻'],
    posterUrl: '/media/posters/dune-part-two.jpg',
  }, '2026-06-23T00:00:00.000Z');

  assert.equal(record.slug, 'dune-part-two');
  assert.equal(record.posterUrl, '/media/posters/dune-part-two.jpg');
  assert.equal(record.updatedAt, '2026-06-23T00:00:00.000Z');
  assert.equal(record.contentStatus, 'draft');
});

test('mergeMovieRecords upserts by slug and preserves existing createdAt', () => {
  const existing = [{ slug: 'old', title: 'Old', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' }];
  const merged = mergeMovieRecords(existing, [{ slug: 'old', title: 'New' }, { slug: 'fresh', title: 'Fresh' }], '2026-06-23T00:00:00.000Z');

  assert.equal(merged.length, 2);
  assert.equal(merged[0].title, 'New');
  assert.equal(merged[0].createdAt, '2026-01-01T00:00:00.000Z');
  assert.equal(merged[0].updatedAt, '2026-06-23T00:00:00.000Z');
  assert.equal(merged[1].slug, 'fresh');
});

test('toPublicMediaPath maps local media files to public URLs', () => {
  assert.equal(toPublicMediaPath('public/media/posters/inception.jpg'), '/media/posters/inception.jpg');
  assert.equal(toPublicMediaPath('/media/posters/inception.jpg'), '/media/posters/inception.jpg');
  assert.equal(toPublicMediaPath('public\\media\\posters\\inception.jpg'), '/media/posters/inception.jpg');
});
