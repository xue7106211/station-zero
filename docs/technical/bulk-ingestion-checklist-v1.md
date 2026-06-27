---
title: 万级影视批量录入 — 可执行清单（v1）
type: runbook
status: pending
updated: 2026-06-25
related:
  - technical/bulk-ingestion-scheme.md
  - technical/movie-images.md
  - technical/mainland-topology.md
---

# 万级影视批量录入 — 可执行清单（v1）

> 本文是 [bulk-ingestion-scheme.md](./bulk-ingestion-scheme.md) 的**可执行落地版**：分阶段、可勾选的 TODO。决策依据与背景见原文档，本文只列动作。

## 输入约束（本轮强调）

- 数据量：约 **1 万+** 条影视数据与来源链接（网盘 / 磁力等）
- 原始形态：**片名 + 年份 + 链接，无 `tmdbId`**
  - 示例：`2024.裹尸布(The.Shrouds)裹尸布[简繁英字幕].The.Shrouds.2024.BluRay.1080p.x265.10bit.DDP5.1-SSDSSE  4.92GB  magnet:?xt=urn:btih:c84fa8936a6e49ee23533de3c388f9c7e08d1c7a`
- 产品目标：完整详情页（TMDB 元数据 + 本地化海报 + 人工来源链接）
- 部署目标：生产用 **SQL 管理业务数据**（大概率 **Supabase**）；图片与文本后台统一维护，前端只读本站数据
- 访问目标：生产站点在**中国大陆相对稳定可访问**（Vercel 实测几乎不可用，不作生产主机）
- 隐私目标：站点与运营链路**不得关联或泄露**运营者住址、实名、家庭 IP、物理位置等可识别信息

## 关键架构决策（先定）

> Supabase 与"大陆可访问 + 隐私隔离"有张力：Supabase 端点大陆可达性不稳，浏览器直连还会暴露 anon key。
>
> **采纳方案**：Supabase 只做**数据层**（Postgres + Storage），**浏览器永不直连**；前端用境外 VPS 自托管 Next.js（SSR/ISR）经 CDN 对大陆出网，仅 app server 与录入脚本访问 Supabase。

---

## Phase 0 — 决策与隐私边界（门禁，0.5–1 天）

- [ ] **D0** 锁定数据层：Supabase（Postgres + Storage）作后端，**前端不直连**、仅 app server / 脚本访问
- [ ] **D1** 锁定大陆拓扑：境外 VPS（HK/SG/JP）Docker + CDN 回源 + 源站隐藏；填写 [mainland-topology.md](./mainland-topology.md)（CDN 供应商、线路、回源方式）
- [ ] **D2** 域名 + WHOIS 隐私：支持 Redaction 的注册商 + 项目专用邮箱
- [ ] **D3** 身份隔离：VPS 账单 / 邮箱 / SSH 密钥全用项目专用身份，与个人分离；确认可接受实名程度（默认不走境内 ICP 备案）

## Phase 1 — Schema + 迁移基建（2–3 天）

- [ ] **S1** Drizzle schema：`movies` / `viewing_paths` / `media_assets` / `import_staging`（字段照原文档草案）
- [ ] **S2** Supabase 项目 + `drizzle-kit` migration 落库；DB 仅内网 / IP 白名单，**禁公网 `0.0.0.0/0`**
- [ ] **S3** `migrate-json-to-sql.mjs`：现有 ~16 条 `data/movies.json` → SQL
- [ ] **S4** 海报上传 Supabase Storage（私有 bucket）→ 写 `media_assets` + `movies.poster_url`

## Phase 2 — 读取层改造（2–3 天）

- [ ] **R1** `movie-store` 改读 SQL；`/movies` 列表 SQL 分页（30/页，`ORDER BY updated_at DESC`），海报 `loading="lazy"`
- [ ] **R2** `/movies/[slug]` 详情：`movies` JOIN `viewing_paths` 单次查询，按平台分组
- [ ] **R3** 构建策略：published Top N（~50）预热，其余 ISR / 动态，**不全量 SSG**
- [ ] **R4** 保留 `DATABASE_URL` 缺失时的 JSON fallback

## Phase 3 — 录入流水线脚本（2–3 天，可与 Phase 2 并行）

- [ ] **P1** `prepare-staging.mjs`：解析"片名+年份+链接"原始串（含 magnet / 体积 / 字幕格式）→ 拆出 `title/year/url/platform/type`，`COPY` 进 `import_staging`，`batch_id` 每 500 条
- [ ] **P2** `resolve-tmdb-ids.mjs`：`/search/movie?query=&year=` **带年份消歧**；唯一→采纳，多候选→`ambiguous-report.csv`，无果→`failed`；`--concurrency 3 --delay-ms 250`，checkpoint + `--resume`
- [ ] **P3** 人工复核 ambiguous 队列，回写 `tmdb_id`
- [ ] **P4** `sync-movies-to-sql.mjs`：TMDB detail UPSERT（`ON CONFLICT slug`）+ `viewing_paths` 批量 INSERT（**staging 链接优先，不被 TMDB 覆盖**）+ 图片压 WebP→Storage + 事务断点 + `sync_failures`

## Phase 4 — Pilot（0.5–1 天）

- [ ] **T1** 100 条端到端：CSV→staging→resolve→sync→分页列表 + CDN 海报 + 详情链接分组
- [ ] **T2** 统计错配率、单条耗时；**在大陆网络实测**列表 / 详情 / 图片可用率

## Phase 5 — 全量录入（2–4 天）

- [ ] **F1** 分批跑 1 万+（每批 500，限速 + 429 退避）
- [ ] **F2** 抽检后批量 `content_status = published`

## Phase 6 — 生产部署 + 隐私自查（2–3 天）

- [ ] **G1** 源站 `docker-compose.prod.yml`（Next.js standalone + Caddy/Nginx）
- [ ] **G2** CDN 回源 + 源站防火墙**仅放行 CDN IP 段 + 管理 VPN**；SSH 仅密钥
- [ ] **G3** Storage 经 CDN / signed URL 出图，bucket 默认私有
- [ ] **G4** 大陆多地拨测（延迟 / 可用率），决定是否换 CDN
- [ ] **G5** 隐私 checklist：WHOIS、页脚 / about、响应头 `Server`、错误页、源 IP 不泄露、日志轮转

---

## 依赖与关键路径

```
Phase 0 ─┬─ Phase 1 ── Phase 2 ─┐
         └─ Phase 3 ────────────┴─ Phase 4 ── Phase 5 ── Phase 6
```

- Phase 0 是门禁，不定无法进 Phase 1。
- Phase 2（读取层）与 Phase 3（录入脚本）可并行。
- 合计约 **10–17 个工作日**（与原文档时间预期一致）。

## 待拍板（阻塞 Phase 1）

1. **数据层**：确认 Supabase + 前端不直连？还是全自建 PG + S3？
2. **CDN 供应商方向**（Bunny / Cloudflare / 其他）→ 影响 G2 回源认证方式。

## 相关文档

- [bulk-ingestion-scheme.md](./bulk-ingestion-scheme.md) — 完整方案与决策依据
- [movie-images.md](./movie-images.md) — 当前文件型 MVP 与图片策略
- [mainland-topology.md](./mainland-topology.md) — 大陆 CDN / VPS 选型
- [AGENTS.md](../../AGENTS.md) — 仓库开发与录入约定

