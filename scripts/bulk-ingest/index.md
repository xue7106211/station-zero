# bulk-ingest · 批量录入

> 父目录总览见 [../index.md](../index.md)。

## 流水线步骤

```
clean-import-txt  →  prepare-staging  →  resolve-tmdb-ids  →  sync-movies-to-sql
     (离线)              (SQL)               (TMDB)                (SQL+媒体)
```

## 各脚本职责

| 文件 | 一步做什么 |
|------|------------|
| `clean-import-txt.mjs` | 把站点导出的 TXT 洗成标准 CSV（片名/年份/磁力/备注） |
| `prepare-staging.mts` | CSV 每行写入 `import_staging`；`--limit-movies 100` 做 Pilot |
| `resolve-tmdb-ids.mts` | 按 `(title, year)` 调 TMDB 搜索，回写 `tmdb_id` 或标记 ambiguous |
| `resolve-ambiguous.mts` | 对 ambiguous 候选打分 + 中文片名复搜，自动或半自动消歧 |
| `resolve-failed.mts` | 对 failed 用 title_zh / 去 The / 年份 ±1 重搜 |
| `sync-movies-to-sql.mts` | 拉 TMDB 详情（含 `collection`、`keywords`）+ 磁力 → `movies`；w500 下载 → `compress-image` WebP → Storage；支持 `--tmdb-id` 单部重试 |
| `upload-media-to-storage.mts` | 将已有本地 `public/media/` 压缩后补传到 Storage 并回写 URL |
| `compress-image.mts` | sharp resize + WebP（被 sync / upload-media 引用） |
| `run-pilot-ingest.mts` | 上面 3 步一键跑（不含 TXT 清洗） |
| `shared.mts` | 公共工具，不要直接运行 |

操作手册与 Pilot 经验：[docs/technical/bulk-ingestion-runbook.md](../../docs/technical/bulk-ingestion-runbook.md)  
图片与 Storage：[docs/technical/movie-images.md](../../docs/technical/movie-images.md) · 文档总览：[docs/index.md](../../docs/index.md)

## 常用命令

```bash
# 一键 100 部 Pilot
npm run ingest:pilot

# 分步（同一 batch-id 串联）
npm run ingest:staging -- --limit-movies 100 --batch-id pilot-20260628
npm run ingest:resolve -- --batch-id pilot-20260628
npm run ingest:sync -- --batch-id pilot-20260628
npm run ingest:sync -- --batch-id pilot-20260628 --tmdb-id 1265609   # 单部重试
npm run ingest:sync -- --batch-id pilot-20260628 --publish            # 验收后上列表

# Pilot 直接上列表页
npm run ingest:pilot -- --publish
```

## 关键设计

- **staging 磁力优先**：`sync-movies-to-sql` 只写 CSV 里的链接，不用 TMDB 正版路径覆盖。
- **策展字段占位**：`verdict` / `bestWay` 等默认为「待人工补充」，后续可编辑。
- **默认 draft**：不加 `--publish` 时仅详情页可访问；列表页需 `content_status = published`。
