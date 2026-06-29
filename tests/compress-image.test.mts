import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import sharp from "sharp";
import {
  buildWebpOutputPath,
  compressPosterToWebp,
  readImageCompressConfig,
} from "../scripts/bulk-ingest/compress-image.mts";

test("readImageCompressConfig returns poster and backdrop presets", () => {
  const config = readImageCompressConfig();
  assert.equal(config.poster.maxWidth, 480);
  assert.equal(config.poster.quality, 78);
  assert.equal(config.backdrop.maxWidth, 1280);
  assert.equal(config.backdrop.quality, 72);
});

test("compressPosterToWebp writes smaller webp output", async () => {
  const tempDir = mkdtempSync(join(tmpdir(), "sz-compress-"));
  const slug = "fixture-poster";

  try {
    const inputPath = join(tempDir, `${slug}.png`);
    const inputBytes = await sharp({
      create: {
        width: 800,
        height: 1200,
        channels: 3,
        background: { r: 120, g: 80, b: 200 },
      },
    })
      .png()
      .toBuffer();

    mkdirSync(tempDir, { recursive: true });
    const { writeFileSync } = await import("node:fs");
    writeFileSync(inputPath, inputBytes);

    const outputPath = await compressPosterToWebp(inputPath, tempDir, slug);

    assert.equal(outputPath, buildWebpOutputPath(tempDir, slug));
    assert.match(outputPath, /\.webp$/);

    const outputBytes = readFileSync(outputPath);
    assert.ok(outputBytes.length < inputBytes.length);
    assert.ok(outputBytes[0] === 0x52 && outputBytes[1] === 0x49); // RIFF (WebP container)
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});
