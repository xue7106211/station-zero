---
title: 万级批量录入 — 数据库进度快照
type: runbook
status: active
updated: 2026-07-05
related:
  - technical/bulk-ingestion-runbook.md
  - technical/bulk-ingestion-checklist-v1.md
  - ../data/import/index.md
  - ../AGENTS.md
---

# 万级批量录入 — 数据库进度快照

> **用途**：记录 Supabase `movies` 入库进度与下一批接续参数，避免重复 staging 或漏算 offset。  
> **更新方式**：每完成一批 `ingest:sync` + `ingest:publish` 后，更新本文「当前快照」与「批次履历」表。  
> 操作细节见 [bulk-ingestion-runbook.md](./bulk-ingestion-runbook.md)。

## 当前快照（2026-07-05）

| 指标 | 数值 |
|------|------|
| `movies` 总行数 | **516** |
| `published`（列表/首页/搜索可见） | **515** |
| `draft` | **1**（legacy 手工录入遗留） |
| `viewing_paths` 行数 | 2,357 |
| `media_assets` 行数 | 1,025 |
| 源 CSV 唯一影片（已清洗） | 17,940 |
| **已 staging 唯一片（累计）** | **~500**（Pilot 100 + 扩展批 400） |
| **未 staging 估算** | **~17,440** |

### 来源构成

| 来源 | batch_id | 入库部数 | 状态 |
|------|----------|----------|------|
| Legacy（`movie-seeds.json` → `db:migrate:json`） | — | ~16 | 多为 published |
| Pilot | `pilot-20260628` | 101 sync | published |
| **第一批扩展** | `batch-20260705-001` | 399 sync / publish | published |

> Pilot 与扩展批在 `movies` 表按 `tmdb_id` / `slug` UPSERT，无 `batch_id` 字段；批次边界以 `import_staging.batch_id` 为准。

---

## 批次履历

### `pilot-20260628`（已完成）

| 项 | 值 |
|----|-----|
| staging | 643 行磁力，~100 唯一片 |
| resolve | 101 组 TMDB 唯一片，0 sync 失败 |
| 发布 | published |

### `batch-20260705-001`（已完成）

| 项 | 值 |
|----|-----|
| 参数 | `--offset-movies 100 --limit-movies 400` |
| staging | 1,703 行磁力，400 唯一片 |
| resolve | 399 / 400 部 resolved（见下「未入库」） |
| sync | 399 / 399 成功，`content_status: published` |
| 报告 | `data/import/staging-report.txt`、`sync-report.txt`、`publish-report.txt` |

#### 本批未入库（6 部，可选手工消歧后单独 sync）

| title | year | 状态 | 说明 |
|-------|------|------|------|
| The Solitary Gourmet SP | 2016 | ambiguous | 美食家 SP，TMDB 无可靠 movie 匹配 |
| Fat Girl | 2001 | ambiguous | 候选误匹配，需人工定 `tmdb_id` |
| Halo 4 Forward Unto Dawn | 2012 | failed | 实为剧集，movie 搜索无结果 |
| 光晕4：航向黎明号 | 2012 | failed | 同上（中文 title 重复行） |
| The Opening of Misty Beethoven | 1976 | failed | TMDB 无匹配 |
| Kodoku no Gurume | 2016 | failed | 孤独的美食家 SP，易与别集混淆 |

人工回写参考：`data/import/ambiguous-manual.csv`、`data/import/failed-manual.csv`。

---

## 下一批接续参数（batch-002）

CSV 头部顺序已消耗 **前 500 部**唯一片（Pilot 100 + offset 100 起 400 部）。下一批建议：

```powershell
$BATCH = "batch-20260706-002"   # 日期可按实际执行日改

npm run check:database
npm run check:tmdb
npm run check:storage

npm run ingest:staging -- --batch-id $BATCH --offset-movies 500 --limit-movies 500
npm run ingest:resolve -- --batch-id $BATCH
npm run ingest:resolve-ambiguous -- --batch-id $BATCH
npm run ingest:resolve-failed -- --batch-id $BATCH
# 处理 ambiguous-manual / failed-manual 后 apply-manual（若有）

npm run ingest:sync -- --batch-id $BATCH
# 抽检 draft 详情页后：
npm run ingest:publish -- --batch-id $BATCH
```

| 参数 | 建议值 | 说明 |
|------|--------|------|
| `--offset-movies` | **500** | 跳过已 staging 的 500 唯一片 |
| `--limit-movies` | **500** | 每批 500，与 checklist Phase 5 一致 |
| 预期库内总量 | ~516 + ~490–500 | 视消歧失败数略少 |

---

## 工程能力（本阶段已落地）

| 能力 | 命令 / 说明 |
|------|-------------|
| CSV 偏移 | `prepare-staging --offset-movies N` |
| 仅发布、不重 sync | `npm run ingest:publish -- --batch-id <batch>` |
| resolve / sync 单 DB 会话 | 避免 Supabase pooler 中途断连 |
| 单部 sync 重试 | `ingest:sync -- --batch-id <batch> --tmdb-id <id>` |

勿用 `ingest:sync --publish` 做日常发布（会整批重拉 TMDB + 海报，约 30 分钟）；验收后用 **`ingest:publish`**。

---

## 阶段目标对照

| 阶段 | 目标 | 当前 |
|------|------|------|
| Pilot | ~100 | ✅ 101 |
| 第一批扩展 | +400 → ~500 | ✅ 516 在库 |
| 稳态扩库 | ~2,000 | 待续（下一批 offset 500） |
| 全量 | 1 万+ | 源数据 17,940 部待录入 |

---

## 相关文件

| 路径 | 内容 |
|------|------|
| `data/import/movies-clean.csv` | 清洗后主 CSV（不进 Git） |
| `data/import/clean-report.txt` | 源 TXT 清洗统计 |
| `data/import/index.md` | 导入目录与 Git 策略 |
| `data/import/*-report.txt` | 各步最新报告摘要 |

**验证库内计数：**

```bash
npm run check:database
```
