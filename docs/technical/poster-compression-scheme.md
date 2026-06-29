---
title: Supabase 海报体积优化方案
type: architecture
status: active
updated: 2026-06-29
related:
  - technical/movie-images.md
  - technical/bulk-ingestion-scheme.md
  - technical/bulk-ingestion-runbook.md
  - technical/cdn-origin-setup.md
---

# Supabase 海报体积优化方案

> 本文档沉淀 Station Zero 在 Supabase Storage 已存 100+ 部影片海报、单张约 **200KB** 背景下的体积优化决策与实施路径。图片 URL 策略与前端原则仍以 [movie-images.md](./movie-images.md) 为准。**bulk-ingest 新入库已接入 w500 + 480px WebP**；存量迁移与 legacy `sync:movies` 对齐见下文决策记录。

## 背景与问题

### 现状

| 项目 | 当前值 |
|------|--------|
| 已入库影片 | 100+（Pilot / bulk-ingest） |
| Storage 单张海报体积 | 约 **150–250KB**（典型 ~200KB） |
| TMDB 拉取尺寸 | 默认 **`w780`**（宽 780px JPEG） |
| 入库处理 | 下载 → 原样上传 Supabase（**无压缩**） |
| 页面展示宽度 | 列表卡片约 **150–220px**；详情页 `sizes="230px"` |
| 前端交付 | `next/image` 默认开启优化（`unoptimized: false`） |

关键脚本与配置：

- `scripts/bulk-ingest/sync-movies-to-sql.mts` — `TMDB_IMAGE_BASE_URL` 默认 `w780`
- `scripts/legacy/sync-movies.mjs` — 同上
- `scripts/bulk-ingest/storage-media.mts` — 原文件 `readFileSync` 后 `x-upsert` 上传
- `scripts/bulk-ingest/upload-media-to-storage.mts` — 补传本地 → Storage
- `src/db/schema.ts` — `media_assets.byte_size` 已记录体积
- `next.config.ts` — `remotePatterns` 含 `*.supabase.co`；开发可 `NEXT_IMAGE_UNOPTIMIZED=true`

### 问题陈述

1. **Storage 存的是「展示尺寸的 3–5 倍」大图**，万级规模时带宽、存储与同步成本线性放大。
2. **竞品同类海报约 20–30KB**（见 [movie-images.md](./movie-images.md) 竞品观察），差距主要来自 **入库时按展示尺寸导出**，而非 CDN 本身。
3. **开发环境**若开启 `NEXT_IMAGE_UNOPTIMIZED=true`，浏览器会直连 200KB 原图，列表滚动体感明显变差。
4. [movie-images.md](./movie-images.md) § 图片处理建议 已写明「海报统一 480/640px、WebP/AVIF」，**工程侧尚未落地**。

### 非目标（本方案不做）

- 不改变「外部 API 仅后台同步、前端只读本站 URL」架构原则
- 不引入页面实时 TMDB 图片链路
- 不在本阶段强制上线 CDN 图片变换（Cloudflare Images 等）
- 不拆分列表/详情双尺寸资产（可作为二期）

---

## 目标

| 指标 | 目标值 | 说明 |
|------|--------|------|
| Storage 单张海报（P50） | **30–50KB** | 对齐竞品量级，允许详情略糊容忍度内 |
| Storage 单张海报（P95） | **< 80KB** | 复杂海报可略大 |
| 100 部存量总海报体积 | **~3–5MB**（现 ~20MB） | 粗算，不含 backdrop |
| 视觉验收 | 列表 + 详情肉眼无明显糊边 | 以 230px 宽详情容器为准 |
| 色板 `palette` | 压缩后仍可提取 | `extractPalette` 读本地/处理后的文件 |
| 新片入库 | 默认走压缩管线 | 避免存量优化后新数据反弹 |

---

## 方案对比

### 方案 A：仅降低 TMDB 源尺寸

将 `TMDB_IMAGE_BASE_URL` 从 `w780` 改为 `w500` 或 `w342`，重跑同步。

| 维度 | 评价 |
|------|------|
| 预期体积 | 单张约 **80–120KB** |
| 改动量 | 极小（环境变量 + 批量重同步） |
| 能否达 30KB | 难 |
| 风险 | 低 |

**结论：** 可作为 **Step 0 快速验证**，不宜作为终态。

---

### 方案 B：入库压缩 + WebP（推荐）

在下载 TMDB 后、上传 Storage 前增加处理步骤：

```txt
TMDB（w500 或 w342）
    ↓
sharp：宽度上限 + WebP 编码
    ↓
本地临时文件 / public/media/
    ↓
上传 Supabase（posters/{slug}.webp）
    ↓
更新 movies.poster_url、media_assets
```

