# Station Zero 零号站

**状态：** 活跃个人产品（Active · personal）

Station Zero 是一个**高清观影决策系统**：帮你判断一部片值不值得看、哪个高清版本更合适、哪里能合法看，并整理观看来源索引。

目前没有公开生产部署地址；本地或自托管即可运行。生产 CDN / VPS 方案见 [`docs/technical/mainland-topology.md`](docs/technical/mainland-topology.md)。

## 是什么 / 不是什么

| 是 | 不是 |
|----|------|
| 观影判断与高清版本决策界面 | 视频托管、网盘或 BT 下载站 |
| 影视资料与观看路径的信息整理 / 索引 | 在用户访问时实时爬取 TMDB / 豆瓣的前端 |
| Next.js 站点 + Supabase 数据层 + 后台录入脚本 | 对第三方外链下载行为负责的平台 |

一句话：在本站完成「查找 → 判断 → 跳转或复制链接」；实际观看与下载发生在第三方。

## 怎么跑

包管理器：**npm**（锁文件 `package-lock.json`）。

```bash
cp .env.example .env.local   # 按需填写；无 DATABASE_URL 时回退 JSON
npm install
npm run dev                  # http://localhost:3000
```

常用检查：

```bash
npm run lint
npm test
npm run build
```

未配置 `DATABASE_URL` 时，页面仍可读 `data/movies.json` 与默认策展数据。完整环境变量见 [`.env.example`](.env.example)。

开发约定见 [`AGENTS.md`](AGENTS.md)；文档入口见 [`docs/index.md`](docs/index.md)。

### 可选：数据库与后台同步

```bash
npm run check:database
npm run check:tmdb
npm run check:storage        # 海报上传 Storage 时需 service_role

npm run sync:movies          # legacy：seeds → movies.json
npm run db:migrate:json      # legacy：JSON upsert 到 SQL
```

### 可选：万级批量录入（bulk-ingest）

```bash
npm run ingest:pilot         # 一键 Pilot（默认 100 部）
# 或：ingest:staging → ingest:resolve → … → ingest:sync
npm run ingest:publish -- --batch-id <batch>
```

操作手册：[`docs/technical/bulk-ingestion-runbook.md`](docs/technical/bulk-ingestion-runbook.md)  
进度快照：[`docs/technical/bulk-ingestion-progress.md`](docs/technical/bulk-ingestion-progress.md)

## 当前能力（摘要）

- 首页已发布影片网格（SSR + `/api/movies` 加载更多）
- 搜索：片名 / IMDB / 影人（`/search`；`pg_trgm` + JSON 回退）
- 影片库与详情：决策标签、元数据、观看来源聚合、设备与场景建议
- 片单、高清知识库、关于页与合规边界
- 主题：浅色 / 深色 / 跟随系统
- 数据：`movie-api` 优先读 Supabase Postgres，失败回退 `data/movies.json`

## 电影数据架构

Station Zero 采用「外部 API 后台生产内容，前端只读本站数据」：

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
Next.js 页面（img src = movies.poster_url）
```

核心原则：

- 前端页面不在用户访问时实时调用 TMDB、豆瓣或其他外部电影 API。
- 浏览器不直连 Supabase Postgres；仅服务端与脚本通过 `DATABASE_URL` 访问。
- 配置 `DATABASE_URL` 时，海报 URL 来自 Supabase Storage；`public/media/` 为脚本本地缓存。

### 读取层

| 能力 | 实现 |
|------|------|
| 首页 `/` | `getMoviesPage(1)` SSR；`MovieLoadMoreGrid` 经 `/api/movies` 加载更多 |
| 列表 `/movies` | SQL 分页，30 条/页，仅 `published` |
| 详情 `/movies/[slug]` | JOIN `viewing_paths`；任意状态 slug 可访问 |
| 搜索 `/search` | SQL `pg_trgm` + IMDB；无库时 JSON 子串匹配 |
| 构建 | Top 50 `published` SSG；其余 ISR（`revalidate = 86400`） |
| 无 `DATABASE_URL` | 回退 `data/movies.json` |

关键模块：`src/lib/movie-api.ts`、`movie-sql-store.ts`、`movie-store.ts`、`src/db/schema.ts`。

### 环境变量

复制 `.env.example` 为 `.env.local`：

```env
TMDB_READ_ACCESS_TOKEN=
TMDB_API_KEY=
DATABASE_URL=                 # Transaction pooler，端口 6543
SUPABASE_SERVICE_ROLE_KEY=    # 仅脚本上传海报，勿暴露给浏览器
SUPABASE_URL=
SUPABASE_MEDIA_BUCKET=media
```

TMDB 只用于后台采集。访问受限时可设 `TMDB_API_BASE_URL`（需含 `/3`）或本机 `HTTPS_PROXY`；`dev` / `build` / `start` / 相关脚本已启用 `--use-env-proxy`。

### 人工录入（少量）

1. 写入 `data/movie-seeds.json`（建议带 `tmdbId`、`contentStatus`）。
2. `npm run sync:movies`
3. 检查 `data/movies.json`；需要时 `npm run extract:palettes`
4. 有库则 `npm run db:migrate:json`；列表可见性依赖 `contentStatus = published`

编辑判断层（`verdict`、`bestWay`、`idealScene`、`notFor`、`versionSignals`、`deviceAdvice`）应由人工维护，勿被 TMDB 覆盖。

## 文档

| 主题 | 文档 |
|------|------|
| 文档索引 / 按任务选读 | [`docs/index.md`](docs/index.md) |
| 进度日志 | [`docs/progress.md`](docs/progress.md) |
| 决策记录 | [`docs/decisions.md`](docs/decisions.md) |
| 产品 PRD（当前） | [`docs/product/station-zero-prd-v0.2.md`](docs/product/station-zero-prd-v0.2.md) |
| 图片 / Storage / CDN | [`docs/technical/movie-images.md`](docs/technical/movie-images.md) |
| 站点搜索 | [`docs/technical/movie-search-scheme.md`](docs/technical/movie-search-scheme.md) |
| 万级录入手册 / 进度 | [`bulk-ingestion-runbook.md`](docs/technical/bulk-ingestion-runbook.md) · [`bulk-ingestion-progress.md`](docs/technical/bulk-ingestion-progress.md) |
| 大陆 CDN / VPS | [`docs/technical/mainland-topology.md`](docs/technical/mainland-topology.md) |

## UI 与主题

HeroUI + Lucide；设计 token 为 `--sz-*`（见 `src/app/globals.css`）。主题偏好键：`localStorage` → `station-zero-theme`（`light` / `dark` / `system`）。
