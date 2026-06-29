# Station Zero 零号站

Station Zero 是一个高清观影决策系统，帮助用户判断一部片值不值得看、哪里能合法看、哪个高清版本最值得看。

## 当前版本

MVP 基于 Next.js + TypeScript + Tailwind CSS 4 + HeroUI，包含：

- 首页：产品定位、精选影片、片单与高清知识入口。
- 影片库与影片详情页：决策标签、豆瓣式元数据、正版观看路径、高清版本判断、设备与场景建议。
- 片单页：围绕设备、心情和审美组织内容。
- 高清知识页：解释 HDR、BluRay、WEB-DL、REMUX 等概念。
- 关于页：产品边界与合规声明。
- 站点壳层：吸顶导航、移动端抽屉菜单、浅色/深色/跟随系统主题切换。
- 电影数据层：前端经 `movie-api` 读取 **Supabase Postgres**（优先）或 `data/movies.json`（回退）。
- 后台采集脚本：同步 TMDB 资料、下载海报/背景图、提取海报色板；写入 JSON 或经 bulk-ingest 写入 SQL + Supabase Storage。

## 开发命令

```bash
npm run dev
npm run build
npm run lint
npm test
```

### TMDB 后台同步（legacy · 单部 / 少量）

```bash
npm run check:tmdb
npm run sync:movies
npm run import:movies -- path/to/movies.json
npm run extract:palettes
```

### 万级批量录入（bulk-ingest）

```bash
npm run check:database
npm run check:tmdb
npm run check:storage      # 海报上传 Storage 时需 service_role

npm run ingest:pilot       # 一键 Pilot（默认 100 部）
# 或分步：ingest:staging → ingest:resolve → ingest:resolve-ambiguous / ingest:resolve-failed → ingest:sync
npm run ingest:upload-media   # 补传本地海报到 Supabase Storage
```

操作手册：[`docs/technical/bulk-ingestion-runbook.md`](docs/technical/bulk-ingestion-runbook.md)  
导入数据说明：[`data/import/index.md`](data/import/index.md)  
脚本索引：[`scripts/index.md`](scripts/index.md)

### 数据库（Supabase Postgres）

```bash
npm run check:database      # 验证 DATABASE_URL 连通与表状态
npm run check:storage       # 验证 Supabase Storage 上传凭证
npm run db:generate         # 根据 schema 生成 migration
npm run db:migrate          # 应用 migration 到 Supabase
npm run db:push             # 开发时快速推送 schema（可跳过 migration 文件）
npm run db:migrate:json     # 将 data/movies.json upsert 到 SQL（legacy）
```

## 电影数据架构

Station Zero 采用「外部 API 后台生产内容，前端只读本站数据」的加载方案：

```txt
TMDB / 人工录入 / CSV 批量
        ↓
legacy sync:movies  或  bulk-ingest 流水线
        ↓
data/movies.json（legacy 编辑源 + JSON 回退）
        ↓
db:migrate:json / ingest:sync
        ↓
Supabase Postgres（movies / viewing_paths / media_assets / import_staging）
        ↓
Supabase Storage（bucket media · posters / backdrops）
        ↓
movie-api.ts（SQL 优先，失败或无配置时回退 JSON）
        ↓
Next.js 页面（img src = movies.poster_url，Supabase Storage 公网 URL）
```

核心原则：

- 前端页面不在用户访问时实时调用 TMDB、豆瓣或其他外部电影 API。
- 浏览器不直连 Supabase Postgres；仅服务端与脚本通过 `DATABASE_URL` 访问数据库。
- 配置 `DATABASE_URL` 时，海报 URL 来自 Supabase Storage（`movies.poster_url`）；`public/media/` 为脚本本地缓存。

### 读取层（当前）

| 能力 | 实现 |
|------|------|
| 列表 `/movies` | SQL 分页，30 条/页，`content_status = published`，`ORDER BY updated_at DESC` |
| 首页精选 | 仅展示 `published` 影片 |
| 详情 `/movies/[slug]` | `movies` JOIN `viewing_paths` 单次查询；任意状态 slug 可访问 |
| 构建策略 | Top 50 `published` 预热 SSG；其余 slug 按需 ISR（`revalidate = 86400`） |
| 无 `DATABASE_URL` | 自动回退 `data/movies.json` |

关键模块：