**推荐参数（海报）：**

| 参数 | 建议值 | 备注 |
|------|--------|------|
| 源尺寸 | `w500` | 比 `w342` 留一点裁切余量 |
| 输出最大宽度 | **480px** | 与 `movie-images.md` 一致 |
| 格式 | **WebP** | 浏览器支持足够；AVIF 可作为二期 |
| 质量 | **75–80** | Pilot 时用 5 部肉眼调参 |
| 输出路径 | `posters/{slug}.webp` | 扩展名变化需更新 DB |

**背景图（backdrop）单独规则：**

| 参数 | 建议值 |
|------|--------|
| 源尺寸 | TMDB `w1280` |
| 输出最大宽度 | **1280–1600px** |
| 格式 | WebP，质量 **70–75** |

| 维度 | 评价 |
|------|------|
| 预期体积 | 海报 **25–50KB** |
| 改动量 | 中（依赖 `sharp`、改 sync/upload、存量迁移脚本） |
| 与竞品对齐 | 是 |
| 风险 | 中低（需 Pilot + DB URL 更新） |

**结论：** **推荐作为终态方案**。

---

### 方案 C：仅依赖 Next.js `image` 优化

保持 Storage 200KB，`unoptimized: false` 由 `/_next/image` 按需缩放。

| 维度 | 评价 |
|------|------|
| 用户下载体积 | 可能已 **30–60KB** |
| Storage 体积 | **不变** |
| 开发 `unoptimized` 场景 | **仍慢** |
| 万级 Storage 成本 | **差 5–7 倍** |

**结论：** 可作为 **短期不迁移存量** 的权宜之计，**不替代方案 B**。

---

### 方案 D：CDN 边缘图片变换

Storage 存主文件，由 `media.station-zero.com` 侧按参数出图（宽度/格式/质量）。

| 维度 | 评价 |
|------|------|
| 灵活性 | 高（一套源图多尺寸） |
| 复杂度 | 高（依赖 CDN 产品能力与计费） |
| 100+ 阶段必要性 | 低 |

**结论：** 与 [cdn-origin-setup.md](./cdn-origin-setup.md) 一并评估，**建议在方案 B 落地后再考虑**。

---

## 推荐路径

采用 **「B 为主 + 生产保留 Next 优化」** 的组合：

```txt
                    ┌─────────────────────────────────────┐
                    │  后台（ingest / recompress）           │
                    │  TMDB w500 → sharp 480px WebP        │
                    │           → Supabase Storage          │
                    │           → DB poster_url (.webp)     │
                    └─────────────────────────────────────┘
                                        │
                    poster_url（~30–50KB 成品）
                                        ▼
┌──────────────┐    next/image（生产默认）   ┌──────────────┐
│ 用户浏览器     │ ← 可选第二层缩放/格式 ──── │ Next.js       │
└──────────────┘                            └──────────────┘
```

1. **Storage 存接近交付尺寸的成品**（对标竞品，降本）。
2. **生产保持 `unoptimized: false`**，作为第二层保护。
3. **新片与存量统一规则**，避免双轨。

---

## 存量迁移（100+ 部）

### 原则

- **Pilot → 全量 → 验收**，不直接在 Dashboard 手工改。
- 利用现有 **`x-upsert: true`** 覆盖上传。
- 扩展名 `jpg` → `webp` 时 **必须更新 `movies.poster_url` 与 `media_assets`**。
- 旧对象是否删除：Pilot 后决定（可保留 `posters/{slug}.jpg` 一段时间，或迁移后批量删）。

### 建议流程

| 阶段 | 动作 | 产出 |
|------|------|------|
| 0. 摸底 | SQL 查 `media_assets` 体积分布 | 基线 avg / p95 |
| 1. Pilot（5 部） | 手动或临时脚本压缩 → 上传 → 更新 DB | 前后 KB 对比、肉眼验收、palette 抽检 |
| 2. 脚本 | 新增 `ingest:recompress-media`（或扩展 `upload-media`） | 支持 `--slug`、`--dry-run`、report |
| 3. 全量 | 对 `kind=poster` 且 `byte_size > 阈值` 的条目执行 | `data/import/recompress-report.txt` |
| 4. 改默认 | `sync-movies-to-sql` / legacy sync 入库即压缩 | 新片不再反弹 |
| 5. 验收 | SQL + 页面抽检 + `npm test` / `npm run build` | 方案 status → `implemented` |

### 存量脚本逻辑（草案）

