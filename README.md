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
- 本地电影数据仓库：前端读取 `data/movies.json`，默认数据作为兜底。
- 后台采集脚本：同步 TMDB 资料、下载海报/背景图、提取海报色板，并写入本站本地库。

## 开发命令

```bash
npm run dev
npm run build
npm run lint
npm test
npm run check:tmdb
npm run sync:movies
npm run import:movies -- path/to/movies.json
npm run extract:palettes
```

## 电影数据架构

Station Zero 采用“外部 API 后台同步，前端读取本站本地数据”的加载方案：

```txt
TMDB / 人工录入
        ↓
后台同步或批量导入
        ↓
data/movies.json
        ↓
Next.js 页面读取本地数据
        ↓
public/media/ 本地海报与 CDN 缓存
```

核心原则：前端页面不在用户访问时实时调用 TMDB、豆瓣或其他外部电影 API。

### 本地数据库 MVP

- `data/movies.json` — 文件型电影数据库，保存影片条目、标题、年份、类型、海报路径、色板、更新时间和详情页展示字段。
- `data/movie-seeds.json` — 后台同步种子，保存 `slug`、`tmdbId` 和 Station Zero 自己的策展判断字段。
- `src/lib/movie-api.ts` — 前端读取门面，当前只转发到本地电影数据仓库。
- `src/lib/movie-store.ts` — 本地数据读取层，读取失败时回退到 `src/lib/content.ts` 的默认策展数据。
- `public/media/posters/` 与 `public/media/backdrops/` — 本地化海报和背景图输出目录。

### 后台同步 TMDB

TMDB 只用于后台采集阶段。未配置或请求失败时，前端仍会使用 `data/movies.json` 和 `src/lib/content.ts` 中的默认策展数据。

1. 复制 `.env.example` 为 `.env.local`。
2. 填入 `TMDB_READ_ACCESS_TOKEN`，或使用 `TMDB_API_KEY`。不要在等号后添加多余空格或引号，例如 `TMDB_API_KEY=xxxx`。
3. 运行 `npm run check:tmdb` 验证连通性。
4. 运行 `npm run sync:movies` 同步 `data/movie-seeds.json` 中的影片。

如果访问 `api.themoviedb.org` 时出现证书域名不匹配、DNS 污染或代理错误，可以把 `TMDB_API_BASE_URL` 指向你自己的 TMDB v3 兼容代理地址，值需要包含 `/3` 前缀。

如果浏览器可以访问 TMDB，但 Next.js 服务端请求失败，请在 `.env.local` 里配置本机代理，例如：

```env
HTTPS_PROXY=http://127.0.0.1:7890
HTTP_PROXY=http://127.0.0.1:7890
NO_PROXY=localhost,127.0.0.1
```

项目的 `dev`、`build`、`start`、`check:tmdb`、`sync:movies` 脚本已经启用 Node.js `--use-env-proxy` 或等价配置，会让服务端 `fetch` 读取这些代理变量。

如果 `curl` 能访问 TMDB 但 Node `fetch` 超时，项目会默认启用 `TMDB_CURL_FALLBACK=true`，在服务端用系统 `curl` 兜底获取 JSON 数据。可用 `TMDB_CURL_FALLBACK=false` 关闭。

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
    "verdict": "值得安静大屏观看",
    "bestWay": "4K HDR / Blu-ray / 高质量正版流媒体"
  }
]
```

录入原则：

- `slug` 是本站公开 URL 标识，例如 `/movies/arrival`，优先使用英文小写 kebab-case。
- `tmdbId` 是外部资料源 ID，只用于后台同步，不作为公开详情页主地址。
- 电影名称和年份可用于初步搜索；当前脚本尚未把年份作为强匹配条件，遇到同名电影时应先确认 `tmdbId`。
- `verdict`、`bestWay`、`idealScene`、`notFor`、`versionSignals`、`deviceAdvice` 是 Station Zero 编辑判断层，应人工维护。
- 同步完成后，正式展示数据写入 `data/movies.json`，前端只读取本站本地库与 `/media/` 图片。

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
