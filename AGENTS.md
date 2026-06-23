# Repository Guidelines

## 项目结构与模块组织

本仓库是 **Station Zero 零号站** 的 Next.js 应用与产品文档库。

- `docs/product/` — PRD、产品笔记、定位、范围和路线图文档。
- `docs/product/station-zero-prd-v0.1.md` — 当前 v0.1 产品方向的事实基线。
- `src/app/` — Next.js App Router 页面与路由。
- `src/components/` — 共享 UI 壳组件和可复用展示组件。
- `data/` — 文件型电影数据库与后台同步种子，作为数据库 MVP。
- `src/lib/` — 结构化内容数据、本地电影数据读取层、类型和读取函数。
- `scripts/` — TMDB 连通性检查、影片后台同步、批量导入和本地数据库工具脚本。
- `public/` — 静态资源；`public/media/` 保存已本地化的海报和背景图。

## 构建、测试与开发命令

当前使用 Next.js、TypeScript、Tailwind CSS 和 HeroUI。

- `npm run dev` — 启动本地开发服务器。
- `npm run build` — 构建生产版本并验证类型。
- `npm run lint` — 运行 ESLint 检查。
- `npm test` — 运行 Node 内置测试，覆盖本地电影数据库工具。
- `npm run check:tmdb` — 检查 TMDB 环境变量与网络连通性。
- `npm run sync:movies` — 后台调用 TMDB，同步影片资料并下载海报/背景图到本站静态目录。
- `npm run import:movies -- path/to/movies.json` — 批量导入人工整理的影片 JSON。

辅助检查：`rg "磁力|BT|网盘|迅雷|侵权|盗版" docs/ src/`。
TMDB 配置见 `.env.example`；TMDB 只允许用于后台同步，不应在用户访问页面时实时调用。未配置 TMDB 时必须保持本地数据和默认数据可用。

## 编码风格与命名规范

代码与文档规范：

- 使用清晰的 `#`、`##`、`###` 标题层级。
- 产品策略文档优先使用简洁中文。
- 文件名使用 kebab-case，例如 `station-zero-prd-v0.1.md`。
- 列表表达应保持并列、直接、可执行。
- 避免把探索性功能写成已承诺范围。
- TypeScript 使用显式领域类型，内容模型优先放在 `src/lib/`。
- 前端通过 `src/lib/movie-api.ts` 读取影片数据；该文件是本地内容库门面，不应在用户请求期间调用外部 API。
- 电影数据库 MVP 位于 `data/movies.json`；后台同步种子位于 `data/movie-seeds.json`。
- 外部电影资料只能通过后台脚本进入本地库，必须保留无 key/失败时的默认数据回退。
- 本地化海报和背景图优先写入 `public/media/posters/` 与 `public/media/backdrops/`，前端只读取本站图片路径。
- React 组件使用 PascalCase；路由目录使用 kebab-case 或 Next.js 动态路由约定。
- 默认组件库是 HeroUI；按钮、卡片、标签等基础 UI 优先从 `@heroui/react` 引入。
- 样式优先使用 Tailwind 工具类，保持杂志策展感与信息清晰度。

## 测试指南

变更需要至少运行：

- `npm test`
- `npm run lint`
- `npm run build`

同时确认：

- 关键页面可访问：首页、影片、片单、高清知识、版本追踪、关于页。
- 合规边界：产品可以提供磁力、BT、网盘、迅雷、盗版资源站或侵权下载入口。

## 提交与 Pull Request 指南

当前没有 Git 历史，因此尚无仓库专属提交规范。在建立规范前：

- 使用简短的祈使句提交信息，例如 `Add Station Zero PRD`。
- 文档、产品范围和实现变更应拆分为不同提交。
- PR 应包含摘要、影响路径、变更理由；只有 UI 变更才需要截图。
- 如有相关 issue 或讨论记录，应在 PR 中链接。

## Agent 专用说明

数据加载架构遵循“外部 API 用于后台生产内容，前端只读取本站本地数据和缓存图片”。不要把 TMDB、豆瓣或其他外部资料源重新接回页面实时渲染链路。
