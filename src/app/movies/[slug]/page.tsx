// MoviePage
// 影片详情页：Station Zero 的核心「观影决策」页面（App Router 动态路由 /movies/[slug]）。
// 这是一个 React Server Component（默认服务端渲染），配合下方 generateStaticParams 在构建期预渲染为静态页面。

import Image from "next/image";
import { notFound } from "next/navigation"; // 命中无效 slug 时抛出 404，由 Next.js 渲染 not-found 页面
import { Card } from "@heroui/react"; // HeroUI 组件库提供的基础 UI 原子组件
import { SiteShell } from "@/components/site-shell"; // 站点统一外壳（导航/页脚等），`@/` 是 tsconfig 配置的根别名
import { DecisionTags } from "@/components/decision-tags";
import { RatingPanel } from "@/components/rating-panel";
import { PosterAmbientGlow } from "@/components/poster-ambient-glow"; // 顶部海报氛围光晕背景层（纯装饰）
import { WatchProviders } from "@/components/watch-providers"; // 正版观看与购买聚合模块（客户端组件，含复制链接）
import { getMovie, getMovieSlugsForBuild, MOVIES_STATIC_BUILD_LIMIT } from "@/lib/movie-api"; // 读取本站本地内容库；外部 API 仅由后台同步脚本调用
import {
  Bookmark,
  ChevronRight,
  Eye,
  Play,
  ShieldCheck,
  ThumbsUp,
  type LucideIcon,
} from "lucide-react"; // Lucide 开源图标库（SVG 组件，可直接用于服务端组件）

export const dynamicParams = true;

export const revalidate = 86400;

/** 详情页头部展示的占位统计数据（浏览/收藏/推荐）。当前为静态写死，后续可替换为内容层真实字段。 */
const statItems: { label: string; value: string; color: string; Icon: LucideIcon }[] = [
  { label: "浏览", value: "58K", color: "text-[var(--sz-success)]", Icon: Eye },
  { label: "收藏", value: "20K", color: "text-[var(--sz-info)]", Icon: Bookmark },
  { label: "推荐", value: "27K", color: "text-[var(--sz-warn)]", Icon: ThumbsUp },
];

/**
 * 构建期（SSG）告知 Next.js 需要为哪些 `slug` 预生成静态页面。
 *
 * @returns 形如 `[{ slug }, ...]` 的数组，每一项对应一个会被静态化的动态路由实例
 * @see https://nextjs.org/docs/app/api-reference/functions/generate-static-params
 */
export async function generateStaticParams() {
  const slugs = await getMovieSlugsForBuild(MOVIES_STATIC_BUILD_LIMIT);
  return slugs.map((slug) => ({ slug }));
}

/**
 * 为每个影片页生成动态 SEO 元数据（`<title>` / `<meta name="description">`）。
 *
 * 注意：Next.js 15+ 中 `params` 是 Promise，必须先 `await` 再解构取值。
 *
 * @param props - Next.js 注入的页面参数
 * @param props.params - 解析后得到 `{ slug }` 的 Promise
 * @returns 页面 Metadata；影片不存在时标题回退为「影片未找到」
 */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const movie = await getMovie(slug);
  return {
    // 影片存在时拼接标题，否则回退为「影片未找到」
    title: movie ? `${movie.title}｜Station Zero 观影决策` : "影片未找到",
    description: movie?.summary,
  };
}

/**
 * 影片详情页主组件（async 服务端组件，可在渲染前直接 `await` 取数）。
 *
 * 取不到对应影片时调用 `notFound()` 进入 404。
 *
 * @param props - Next.js 注入的页面参数
 * @param props.params - 解析后得到 `{ slug }` 的 Promise
 * @returns 影片详情页的 JSX；未找到影片时由 `notFound()` 中断渲染
 */
