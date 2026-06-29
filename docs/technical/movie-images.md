---
title: 影片图片采集与缓存策略
type: architecture
status: active
updated: 2026-06-29
related:
  - technical/bulk-ingestion-scheme.md
  - technical/poster-compression-scheme.md
  - technical/mainland-topology.md
  - technical/cdn-origin-setup.md
---

# 影片图片采集与缓存策略

## 背景

Station Zero 当前可以从 TMDB 获取影片资料、海报和背景图，但如果页面直接依赖第三方图片域名，例如 `image.tmdb.org`，会受到网络连通性、DNS、第三方限流和图片加载速度影响。

竞品未命名影视（WMMYS / yqkclub）的公开页面显示，它并不是在页面加载时实时调用电影 API 获取海报，而是把海报提前落地为本站静态资源，再通过 CDN 分发。

## 竞品观察

首页海报结构类似：

```html
<img
  data-echo="/attachment/moviedetails/83369047.jpg"
  src="/res/lazyeach/blank.gif"
  class="layeach"
>
```

详情页则直接引用：

```html
<img src="/attachment/moviedetails/83369047.jpg">
```

图片响应头显示：

```txt
content-type: image/jpeg
content-length: 21497
cache-control: max-age=16070400
cf-cache-status: REVALIDATED
server: cloudflare
```

这说明其图片策略大概率是：

- 后台采集或人工录入影片资料。
- 服务端提前下载海报。
- 图片按内部内容 ID 存储，例如 `/attachment/moviedetails/{id}.jpg`。
- 首页使用极小占位图懒加载。
- 静态图片通过 Cloudflare 长缓存分发。

## 速度来源

竞品加载快的关键不是 API 本身，而是页面渲染链路足够短：

1. 页面 HTML 直接输出本站图片路径。
2. 图片不依赖第三方 API 实时返回。
3. 图片文件体积小，示例约 21KB。
4. CDN 设置长缓存，重复访问命中率高。
5. 首屏外图片懒加载，减少初始请求压力。

## Station Zero 推荐方案

Station Zero 应采用「外部 API 作为数据来源，本站缓存作为渲染来源」的策略。

### 数据流

```txt
TMDB / 人工录入 / 其他资料源
        ↓
后台同步任务
        ↓
标准化影片数据
        ↓
下载海报与背景图
        ↓
图片压缩、裁切、取色
        ↓
存入本站对象存储或 public media 目录
        ↓
页面读取本站图片 URL
```

### 建议字段

影片数据中应保留来源字段和本站缓存字段：

```ts
type MovieImageCache = {
  sourcePosterUrl: string;
  sourceBackdropUrl?: string;
  posterUrl: string;
  backdropUrl?: string;
  dominantColor?: string;
  palette?: string[];
  sourceProvider: "tmdb" | "manual" | "other";
  sourceUpdatedAt: string;
  imageCachedAt: string;
};
```

### 存储路径建议

开发阶段可以先使用本地静态目录：

```txt
public/media/posters/{slug}.jpg
public/media/backdrops/{slug}.jpg
```

生产阶段建议迁移到对象存储和 CDN：

```txt
https://cdn.station-zero.com/media/posters/{slug}.jpg
https://cdn.station-zero.com/media/backdrops/{slug}.jpg
```

## 图片处理建议

采集后不应直接原图上站，应增加处理步骤：

- 海报统一宽度，例如 `480px` 或 `640px`。
- 背景图统一宽度，例如 `1280px` 或 `1600px`。
- 输出现代格式，如 WebP / AVIF；必要时保留 JPEG fallback。
- 提取主色和调色板，用于详情页动态背景。
- 记录原始来源 URL，便于后续刷新和排错。

## 前端使用原则

前端页面不应直接依赖第三方图片 URL。

推荐：

```ts
<Image src={movie.posterUrl} alt={`${movie.title} poster`} />
```

不推荐：

```ts
<Image src={`https://image.tmdb.org/t/p/w780${posterPath}`} />
```

前端只关心本站缓存后的 `posterUrl`、`backdropUrl` 和 `dominantColor`，不关心 TMDB 的图片路径规则。

## MVP 落地步骤

### Phase 1：手动缓存

- 从当前默认影片开始。
- 手动下载海报和背景图。
- 存到 `public/media/`。
- 在 `src/lib/content.ts` 中改用本地路径。
- 保留 TMDB URL 作为来源字段。

### Phase 2：脚本化同步

新增脚本：

```bash
npm run sync:movies
```

脚本职责：

- 读取影片 slug / TMDB id。
- 请求 TMDB 资料。
- 下载海报和背景图。
- 压缩图片。
- 写入本地 JSON 或数据库。
- 输出失败报告。

### Phase 3：生产化缓存

- 使用对象存储保存图片。
- CDN 设置长缓存。
- 数据库保存图片缓存状态。
- 后台定时刷新资料。
- 对单部影片支持手动重新同步。

## 缓存策略建议

图片文件可以使用长缓存：

```txt
Cache-Control: public, max-age=31536000, immutable
```

如果图片可能更新，文件名应带版本或内容 hash：

```txt
/media/posters/inception.v1.jpg
/media/posters/inception.8f3a2c.webp
```

页面数据可使用较短 revalidate，例如 1 天；图片则尽量不可变。

## 生产环境海报 URL 策略

关键不是「文件存在哪」，而是「用户浏览器请求的 URL 是什么」。

用户打开 `/movies/dune-part-two` 时，页面里的 `<img src="???">` 只会向 `???` 发 HTTPS 请求。「存在哪」是运维/架构的事；「请求的 URL 是什么」才是大陆用户体感的事。

| 模式 | 示例 | 评价 |
|------|------|------|
| **URL A：直连 Supabase** | `*.supabase.co/...` | 差：大陆可达性不稳，暴露 Storage 与 bucket 结构 |
| **URL B：本站相对路径** | `/media/posters/dune-part-two.jpg` | 开发期 OK；大陆体验取决于整站部署与 CDN |
| **URL C：媒体子域 + CDN** | `https://media.station-zero.com/posters/dune-part-two.webp` | **生产目标**：用户从不请求 `supabase.co`，快慢由 CDN PoP 决定 |

