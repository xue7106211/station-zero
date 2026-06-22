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