- `src/lib/movie-api.ts` — 页面读取门面（SQL 优先 + JSON fallback）
- `src/lib/movie-sql-store.ts` — Supabase 查询与分页
- `src/lib/movie-store.ts` — 文件型 JSON 读取与默认数据合并
- `src/lib/movie-mapper.ts` — SQL 行 → 前端 `Movie` 类型映射
- `src/db/schema.ts` — Drizzle schema（`movies`、`viewing_paths`、`media_assets`、`import_staging`）

### 本地文件库

- `data/movies.json` — 文件型电影库，legacy 编辑与 JSON 回退源。
- `data/movie-seeds.json` — legacy 后台同步种子。
- `data/import/` — 万级批量清洗 CSV 与报告（见 [`index.md`](data/import/index.md)）。
- `public/media/posters/` 与 `public/media/backdrops/` — sync 脚本本地缓存；页面以 DB 中 Storage URL 为准。

### 环境变量

复制 `.env.example` 为 `.env.local`，按需配置：

```env
# TMDB 后台同步（可选）
TMDB_READ_ACCESS_TOKEN=
TMDB_API_KEY=

# Supabase Postgres（可选；配置后页面优先读 SQL）
# Transaction pooler URI，端口 6543
DATABASE_URL=

# Supabase Storage 上传（bulk-ingest / ingest:upload-media；仅脚本，勿暴露给浏览器）
SUPABASE_SERVICE_ROLE_KEY=

# 可选
SUPABASE_URL=
SUPABASE_MEDIA_BUCKET=media
```

未配置 `DATABASE_URL` 时，应用仍可用 `data/movies.json` 与默认策展数据运行。

### 后台同步 TMDB

TMDB 只用于后台采集阶段。未配置或请求失败时，前端仍会使用 `data/movies.json` 和 `src/lib/content.ts` 中的默认策展数据。

1. 填入 `TMDB_READ_ACCESS_TOKEN` 或 `TMDB_API_KEY`（等号后不要多余空格或引号）。
2. 运行 `npm run check:tmdb` 验证连通性。
3. 运行 `npm run sync:movies` 同步 `data/movie-seeds.json` 中的影片。
4. 若已配置 `DATABASE_URL`，运行 `npm run db:migrate:json` 将变更同步到 SQL。

如果访问 `api.themoviedb.org` 时出现证书域名不匹配、DNS 污染或代理错误，可以把 `TMDB_API_BASE_URL` 指向你自己的 TMDB v3 兼容代理地址，值需要包含 `/3` 前缀。

如果浏览器可以访问 TMDB，但 Next.js 服务端请求失败，请在 `.env.local` 里配置本机代理，例如：

```env
HTTPS_PROXY=http://127.0.0.1:7890
HTTP_PROXY=http://127.0.0.1:7890
NO_PROXY=localhost,127.0.0.1
```

`dev`、`build`、`start`、`check:tmdb`、`sync:movies` 已启用 Node.js `--use-env-proxy`，服务端 `fetch` 会读取这些代理变量。

`npm run sync:movies` 会：

- 从 TMDB 拉取影片资料、演职员、观看平台、又名等字段；
- 将制片国家/地区、语言映射为中文展示文案；
- 下载远程海报和背景图到 `public/media/`；
- 从本地海报提取 `palette` 色板；
- 把本站图片路径与展示字段写入 `data/movies.json`。

`/media/:path*` 已配置长缓存头，生产环境可以接 Cloudflare 或对象存储 CDN。

`npm run import:movies -- path/to/movies.json` 可导入人工整理的影片数据，按 `slug` 写入或更新本地库。

`npm run extract:palettes` 可为已有本地海报离线补全 `palette` 字段，无需重新请求 TMDB。

TMDB 数据只用于影片资料、海报、背景图、评分和正版观看路径参考；高清版本判断仍保留 Station Zero 的编辑判断层。

### 人工录入约定

常规录入方式是先提供电影名称和年份，由 Agent 或编辑把它整理进 `data/movie-seeds.json`，再运行后台同步补全 TMDB 资料。

推荐种子格式：

```json
[
  {
    "slug": "arrival",
    "title": "降临",
    "originalTitle": "Arrival",
    "year": "2016",
    "contentStatus": "published",
    "verdict": "值得安静大屏观看",
    "bestWay": "4K HDR / Blu-ray / 高质量正版流媒体"
  }
]
```

如果已知 `tmdbId`，优先写入 `tmdbId`，匹配最稳定：

```json
[
  {
    "slug": "arrival",
    "tmdbId": 329865,
    "contentStatus": "published",
    "verdict": "值得安静大屏观看",
    "bestWay": "4K HDR / Blu-ray / 高质量正版流媒体"
  }
]
```

