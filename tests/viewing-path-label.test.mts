import test from "node:test";
import assert from "node:assert/strict";
import {
  formatProviderRow,
  stripReleaseWatermark,
} from "../src/lib/viewing-path-label";
import type { ViewingPath } from "../src/lib/content";

const bulkMagnetNote =
  "【高清影视之家发布 www.HDBTHD.com】错位[国语音轨简繁英字幕].Dislocation.1986.1080p.BluRay.x265.10bit.FLAC.1.0-SONYHD | 2024-04-09 | 片源标签: 国语音轨+简繁英字幕, 国语音轨简繁英字幕";

test("stripReleaseWatermark removes HDBTHD release brackets", () => {
  assert.equal(
    stripReleaseWatermark(
      "【高清影视之家发布 www.HDBTHD.com】错位.Dislocation.1986.1080p",
    ),
    "错位.Dislocation.1986.1080p",
  );
});

test("formatProviderRow omits redundant 磁力 prefix inside magnet accordion", () => {
  const path: ViewingPath = {
    platform: "磁力",
    type: "磁力",
    note: bulkMagnetNote,
    url: "magnet:?xt=urn:btih:example",
  };

  const { label, sizeLabel } = formatProviderRow(path, "错位");

  assert.equal(sizeLabel, undefined);
  assert.ok(!label.startsWith("磁力"));
  assert.ok(!label.includes("高清影视之家发布"));
  assert.ok(label.includes("错位[国语音轨简繁英字幕].Dislocation.1986"));
  assert.ok(label.includes("2024-04-09"));
});

test("formatProviderRow keeps curated note for legacy 高清影视之家 platform", () => {
  const path: ViewingPath = {
    platform: "高清影视之家",
    type: "磁力",
    note: "1080p AMZN WEB-DL H.264 DDP5.1 · 5.29GB · 简繁英字幕 · 2026-03-13",
    url: "magnet:?xt=urn:btih:example",
  };

  const { label, sizeLabel } = formatProviderRow(path, "Playdate");

  assert.equal(sizeLabel, "5.29GB");
  assert.equal(
    label,
    "1080p AMZN WEB-DL H.264 DDP5.1 · 简繁英字幕 · 2026-03-13",
  );
  assert.ok(!label.includes("高清影视之家"));
});

test("formatProviderRow still prefixes distinctive platform for non-magnet types", () => {
  const path: ViewingPath = {
    platform: "Netflix",
    type: "订阅",
    note: "4K · 杜比视界",
  };

  const { label } = formatProviderRow(path, "错位");

  assert.equal(label, "Netflix · 4K · 杜比视界");
});
