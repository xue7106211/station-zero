# Repository Guidelines

## 项目结构与模块组织

本仓库是 **Station Zero 零号站** 的 Next.js 应用与产品文档库。

- `docs/product/` — PRD、产品笔记、定位、范围和路线图文档。
- `docs/product/station-zero-prd-v0.1.md` — 当前 v0.1 产品方向的事实基线。
- `src/app/` — Next.js App Router 页面与路由。
- `src/components/` — 共享 UI 壳组件和可复用展示组件。
- `data/` — 文件型电影数据库与后台同步种子，作为数据库 MVP。
- `src/lib/` — 结构化内容数据、本地电影数据读取层、主题工具、类型和读取函数。
- `scripts/` — TMDB 连通性检查、影片后台同步、批量导入、色板提取和本地数据库工具脚本。
- `public/` — 静态资源；`public/media/` 保存已本地化的海报和背景图。

### 当前页面路由

- `/` — 首页：产品定位、精选影片、片单与高清知识入口。
- `/movies` — 影片库列表。
- `/movies/[slug]` — 影片详情页（核心观影决策页，SSG 静态生成）。
- `/collections` — 策展片单。
- `/knowledge` — 高清知识库。
- `/about` — 关于页与合规边界说明。

### 关键前端组件

- `src/components/site-shell.tsx` — 站点外壳（背景光晕、页脚）。
- `src/components/site-header.tsx` — 吸顶头部（滚动后 `backdrop-blur`）。
- `src/components/site-nav.tsx` — 主导航（路由激活态、移动端 Drawer、主题切换入口）。
- `src/components/theme-toggle.tsx` — 三段式主题切换（浅色 / 深色 / 跟随系统）。
- `src/components/decision-tags.tsx` — 详情页决策标签（`verdict` + `bestWay`）。
- `src/components/poster-ambient-glow.tsx` — 详情页海报氛围光晕（读取 `palette` 或回退模糊海报）。
- `src/components/watch-providers.tsx` — 正版观看路径聚合（客户端组件，含复制链接）。

## 构建、测试与开发命令

当前使用 Next.js、TypeScript、Tailwind CSS 4、HeroUI 和 Lucide React。

- `npm run dev` — 启动本地开发服务器。
- `npm run build` — 构建生产版本并验证类型。
- `npm run lint` — 运行 ESLint 检查。
- `npm test` — 运行 Node 内置测试，覆盖本地电影数据库工具与主题工具。
- `npm run check:tmdb` — 检查 TMDB 环境变量与网络连通性。
- `npm run sync:movies` — 后台调用 TMDB，同步影片资料并下载海报/背景图到本站静态目录。
- `npm run import:movies -- path/to/movies.json` — 批量导入人工整理的影片 JSON。
- `npm run extract:palettes` — 从已本地化海报离线提取色板并回写 `data/movies.json`。

TMDB 配置见 `.env.example`；TMDB 只允许用于后台同步，不应在用户访问页面时实时调用。未配置 TMDB 时必须保持本地数据和默认数据可用。

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
- 前端通过 `src/lib/movie-api.ts` 读取影片数据；该文件是本地内容库门面，不应在用户请求期间调用外部 API。
- 电影数据库 MVP 位于 `data/movies.json`；后台同步种子位于 `data/movie-seeds.json`。
- 常规人工录入方式是：用户提供电影名称与年份，Agent 先写入或更新 `data/movie-seeds.json`，再通过后台 TMDB 同步补全资料；当前脚本可按名称搜索，但尚未把年份作为强匹配条件，遇到同名片应优先要求或查询 `tmdbId`。
- `slug` 是本站公开 URL 标识，优先使用英文小写 kebab-case，例如 `dune-part-two`；`tmdbId` 只用于外部数据同步，不作为公开详情页主地址。
- 人工编辑字段应保留 Station Zero 判断层，例如 `verdict`、`bestWay`、`idealScene`、`notFor`、`versionSignals`、`deviceAdvice`，不要被 TMDB 原始资料覆盖。
- TMDB 可同步的客观资料字段包括 `writers`、`countries`、`languages`、`releaseDate`、`aka` 等；缺省时详情页对应行不渲染。
- 外部电影资料只能通过后台脚本进入本地库，必须保留无 key/失败时的默认数据回退。
- 本地化海报和背景图优先写入 `public/media/posters/` 与 `public/media/backdrops/`，前端只读取本站图片路径。
- 海报色板 `palette` 由后台 `node-vibrant` 提取，前端只读，用于 `PosterAmbientGlow` 氛围层。

## 测试指南

变更需要至少运行：

- `npm test`
- `npm run lint`
- `npm run build`

## 提交与 Pull Request 指南

- 使用简短的祈使句提交信息，例如 `Add sticky header and mobile nav`。
- 文档、产品范围和实现变更应拆分为不同提交。
- PR 应包含摘要、影响路径、变更理由；只有 UI 变更才需要截图。
- 如有相关 issue 或讨论记录，应在 PR 中链接。

## Agent 专用说明

数据加载架构遵循“外部 API 用于后台生产内容，前端只读取本站本地数据和缓存图片”。不要把 TMDB、豆瓣或其他外部资料源重新接回页面实时渲染链路。

人工录入影片时，同步完成后检查 `data/movies.json` 是否写入本地图片路径与色板；必要时运行 `npm run extract:palettes` 补全已有海报的 `palette` 字段。