录入原则：

- `slug` 是本站公开 URL 标识，例如 `/movies/arrival`，优先使用英文小写 kebab-case。
- `tmdbId` 是外部资料源 ID，只用于后台同步，不作为公开详情页主地址。
- `contentStatus` 控制列表可见性：`published` 出现在 `/movies` 与首页；`draft` / `review` 仅详情直链可访问。
- 电影名称和年份可用于初步搜索；当前脚本尚未把年份作为强匹配条件，遇到同名电影时应先确认 `tmdbId`。
- `verdict`、`bestWay`、`idealScene`、`notFor`、`versionSignals`、`deviceAdvice` 是 Station Zero 编辑判断层，应人工维护。
- 同步完成后检查 `data/movies.json` 是否写入本地图片路径与色板；配置 `DATABASE_URL` 后运行 `npm run db:migrate:json` 同步到 SQL。

### 产品与技术文档

完整索引与**按任务选读**见 [`docs/index.md`](docs/index.md)（Agent 与协作者首选入口）。开发约定见 [`AGENTS.md`](AGENTS.md)。

| 主题 | 文档 |
|------|------|
| 产品 PRD（当前） | [`docs/product/station-zero-prd-v0.2.md`](docs/product/station-zero-prd-v0.2.md) |
| 图片、Storage、CDN URL | [`docs/technical/movie-images.md`](docs/technical/movie-images.md) |
| 海报体积优化（draft） | [`docs/technical/poster-compression-scheme.md`](docs/technical/poster-compression-scheme.md) |
| 万级批量录入 · 操作手册 | [`docs/technical/bulk-ingestion-runbook.md`](docs/technical/bulk-ingestion-runbook.md) |
| 万级批量录入 · 架构方案 | [`docs/technical/bulk-ingestion-scheme.md`](docs/technical/bulk-ingestion-scheme.md) |
| 万级批量录入 · 勾选清单 | [`docs/technical/bulk-ingestion-checklist-v1.md`](docs/technical/bulk-ingestion-checklist-v1.md) |
| 大陆 CDN / VPS 选型 | [`docs/technical/mainland-topology.md`](docs/technical/mainland-topology.md) |
| CDN 回源与媒体子域 | [`docs/technical/cdn-origin-setup.md`](docs/technical/cdn-origin-setup.md) |
| VPS 身份隔离纪律 | [`docs/technical/identity-isolation-notes.md`](docs/technical/identity-isolation-notes.md) |

### 万级批量录入

Pilot 已验证端到端流水线（staging → TMDB 消歧 → SQL + Storage）。**推荐从操作手册入手**：

- [`docs/technical/bulk-ingestion-runbook.md`](docs/technical/bulk-ingestion-runbook.md) — 操作手册
- [`docs/technical/bulk-ingestion-scheme.md`](docs/technical/bulk-ingestion-scheme.md) — 架构方案
- [`docs/technical/bulk-ingestion-checklist-v1.md`](docs/technical/bulk-ingestion-checklist-v1.md) — 分阶段清单

当前已完成：Schema、读取层、bulk-ingest 脚本、Supabase Storage 海报上传。待推进：生产 CDN / VPS 部署、海报入库压缩（见 `poster-compression-scheme.md`）。

## UI 与主题

默认组件库为 HeroUI，图标使用 Lucide React，全局样式在 `src/app/layout.tsx` 与 `src/app/globals.css` 中维护。

### 站点壳层

- `SiteShell` — 页面背景光晕、页脚与内容容器。
- `SiteHeader` — 吸顶头部，滚动后显示半透明背景与模糊效果。
- `SiteNav` — 桌面端导航、路由激活态、移动端 Drawer 菜单。

### 影片详情页组件

- `DecisionTags` — 将 `verdict` 与 `bestWay` 拆成标签展示。
- `PosterAmbientGlow` — 基于 `palette` 或模糊海报生成顶部氛围光晕。
- `WatchProviders` — 正版观看路径聚合与复制链接。

### 主题切换

主题偏好保存在 `localStorage` 的 `station-zero-theme`，支持：

- `light` — 浅色模式
- `dark` — 深色模式
- `system` — 跟随系统 `prefers-color-scheme`

首屏通过 `layout.tsx` 内联脚本在 paint 前写入 `<html data-theme>`，避免闪烁。设计 token 统一使用 `--sz-*` CSS 变量。