```txt
                    ┌─────────────────────────────────────┐
                    │  后台（用户看不见）                    │
                    │  sync 脚本 → 上传 → Supabase Storage │
                    │           → 写 DB: poster_url         │
                    └─────────────────────────────────────┘
                                        │
                    poster_url 存什么？  │
                                        ▼
┌──────────────┐    请求 URL     ┌──────────────┐    回源（仅 CDN 未命中）
│ 大陆用户浏览器 │ ──────────────→ │ CDN 边缘节点  │ ──────────────→ Storage
└──────────────┘                  └──────────────┘
       │                                 │
       │  只看见 media.xxx.com            │  用户不直连 Storage
       └─────────────────────────────────┘
```

文件可仍在 Supabase Storage，但 `poster_url` 应写媒体子域 URL；CDN 与回源细节见 [mainland-topology.md](./mainland-topology.md)。

## 结论

Station Zero 不应该在用户访问页面时实时依赖 TMDB 图片链路。

更合理的架构是：

> API 用于后台同步，页面只读取本站缓存后的数据和图片。

这样可以同时获得：

- 更快的页面加载速度
- 更稳定的大陆访问体验
- 更可控的图片尺寸和质量
- 更自然的海报取色能力
- 更适合长期产品化的数据资产

## 当前项目落地状态

本仓库已经建立第一版「文件型本地电影库」作为数据库 MVP，后续可以平滑迁移到 PostgreSQL、SQLite 或对象存储。

### 本地数据文件

```txt
data/movies.json
```

职责：

- 保存影片条目、标题、年份、类型、海报路径、更新时间和详情页展示字段。
- 前端页面只读取该文件，不在用户访问时请求 TMDB。
- 文件为空或读取失败时，自动回退到 `src/lib/content.ts` 的默认策展数据。

### 后台同步种子

```txt
data/movie-seeds.json
```

职责：

- 保存需要同步的影片 `slug` 和 `tmdbId`。
- 保留 Station Zero 自己的策展判断字段，例如 `verdict`、`bestWay`、`idealScene`。
- 作为后台采集任务的输入，不直接暴露给前端。

### 可用命令

```bash
npm run sync:movies
npm run import:movies -- path/to/movies.json
```

`npm run sync:movies` 的职责：

- 在后台调用 TMDB。
- 把 TMDB 资料标准化为 Station Zero 的影片模型。
- 下载海报和背景图到 `public/media/`。
- 把本站图片路径写入 `data/movies.json`。
- 保留来源图片 URL，方便后续刷新和排错。

`npm run import:movies` 的职责：

- 支持人工录入或批量导入 JSON。
- 按 `slug` upsert 到 `data/movies.json`。
- 适合作为简易后台录入系统的第一步。

### 前端读取原则

前端统一从 `src/lib/movie-api.ts` 读取电影数据，但该文件现在只是本地内容库的门面：

```txt
src/lib/movie-api.ts -> src/lib/movie-store.ts -> data/movies.json -> defaultMovies fallback
```

这保留了页面调用方式，同时切断了前台实时外部 API 依赖。

### 缓存策略

- `/media/:path*` 设置 `Cache-Control: public, max-age=31536000, immutable`。
- 首页、影片列表页、影片详情页设置 `revalidate = 86400`。
- 影片列表中的非首屏图片使用懒加载。
- 首页主推影片保留 `priority`，优先加载首屏主视觉。

### 下一步建议

- 万级批量录入操作见 [bulk-ingestion-runbook.md](./bulk-ingestion-runbook.md)；架构见 [bulk-ingestion-scheme.md](./bulk-ingestion-scheme.md)。
- 把 `data/movies.json` 迁移到 SQLite 或 Postgres。
- 为人工录入增加受保护的 `/admin` 表单。
- 为图片增加压缩、尺寸统一和 WebP/AVIF 输出 → 决策与实施路径见 [poster-compression-scheme.md](./poster-compression-scheme.md)（`draft`）。
- 为同步任务增加失败报告和单片刷新能力。
- 生产环境把 `public/media/` 替换为对象存储与 Cloudflare CDN。
