# Station Zero 零号站

Station Zero 是一个高清观影决策系统，帮助用户判断一部片值不值得看、哪里能合法看、哪个高清版本最值得看。

## 当前版本

MVP 已初始化为 Next.js + TypeScript + Tailwind + HeroUI 项目，包含：

- 首页：产品定位、精选影片、片单、版本追踪、高清知识入口。
- 影片库与影片详情页：观影结论、正版观看路径、高清版本判断、设备与场景建议。
- 片单页：围绕设备、心情和审美组织内容。
- 高清知识页：解释 HDR、BluRay、WEB-DL、REMUX 等概念。
- 版本追踪页与关于页：明确产品边界和后续方向。

## 开发命令

```bash
npm run dev
npm run build
npm run lint
```

## 产品文档

PRD 位于 `docs/product/station-zero-prd-v0.1.md`。

公开产品不提供磁力、BT、网盘、迅雷、盗版资源站或侵权下载入口。

## 电影数据 API

影片资料优先从 TMDB 拉取；未配置或请求失败时，会自动回退到 `src/lib/content.ts` 中的半人工策展默认数据。

1. 复制 `.env.example` 为 `.env.local`。
2. 填入 `TMDB_READ_ACCESS_TOKEN`，或使用 `TMDB_API_KEY`。不要在等号后添加多余空格或引号，例如 `TMDB_API_KEY=xxxx`。
3. 重启 `npm run dev`。

如果访问 `api.themoviedb.org` 时出现证书域名不匹配、DNS 污染或代理错误，可以把 `TMDB_API_BASE_URL` 指向你自己的 TMDB v3 兼容代理地址，值需要包含 `/3` 前缀。

可运行 `npm run check:tmdb` 检查本地环境变量与 TMDB 网络连通性。

如果浏览器可以访问 TMDB，但 Next.js 服务端请求失败，请在 `.env.local` 里配置本机代理，例如：

```env
HTTPS_PROXY=http://127.0.0.1:7890
HTTP_PROXY=http://127.0.0.1:7890
NO_PROXY=localhost,127.0.0.1
```

项目的 `dev`、`build`、`start` 脚本已经启用 Node.js `--use-env-proxy`，会让服务端 `fetch` 读取这些代理变量。

如果 `curl` 能访问 TMDB 但 Node `fetch` 超时，项目会默认启用 `TMDB_CURL_FALLBACK=true`，在服务端用系统 `curl` 兜底获取 JSON 数据。可用 `TMDB_CURL_FALLBACK=false` 关闭。

TMDB 数据只用于影片资料、海报、背景图、评分和正版观看路径参考；高清版本判断仍保留 Station Zero 的编辑判断层。

## UI 组件

默认组件库为 HeroUI。基础交互与展示组件优先使用 `@heroui/react`，全局样式在 `src/app/layout.tsx` 中引入。