export default async function MoviePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; // 同样需先 await 解出动态段参数
  const movie = await getMovie(slug);

  // 找不到对应影片直接进入 404，notFound() 会抛出特殊错误中断渲染。
  if (!movie) {
    notFound();
  }

  return (
    <SiteShell>
      <article className="relative mx-auto max-w-[1280px] px-5 pb-20 pt-8 md:px-8">
        {/* 顶部氛围光晕（实现与文档见 @/components/poster-ambient-glow） */}
        <PosterAmbientGlow posterUrl={movie.posterUrl} palette={movie.palette} />

        {/* 主体三栏布局：左侧海报/观看入口、中间决策正文、右侧评分。 */}
        <section className="relative z-10 grid gap-8 md:grid-cols-[230px_minmax(0,1fr)_210px] md:items-start">
          {/* 左栏：海报卡片 + 统计 + 合法观看路径摘要 */}
          <aside className="space-y-5 md:sticky md:top-[var(--sz-sticky-top)]">
            <Card className="detail-surface poster-lift overflow-hidden rounded-md border border-[color:var(--sz-border)] bg-[var(--sz-surface)] p-0 shadow-[0_5px_18px_var(--sz-shadow)]">
              {/* relative 作为 Image fill 的定位容器；无 posterUrl 时仅显示渐变占位 */}
              <div className={`relative h-[345px] bg-gradient-to-br ${movie.posterTone}`}>
                {movie.posterUrl ? <Image src={movie.posterUrl} alt={`${movie.title} poster`} fill className="object-cover" sizes="230px" /> : null}
              </div>
            </Card>
            {/* 浏览/收藏/推荐统计（当前为占位数据） */}
            <div className="flex justify-center gap-4 text-xs text-[var(--sz-muted)]">
              {statItems.map((stat) => (
                <span key={stat.label} className="inline-flex items-center gap-1">
                  <stat.Icon className={`size-3.5 ${stat.color}`} />
                  {stat.value}
                </span>
              ))}
            </div>
            {/* 「在哪看」卡片：只展示合法观看路径，呼应 PRD 的合规边界 */}
            <Card className="detail-surface overflow-hidden rounded bg-[var(--sz-surface)] p-0 text-[var(--sz-muted)]">
              <div className="flex items-center justify-between bg-[var(--sz-surface-muted)] px-3 py-2 text-[11px] uppercase tracking-[0.16em]">
                <span className="inline-flex items-center gap-1.5"><Play className="size-3" />Where to watch</span>
                <span className="inline-flex items-center gap-1"><ShieldCheck className="size-3" />Legal</span>
              </div>
              <div className="space-y-2 px-3 py-3 text-xs">
                {/* 仅预览前 2 个平台，其余收敛到「All legal paths…」入口 */}
                {movie.viewingPaths.slice(0, 2).map((path, index) => (
                  <p key={path.url ?? `${path.platform}-${index}`} className="text-[var(--sz-text-soft)]">{path.platform}</p>
                ))}
                <p className="inline-flex items-center gap-0.5 text-[var(--sz-link)]">All legal paths<ChevronRight className="size-3" /></p>
              </div>
            </Card>
          </aside>

          {/* 中栏：观影决策正文（标题、标签、简介、元数据与扩展区块） */}
          <main className="detail-reveal min-w-0">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight text-[var(--sz-text-strong)] md:text-6xl">
                {movie.title} <span className="text-lg font-normal text-[var(--sz-muted)]">{movie.year}</span>
              </h1>
            </div>
            {/* 决策标签：结论 + 最佳观看方式拆成 Tag，突出视觉层次 */}
            <DecisionTags
              verdict={movie.verdict}
              bestWay={movie.bestWay}
              fallback={{
                genres: movie.genres,
                runtime: movie.runtime,
                rating: movie.rating,
              }}
            />
            <p className="mt-5 text-[15px] leading-7 text-[var(--sz-text-soft)]">
              {movie.summary}
            </p>
            {/* 影片信息：豆瓣式单列元数据（去卡片化，紧跟简介，细分隔线区隔）。每行「标签: 值」内联，长值自然换行。缺失字段不渲染（见 MetaRow） */}
            <div className="mt-6 space-y-2 border-t border-[color:var(--sz-border)] pt-5 text-sm leading-6">
              <MetaRow label="导演" value={movie.director} />
              <MetaRow label="编剧" value={movie.writers?.join(" / ")} />
              <MetaRow label="主演" value={movie.cast.join(" / ")} />
              <MetaRow label="类型" value={movie.genres.join(" / ")} />
              <MetaRow label="制片国家/地区" value={movie.countries?.join(" / ")} />
              <MetaRow label="语言" value={movie.languages?.join(" / ")} />
              <MetaRow label="上映日期" value={movie.releaseDate} />
              <MetaRow label="片长" value={movie.runtime} />
              <MetaRow label="又名" value={movie.aka?.join(" / ")} />
            </div>

            {/* 观看来源：片源规格 + 按分类列出的平台链接 */}
            <WatchProviders
              paths={movie.viewingPaths}
              versionSignals={movie.versionSignals}
              movieTitle={movie.title}
            />
          </main>

          {/* 右栏：跨平台评分 */}
          <aside className="detail-reveal pt-0 md:sticky md:top-[var(--sz-sticky-top)] md:pt-2">
            <RatingPanel
              className="detail-reveal text-[var(--sz-muted)]"
              items={[
                { key: "douban", value: movie.ratings?.douban ?? movie.rating.split(" ")[0] },
                { key: "imdb", value: movie.ratings?.imdb ?? movie.rating.split(" ")[0] },
                { key: "rottenTomatoes", value: movie.ratings?.rottenTomatoes ?? "待补充" },
              ]}
            />
          </aside>
        </section>

      </article>
    </SiteShell>
  );
}

/**
 * 影片信息中的单行元数据：豆瓣式内联「标签: 值」。取值为空时整行不渲染，从而做到「缺什么省什么」。
 *
 * 用内联文本而非两列网格：标签弱化为次要色、值为正文软色，长值（如长串主演）自然换行，
 * 单列堆叠更紧凑、不发散。
 *
 * @param props - 组件属性
 * @param props.label - 字段名，例如「导演」「制片国家/地区」
 * @param props.value - 字段值（数组类字段由调用方 `join(" / ")` 后传入）；为空/undefined 时返回 `null`
 * @returns 一行「标签: 值」文本；无值时返回 `null`
 */
function MetaRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <p className="text-[var(--sz-text-soft)]">
      <span className="text-[var(--sz-muted)]">{label}:</span> {value}
    </p>
  );
}