```txt
for each movie in targets:
  resolve source file:
    1) public/media/posters/{slug}.jpg（优先）
    2) 或从 Storage 下载当前 poster_url
  compress → /tmp or public/media/posters/{slug}.webp
  upload posters/{slug}.webp (upsert)
  update movies.poster_url, image_cached_at
  replace media_assets row (poster), refresh byte_size
  log before_kb → after_kb
```

### 验收 SQL（示例）

```sql
SELECT
  COUNT(*) AS posters,
  ROUND(AVG(byte_size) / 1024.0, 1) AS avg_kb,
  ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY byte_size) / 1024.0, 1) AS p95_kb,
  MAX(byte_size) AS max_bytes
FROM media_assets
WHERE kind = 'poster';
```

---

## 工程改动清单（实施时）

| 项 | 路径 / 命令 | 说明 |
|----|-------------|------|
| 依赖 | `package.json` | 增加 `sharp`（仅 scripts 使用） |
| 压缩模块 | `scripts/bulk-ingest/compress-image.mts`（新） | `resize` + `webp`；海报/背景不同 preset |
| 同步入库 | `sync-movies-to-sql.mts` | 下载后 `compress` 再 `publishLocalMediaFile` |
| Legacy | `sync-movies.mjs` | 可选对齐，避免双轨 |
| 存量迁移 | `recompress-media-to-storage.mts`（**规划中**） | `npm run ingest:recompress-media`（尚未实现；本轮未做） |
| 环境变量 | `.env.example` | `TMDB_IMAGE_BASE_URL`、`POSTER_MAX_WIDTH`、`POSTER_WEBP_QUALITY` |
| 文档 | `movie-images.md`、`AGENTS.md` | 实施后更新「下一步」与命令表 |
| 测试 | `tests/` | 压缩后路径、`mimeType`、`byteSize` 映射（可选） |

**`next.config.ts`：** WebP 远程图无需改 `remotePatterns`；若未来改媒体子域，见 [cdn-origin-setup.md](./cdn-origin-setup.md)。

**`palette`：** 在压缩后的本地文件上调用现有 `extractPalette`；Pilot 时抽 3–5 部对比色板是否漂移。

---

## 风险与对策

| 风险 | 影响 | 对策 |
|------|------|------|
| 过度压缩导致详情发糊 | 产品观感 | Pilot 调 `quality`；宽度不低于 **420px** |
| URL 扩展名变化 | 旧链接 404、缓存错位 | 更新 DB；CDN 缓存按新 URL；旧 jpg 可短期保留 |
| `extractPalette` 色差 | 氛围光晕略变 | Pilot 对比；必要时用压缩前文件取色 |
| 重传中断 | 部分条目新旧混存 | 脚本幂等、按 slug 重跑、`--dry-run` |
| Supabase egress | 全量从 Storage 拉回再压 | 优先用本地 `public/media/`；无本地再 HTTP 下载 |
| 与 Next 优化叠加之争 | 重复处理 | Storage 已是小图时 Next 开销可接受；保留默认 `unoptimized: false` |

---

## 体积与成本粗算

| 场景 | 单张海报 | 100 部 | 10,000 部（海报 only） |
|------|----------|--------|-------------------------|
| 现状 w780 JPEG | ~200KB | ~20MB | ~2GB |
| 仅 w500 | ~100KB | ~10MB | ~1GB |
| **480px WebP（推荐）** | **~35KB** | **~3.5MB** | **~350MB** |

（Backdrop 未计入；背景图数量与体积通常小于海报，规则见方案 B。）

---

## 决策记录

| 日期 | 决策 | 备注 |
|------|------|------|
| 2026-06-29 | 文档初稿 | 基于 100+ 部、~200KB 实测与竞品 ~30KB 对比 |
| 2026-06-29 | **新入库实施方案 B** | `ingest:sync` / `ingest:upload-media`：TMDB w500 + sharp 480px WebP |
| 2026-06-29 | 存量迁移暂缓 | 100+ 部 `.jpg` 不本轮重压缩；后续可加 `ingest:recompress-media` |
| 2026-06-29 | legacy `sync:movies` 未改 | 人工单部录入仍 w780 原图；万级走 bulk-ingest |
| | 是否删除 Storage 旧 `.jpg` | 待定（新片为 `.webp`，与存量混存可接受） |

---

## 相关文档

- [movie-images.md](./movie-images.md) — 图片采集、缓存、URL A/B/C、前端原则
- [bulk-ingestion-runbook.md](./bulk-ingestion-runbook.md) — 批量录入操作；压缩应接入 `ingest:sync` 之后
- [cdn-origin-setup.md](./cdn-origin-setup.md) — 生产 `media.` 子域；Storage 小图 + CDN 长缓存
- [mainland-topology.md](./mainland-topology.md) — 大陆访问与部署选型
