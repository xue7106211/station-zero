import test from "node:test";
import assert from "node:assert/strict";
import {
  formatProviderRow,
  MAX_PROVIDER_ROW_TAGS,
  stripReleaseWatermark,
} from "../src/lib/viewing-path-label";
import type { ViewingPath } from "../src/lib/content";

const bulkMagnetNote =
  "【高清影视之家发布 www.HDBTHD.com】错位[国语音轨简繁英字幕].Dislocation.1986.1080p.BluRay.x265.10bit.FLAC.1.0-SONYHD | 2024-04-09 | 片源标签: 国语音轨+简繁英字幕, 国语音轨简繁英字幕";

const shroudsMagnetNote =
  "裹尸布[简繁英字幕].The.Shrouds.2024.BluRay.1080p.x265.10bit.DDP5.1-SSDSSE | 2026-03-13 · 4.92GB | 片源标签: 简繁英字幕";

test("stripReleaseWatermark removes HDBTHD release brackets", () => {
  assert.equal(
    stripReleaseWatermark(
      "【高清影视之家发布 www.HDBTHD.com】错位.Dislocation.1986.1080p",
    ),
    "错位.Dislocation.1986.1080p",
  );
});

test("formatProviderRow keeps original release line in detail and extracts uploadDate", () => {
  const path: ViewingPath = {
    platform: "磁力",
    type: "磁力",
    note: shroudsMagnetNote,
    url: "magnet:?xt=urn:btih:example",
  };

  const result = formatProviderRow(path, "裹尸布");

  assert.equal(result.sizeLabel, "4.92GB");
  assert.equal(result.uploadDate, "2026-03-13");
  assert.equal(
    result.detail,
    "裹尸布[简繁英字幕].The.Shrouds.2024.BluRay.1080p.x265.10bit.DDP5.1-SSDSSE",
  );
  assert.deepEqual(result.specTags, ["1080p", "BluRay", "DDP5.1", "简繁英字幕"]);
  assert.ok(!result.detail.includes("2026-03-13"));
  assert.ok(result.tooltip?.includes("The.Shrouds.2024"));
  assert.ok(!result.detail.includes("片源标签"));
});

test("formatProviderRow omits redundant source tags and watermarks", () => {
  const path: ViewingPath = {
    platform: "磁力",
    type: "磁力",
    note: bulkMagnetNote,
    url: "magnet:?xt=urn:btih:example",
  };

  const result = formatProviderRow(path, "错位");

  assert.equal(result.sizeLabel, undefined);
  assert.equal(result.uploadDate, "2024-04-09");
  assert.ok(result.detail.includes("错位[国语音轨简繁英字幕].Dislocation.1986"));
  assert.ok(!result.detail.includes("2024-04-09"));
  assert.deepEqual(result.specTags, [
    "1080p",
    "BluRay",
    "FLAC 1.0",
    "国语音轨简繁英字幕",
  ]);
  assert.ok(!result.detail.includes("高清影视之家发布"));
  assert.ok(!result.detail.includes("片源标签"));
});

test("formatProviderRow limits spec tags when size chip is present", () => {
  const path: ViewingPath = {
    platform: "高清影视之家",
    type: "磁力",
    note: "1080p AMZN WEB-DL H.264 DDP5.1 · 5.29GB · 简繁英字幕 · 2026-03-13",
    url: "magnet:?xt=urn:btih:example",
  };

  const result = formatProviderRow(path, "Playdate");

  assert.equal(result.sizeLabel, "5.29GB");
  assert.equal(result.uploadDate, "2026-03-13");
  assert.equal(
    result.detail,
    "1080p AMZN WEB-DL H.264 DDP5.1 · 简繁英字幕",
  );
  assert.deepEqual(result.specTags, ["1080p", "AMZN", "WEB-DL", "DDP5.1"]);
  assert.equal(
    result.specTags!.length + 1,
    MAX_PROVIDER_ROW_TAGS,
  );
  assert.ok(!result.detail.includes("高清影视之家"));
});

test("formatProviderRow still prefixes distinctive platform for non-magnet types", () => {
  const path: ViewingPath = {
    platform: "Netflix",
    type: "订阅",
    note: "4K · 杜比视界",
  };

  const result = formatProviderRow(path, "错位");

  assert.equal(result.detail, "Netflix · 4K · 杜比视界");
  assert.equal(result.uploadDate, undefined);
  assert.equal(result.specTags, undefined);
});
