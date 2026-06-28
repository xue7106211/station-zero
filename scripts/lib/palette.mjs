/**
 * 【共享库】本地海报取色（node-vibrant）
 *
 * 供 legacy/sync-movies.mjs、legacy/extract-palettes.mjs、bulk-ingest/sync-movies-to-sql.mts 共用。
 * 仅对「已下载到 public/media/」的海报执行，前端只读落库色值。
 */
import { Vibrant } from 'node-vibrant/node';

// node-vibrant 的六个标准 swatch -> 落库字段名映射。
// 任一 swatch 都可能为 null（图中找不到对应色族），缺失时该字段省略。
const SWATCH_FIELDS = [
  ['Vibrant', 'vibrant'],
  ['DarkVibrant', 'darkVibrant'],
  ['LightVibrant', 'lightVibrant'],
  ['Muted', 'muted'],
  ['DarkMuted', 'darkMuted'],
  ['LightMuted', 'lightMuted'],
];

/**
 * 从本地图片文件提取调色板。
 *
 * @param {string} imagePath - 本地海报文件路径（如 public/media/posters/dune-part-two.jpg）
 * @returns {Promise<Record<string, string> | undefined>} 形如 { vibrant: "#f47e07", darkVibrant: "#8c1705", ... } 的色值对象；无任何可用 swatch 时返回 undefined
 */
export async function extractPalette(imagePath) {
  const palette = await Vibrant.from(imagePath).getPalette();
  const result = {};
  for (const [swatchKey, fieldKey] of SWATCH_FIELDS) {
    const hex = palette[swatchKey]?.hex;
    if (hex) result[fieldKey] = hex;
  }
  return Object.keys(result).length ? result : undefined;
}
