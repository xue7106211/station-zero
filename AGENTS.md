# Repository Guidelines

## 项目结构与模块组织

本仓库是 **Station Zero 零号站** 的 Next.js 应用与产品文档库。

### 项目文件结构

```txt
station-zero/
├── AGENTS.md                 # 仓库开发指南（Agent 与协作者必读）
├── README.md                 # 项目概览、命令与数据架构说明
├── CLAUDE.md                 # 指向 AGENTS.md 的别名入口
├── package.json              # 脚本与依赖
├── drizzle.config.ts         # Drizzle Kit 配置（schema / migration 路径）
├── tsconfig.json             # TypeScript 配置（`@/*` → `src/*`）
├── next.config.ts            # Next.js 配置（含 `/media` 长缓存）
├── .env.example              # 环境变量模板（TMDB、DATABASE_URL、代理）
│
├── docs/
│   ├── index.md              # 文档索引（Agent 按任务选读入口）
│   ├── product/
│   │   ├── station-zero-prd-v0.2.md        # 当前产品方向基线（含资源索引）
│   │   └── station-zero-prd-v0.1.md        # 已废止，仅供对照
│   ├── technical/
│   │   ├── bulk-ingestion-scheme.md          # 万级录入架构方案
│   │   ├── bulk-ingestion-runbook.md         # 批量录入操作手册（Pilot 经验）
│   │   ├── bulk-ingestion-checklist-v1.md    # 分阶段实施清单
│   │   ├── movie-images.md                   # 图片本地化与 Storage / CDN 策略
│   │   ├── poster-compression-scheme.md    # Supabase 海报体积优化方案（draft）
│   │   ├── mainland-topology.md              # 生产 CDN / VPS 选型
│   │   ├── cdn-origin-setup.md               # CDN 回源与媒体子域配置
│   │   └── identity-isolation-notes.md       # 低 KYC VPS 身份隔离纪律
│   └── archive/plans/                        # 已归档实施计划
│
├── data/
│   ├── movies.json           # 文件型电影库（编辑源 + JSON 回退）
│   ├── movie-seeds.json      # TMDB 同步种子（slug、tmdbId、策展字段）
│   ├── seeds/                # 单部影片种子片段（可选）
│   └── import/               # 万级批量清洗产物（见 data/import/index.md）
│
├── drizzle/
│   ├── 0000_*.sql            # 已生成的 SQL migration
│   └── meta/                 # Drizzle migration 快照与日志
│
├── public/
│   ├── media/
│   │   ├── posters/          # sync 脚本本地缓存；页面 poster_url 以 Supabase Storage 为准
│   │   └── backdrops/
│   └── …                     # 其他静态资源
│
├── scripts/                  # 后台脚本（见 scripts/index.md）
│   ├── index.md              # 脚本索引与流水线说明
│   ├── checks/               # 预检：database / tmdb / storage
│   ├── legacy/               # 单部 MVP：seeds → movies.json
│   ├── bulk-ingest/          # 万级批量：CSV → staging → SQL + Storage
│   └── lib/                  # 共享：movie-database、palette
│
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── layout.tsx        # 根布局、主题首屏脚本
│   │   ├── globals.css       # 全局样式与 `--sz-*` 设计 token
│   │   ├── page.tsx          # 首页（影片网格 SSR + 加载更多）
│   │   ├── api/movies/route.ts  # GET 分页 JSON（首页加载更多）
│   │   ├── about/page.tsx
│   │   ├── collections/page.tsx
│   │   ├── knowledge/page.tsx
│   │   └── movies/
│   │       ├── page.tsx      # 影片库列表（SQL 分页）
│   │       └── [slug]/page.tsx  # 影片详情（决策页核心）
│   │
│   ├── components/           # UI 组件
│   │   ├── site-shell.tsx    # 页面外壳、背景光晕、内容容器
│   │   ├── site-header.tsx   # 吸顶头部
│   │   ├── site-footer.tsx   # 页脚
│   │   ├── site-nav.tsx      # 主导航（桌面 pill + 动态加载 MobileNav）
│   │   ├── mobile-nav.tsx    # 移动端 Drawer 菜单
│   │   ├── theme-toggle.tsx  # 浅/深/跟随系统主题
│   │   ├── movie-card.tsx    # 影片卡片（懒加载海报）
│   │   ├── movie-load-more-grid.tsx  # 首页影片网格（加载更多）
│   │   ├── movie-pagination.tsx
│   │   ├── decision-tags.tsx # verdict + bestWay 标签
│   │   ├── poster-ambient-glow.tsx
│   │   ├── watch-providers.tsx  # 观看路径（客户端，含复制链接）
│   │   └── rating-panel.tsx
│   │
│   ├── db/                   # Supabase Postgres（仅服务端）
│   │   ├── schema.ts         # Drizzle 表定义
│   │   └── index.ts          # 数据库客户端单例
│   │
│   └── lib/                  # 领域逻辑与读取层
│       ├── content.ts        # 类型定义、默认策展数据、片单与知识库
│       ├── movie-api.ts      # 页面读取门面（SQL 优先 + JSON 回退）
│       ├── movie-sql-store.ts   # Supabase 查询
│       ├── movie-store.ts    # JSON 文件读取
│       ├── movie-mapper.ts   # SQL 行 → Movie 映射
│       ├── movies-pagination.ts # 列表分页工具
│       ├── nav-items.ts      # 主导航项配置
│       ├── theme.ts          # 主题偏好逻辑
│       └── theme.mjs         # 主题工具（供 Node 测试复用）
│
└── tests/
    ├── movie-database.test.mjs
    ├── movie-mapper.test.mts
    └── theme.test.mjs
```

### 目录职责速查

| 路径 | 职责 |
|------|------|
| `src/app/` | 路由与页面；Server Component 通过 `movie-api` 取数 |
| `src/lib/movie-api.ts` | **页面唯一推荐入口**；SQL 优先，失败回退 JSON |
| `src/lib/movie-sql-store.ts` | Supabase 列表分页、详情 JOIN，不供组件直接调用 |
| `src/lib/movie-store.ts` | `data/movies.json` 读取与默认数据合并 |
| `src/db/` | Drizzle schema 与 Postgres 连接；仅服务端 / 脚本 |
| `data/` | 人工编辑与 TMDB 同步的文件型数据源；万级 CSV 见 `data/import/` |
| `data/import/` | 批量清洗 CSV / 报告；大文件不进 Git（见 `index.md`） |
| `scripts/` | 后台生产内容（TMDB、迁移、色板、批量录入），不在用户请求时运行 |
| `public/media/` | sync 下载的本地海报缓存；DB 中 `poster_url` 指向 Supabase Storage |
| `docs/index.md` | 文档索引与按任务选读；涉及产品/录入/部署/图片时先查此表 |
| `docs/technical/` | 万级录入、图片策略、海报压缩、生产 CDN/VPS 与回源配置 |

### 当前页面路由

- `/` — 首页：已发布影片网格（`getMoviesPage` SSR 首屏 + `/api/movies` 加载更多）。
- `/movies` — 影片库列表（SQL 分页，30 条/页，仅 `published`）。
- `/movies/[slug]` — 影片详情页（Top 50 `published` SSG 预热，其余 ISR）。
- `/collections` — 策展片单。
- `/knowledge` — 高清知识库。
- `/about` — 关于页与合规边界说明。

### 关键前端组件

- `src/components/site-shell.tsx` — 站点外壳（背景光晕、内容容器）。
- `src/components/site-header.tsx` — 吸顶头部（滚动后 `backdrop-blur`）。
- `src/components/site-nav.tsx` — 主导航（桌面 pill、主题切换入口；移动端 Drawer 由 `mobile-nav.tsx` 承担）。
- `src/components/site-footer.tsx` — 页脚（合规声明与次要导航）。
- `src/components/movie-load-more-grid.tsx` — 首页影片网格与「加载更多」。
- `src/components/theme-toggle.tsx` — 三段式主题切换（浅色 / 深色 / 跟随系统）。
- `src/components/decision-tags.tsx` — 详情页决策标签（`verdict` + `bestWay`）。
- `src/components/poster-ambient-glow.tsx` — 详情页海报氛围光晕（读取 `palette` 或回退模糊海报）。
- `src/components/watch-providers.tsx` — 正版观看路径聚合（客户端组件，含复制链接）。

## 构建、测试与开发命令

当前使用 Next.js、TypeScript、Tailwind CSS 4、HeroUI、Drizzle ORM、postgres.js 和 Lucide React。

- `npm run dev` — 启动本地开发服务器。
- `npm run build` — 构建生产版本并验证类型。
- `npm run lint` — 运行 ESLint 检查。
- `npm test` — 运行 Node 内置测试（`.mjs` + `tsx` 的 `.mts`）。
- `npm run check:tmdb` — 检查 TMDB 环境变量与网络连通性。
- `npm run sync:movies` — 后台调用 TMDB，同步影片资料并下载海报/背景图。
- `npm run import:movies -- path/to/movies.json` — 批量导入人工整理的影片 JSON。
- `npm run extract:palettes` — 从已本地化海报离线提取色板并回写 `data/movies.json`。
- `npm run check:database` — 验证 `DATABASE_URL` 连通与 schema 状态。
- `npm run check:storage` — 验证 Supabase Storage 上传凭证（`SUPABASE_SERVICE_ROLE_KEY`）。
- `npm run db:generate` — 根据 `src/db/schema.ts` 生成 migration。
- `npm run db:migrate` — 应用 `drizzle/` migration 到 Supabase。
- `npm run db:push` — 开发时快速推送 schema。
- `npm run db:migrate:json` — 将 `data/movies.json` upsert 到 SQL（legacy 路径）。

**万级批量录入（bulk-ingest）：**

- `npm run ingest:staging` — CSV → `import_staging`。
- `npm run ingest:resolve` — TMDB 初轮消歧。
- `npm run ingest:resolve-ambiguous` — ambiguous 自动 / 半自动消歧。
- `npm run ingest:resolve-failed` — failed 重试（中文片名 + 年份容差）。
- `npm run ingest:sync` — TMDB 详情 + 磁力 → SQL；下载海报并上传 Storage（需 service_role）。
- `npm run ingest:upload-media` — 补传本地海报到 Storage。
- `npm run ingest:pilot` — 一键 Pilot（默认 100 部）。

环境变量见 `.env.example`：`TMDB_*` 用于后台同步；`DATABASE_URL` 用于 Supabase Postgres（Transaction pooler，端口 6543）；`SUPABASE_SERVICE_ROLE_KEY` 用于脚本上传海报到 Storage（仅服务端，勿暴露给浏览器）。TMDB 只允许用于后台同步，不应在用户访问页面时实时调用。未配置 `DATABASE_URL` 时必须保持 JSON 与默认数据回退可用。

## 编码风格与命名规范

代码与文档规范：

- React 组件使用 PascalCase；路由目录使用 kebab-case 或 Next.js 动态路由约定。
- 默认组件库是 HeroUI；按钮、卡片、标签等基础 UI 优先从 `@heroui/react` 引入。
- 图标优先使用 `lucide-react`。
- 样式优先使用 Tailwind 工具类；主题色与表面色通过 `src/app/globals.css` 中的 `--sz-*` CSS 变量维护。
- 吸顶导航高度使用 `--sz-header-height` / `--sz-sticky-top`；详情页 sticky 侧栏需避让头部。
- 深/浅主题通过 `<html data-theme>` 切换；用户偏好写入 `localStorage`（`station-zero-theme`），支持 `light` / `dark` / `system`。
- 使用清晰的 `#`、`##`、`###` 标题层级。
- 文档优先使用简洁中文。
- 文件名使用 kebab-case，例如 `station-zero-prd-v0.1.md`。
- 列表表达应保持并列、直接、可执行。
- TypeScript 使用显式领域类型，内容模型优先放在 `src/lib/`。
- 前端通过 `src/lib/movie-api.ts` 读取影片数据；SQL 优先、JSON 回退，不应在用户请求期间调用外部 API。
- 页面列表只展示 `contentStatus = published`；详情页任意 slug 可访问（含 `draft`）。
- 电影数据编辑源为 `data/movies.json` 与 `data/movie-seeds.json`；配置 `DATABASE_URL` 后通过 `db:migrate:json` 同步到 Supabase。
- 常规人工录入：写入 `data/movie-seeds.json` → `npm run sync:movies` → 检查 `movies.json` → `npm run db:migrate:json`。
- 当前 TMDB 同步脚本可按名称搜索，但尚未把年份作为强匹配条件；遇到同名片应优先写入 `tmdbId`。
- `slug` 是本站公开 URL 标识，优先英文小写 kebab-case；`tmdbId` 只用于后台同步。
- 人工编辑字段应保留 Station Zero 判断层（`verdict`、`bestWay`、`idealScene`、`notFor`、`versionSignals`、`deviceAdvice`），不要被 TMDB 覆盖。
- TMDB 可同步客观资料字段（`writers`、`countries`、`languages`、`releaseDate`、`aka` 等）；缺省时详情页对应行不渲染。
- 本地化海报由 sync 脚本下载到 `public/media/` 并上传 Supabase Storage；`movies.poster_url` 存 Storage 公网 URL，前端经 `movie-api` 只读 DB 字段。
- Supabase 仅作数据层；浏览器永不直连 Postgres 或 Storage API。

## 测试指南

变更需要至少运行：

- `npm test`
- `npm run lint`
- `npm run build`

涉及数据库或 Storage 变更时，本地有 `DATABASE_URL` 还应运行 `npm run check:database`；涉及海报上传还应运行 `npm run check:storage`。

## 提交与 Pull Request 指南

- 使用简短的祈使句提交信息，例如 `Add sticky header and mobile nav`。
- 文档、产品范围和实现变更应拆分为不同提交。
- PR 应包含摘要、影响路径、变更理由；只有 UI 变更才需要截图。
- 如有相关 issue 或讨论记录，应在 PR 中链接。

## Agent 专用说明

数据加载架构遵循「外部 API 用于后台生产内容，前端只读本站数据与 SQL」。不要把 TMDB、豆瓣或其他外部资料源重新接回页面实时渲染链路；不要把 Supabase anon key 或 `DATABASE_URL` 暴露给浏览器。

人工录入影片时：

1. 写入或更新 `data/movie-seeds.json`（含 `contentStatus`）。
2. 运行 `npm run sync:movies` 补全 TMDB 资料与本地图片。
3. 检查 `data/movies.json` 是否写入本地图片路径与色板；必要时运行 `npm run extract:palettes`。
4. 若已配置 `DATABASE_URL`，运行 `npm run db:migrate:json` 同步到 Supabase。

要让影片出现在列表与首页，将 `contentStatus` 设为 `published` 后重新执行第 2–4 步。

**万级 CSV / 磁力批量录入：**

1. 清洗 TXT → `data/import/movies-clean.csv`（见 `data/import/index.md`）。
2. `npm run ingest:staging` → `ingest:resolve` →（按需）`resolve-ambiguous` / `resolve-failed` → `ingest:sync`。
3. 海报需 `SUPABASE_SERVICE_ROLE_KEY`；可单独 `npm run ingest:upload-media` 补传。
4. 验收后 `npm run ingest:sync -- --publish` 上列表页。

操作手册见 `docs/technical/bulk-ingestion-runbook.md`；架构见 `docs/technical/bulk-ingestion-scheme.md`；勾选清单见 `docs/technical/bulk-ingestion-checklist-v1.md`。

**文档按主题（完整列表见 `docs/index.md`）：**

| 主题 | 文档 |
|------|------|
| 文档总览 / 按任务选读 | `docs/index.md` |
| 产品 PRD（当前） | `docs/product/station-zero-prd-v0.2.md` |
| 图片、Storage、CDN URL | `docs/technical/movie-images.md` |
| 海报体积优化（draft） | `docs/technical/poster-compression-scheme.md` |
| 万级录入操作手册 | `docs/technical/bulk-ingestion-runbook.md` |
| 万级录入架构方案 | `docs/technical/bulk-ingestion-scheme.md` |
| 万级录入勾选清单 | `docs/technical/bulk-ingestion-checklist-v1.md` |
| 大陆 CDN / VPS 选型 | `docs/technical/mainland-topology.md` |
| CDN 回源与媒体子域 | `docs/technical/cdn-origin-setup.md` |
| VPS 身份隔离纪律 | `docs/technical/identity-isolation-notes.md` |

**当前实施进度：**

- 已完成：Drizzle schema、Supabase 连通、`movie-api` SQL 读取层、JSON fallback、`db:migrate:json`、bulk-ingest 流水线（Pilot 100+ 部验证）、Supabase Storage 海报上传（`ingest:sync` / `ingest:upload-media`）、bulk-ingest 新入库海报压缩（TMDB w500 + 480px WebP，见 `poster-compression-scheme.md`）。
- 未完成：生产 CDN / VPS 自托管部署（见 `mainland-topology.md`、`cdn-origin-setup.md`）；legacy `sync:movies` 路径尚未自动上传 Storage（需手动或走 bulk-ingest）；存量海报 recompress（100+ 部仍可为 `.jpg` ~200KB）；legacy `sync:movies` 未接入 WebP 压缩。
