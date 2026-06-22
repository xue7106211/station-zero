// 影片详情页：Station Zero 的核心「观影决策」页面（App Router 动态路由 /movies/[slug]）。
// 这是一个 React Server Component（默认服务端渲染），配合下方 generateStaticParams 在构建期预渲染为静态页面。

import Image from "next/image";
import { notFound } from "next/navigation"; // 命中无效 slug 时抛出 404，由 Next.js 渲染 not-found 页面
import { Card, Chip } from "@heroui/react"; // HeroUI 组件库提供的基础 UI 原子组件
import { SiteShell } from "@/components/site-shell"; // 站点统一外壳（导航/页脚等），`@/` 是 tsconfig 配置的根别名
import { getMovie, getMovieSlugs } from "@/lib/movie-api"; // API 优先、无配置时回退到半人工策展默认数据

// 详情页头部展示的占位统计数据。当前为静态写死，后续接入真实数据时可替换为来自内容层的字段。
const statItems = [
  { label: "浏览", value: "58K", color: "text-emerald-400" },
  { label: "收藏", value: "20K", color: "text-sky-400" },
  { label: "推荐", value: "27K", color: "text-amber-400" },
];

// 构建期（SSG）告诉 Next.js 需要为哪些 slug 预生成静态页面。
// 返回 [{ slug }, ...]，每一项对应一个会被静态化的动态路由实例。
export async function generateStaticParams() {
  const slugs = await getMovieSlugs();
  return slugs.map((slug) => ({ slug }));
}

// 为每个页面生成动态 SEO 元数据（<title>/<meta description>）。
// 注意：Next.js 15 中 params 是 Promise，必须 await 后再解构取值。
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const movie = await getMovie(slug);
  return {
    // 影片存在时拼接标题，否则回退为「影片未找到」
    title: movie ? `${movie.title}｜Station Zero 观影决策` : "影片未找到",
    description: movie?.summary,
  };
}

// 页面主组件：async 服务端组件，可直接在渲染前 await 数据。
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
        {movie.posterUrl ? (
          <div className="pointer-events-none absolute -top-24 left-1/2 h-[760px] w-screen max-w-[1600px] -translate-x-1/2 overflow-hidden opacity-70">
            <Image src={movie.posterUrl} alt="" fill priority className="scale-125 object-cover blur-3xl saturate-150" sizes="100vw" aria-hidden />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_32%_18%,rgba(255,255,255,0.16),transparent_24%),linear-gradient(180deg,rgba(9,9,11,0.18)_0%,rgba(9,9,11,0.76)_56%,#09090b_100%),linear-gradient(90deg,#09090b_0%,rgba(9,9,11,0.28)_24%,rgba(9,9,11,0.28)_76%,#09090b_100%)]" />
          </div>
        ) : null}
        {/* 主体三栏布局：左侧海报/观看入口、中间决策正文、右侧评分。 */}
        <section className="relative z-10 grid gap-8 pt-10 md:grid-cols-[230px_minmax(0,1fr)_210px] md:items-start md:pt-16">
          {/* 左栏：海报卡片 + 统计 + 合法观看路径摘要 */}
          <aside className="space-y-5">
            <Card className="detail-surface poster-lift overflow-hidden rounded-md border border-[#ddef]/25 bg-[#12161a] p-0 shadow-[0_5px_18px_rgba(0,0,0,0.35)]">
              {/* relative 作为 Image fill 的定位容器；无 posterUrl 时仅显示渐变占位 */}
              <div className={`relative h-[345px] bg-gradient-to-br ${movie.posterTone}`}>
                {movie.posterUrl ? <Image src={movie.posterUrl} alt={`${movie.title} poster`} fill className="object-cover" sizes="230px" /> : null}
              </div>
            </Card>
            {/* 浏览/收藏/推荐统计（当前为占位数据） */}
            <div className="flex justify-center gap-4 text-xs text-[#9ab]">
              {statItems.map((stat) => (
                <span key={stat.label} className="inline-flex items-center gap-1">
                  <span className={stat.color}>●</span>
                  {stat.value}
                </span>
              ))}
            </div>
            {/* 「在哪看」卡片：只展示合法观看路径，呼应 PRD 的合规边界 */}
            <Card className="detail-surface overflow-hidden rounded bg-[#111820] p-0 text-[#9ab]">
              <div className="flex items-center justify-between bg-[#283038] px-3 py-2 text-[11px] uppercase tracking-[0.16em]">
                <span>Where to watch</span>
                <span>Legal</span>
              </div>
              <div className="space-y-2 px-3 py-3 text-xs">
                {/* 仅预览前 2 个平台，其余收敛到「All legal paths…」入口 */}
                {movie.viewingPaths.slice(0, 2).map((path) => (
                  <p key={path.platform} className="text-[#c8d1da]">{path.platform}</p>
                ))}
                <p className="text-[#40bcf4]">All legal paths…</p>
              </div>
            </Card>
          </aside>

          {/* 中栏：观影决策正文（移动端标题、判定摘要、简介、决策四宫格） */}
          <main className="detail-reveal min-w-0">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight text-white md:text-6xl">
                {movie.title} <span className="text-lg font-normal text-[#9ab]">{movie.year}</span>
              </h1>
            </div>
            {/* 一句话决策摘要：推荐结论 + 最佳观看方式 */}
            <p className="mt-6 max-w-xl font-mono text-xs uppercase leading-6 tracking-[0.2em] text-[#9ab] md:mt-4">
              {movie.verdict} · {movie.bestWay}
            </p>
            <p className="mt-5 max-w-xl text-[15px] leading-7 text-[#c9d3dc]">
              {movie.summary}
            </p>
            {/* 决策四宫格：把关键判断（最佳观看/场景/不适合/评分）结构化呈现 */}
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <DecisionPanel label="最佳观看" value={movie.bestWay} />
              <DecisionPanel label="适合场景" value={movie.idealScene} />
              <DecisionPanel label="不适合" value={movie.notFor} />
              <DecisionPanel label="评分参考" value={movie.rating} />
            </div>

            {/* 主创信息标签 + 高清版本判断 / 设备场景建议：与上方决策内容保持同一个内容流 */}
            <div className="mt-12">
              {/* 仿 Letterboxd 的 Tab 行（当前为纯视觉，未接交互） */}
              <div className="flex gap-5 border-b border-[#456]/70 text-xs uppercase tracking-[0.16em]">
                {['Cast', 'Crew', 'Details', 'Genres', 'Releases'].map((item, index) => (
                  <span key={item} className={`pressable pb-2 ${index === 0 ? 'border-b border-white text-white' : 'text-emerald-400'}`}>
                    {item}
                  </span>
                ))}
              </div>

              {/* 主创/相关标签云：合并导演、主演、相关推荐为一组 Chip */}
              <div className="mt-4 flex flex-wrap gap-2">
                {[movie.director, ...movie.cast, ...movie.related].map((item) => (
                  <Chip key={item} variant="soft" className="pressable rounded bg-[#283038] px-2 py-1 text-xs text-[#9ab]">
                    {item}
                  </Chip>
                ))}
              </div>

              <div className="mt-10 grid gap-4 md:grid-cols-2">
                {/* 高清版本判断：逐条列出 4K/HDR/Dolby Vision 等信号及对应结论 */}
                <InfoCard title="高清版本判断">
                  {movie.versionSignals.map((signal) => (
                    <div key={signal.label} className="flex items-start justify-between gap-4 border-b border-white/5 py-3 last:border-0">
                      <div>
                        <p className="font-medium text-[#d9e5ef]">{signal.label}</p>
                        <p className="mt-1 text-sm text-[#9ab]">{signal.value}</p>
                      </div>
                      <span className="text-xs text-emerald-400">{signal.verdict}</span>
                    </div>
                  ))}
                </InfoCard>

                {/* 设备与场景建议：按设备/场景给出观看建议清单 */}
                <InfoCard title="设备与场景建议">
                  <ul className="space-y-3 text-sm text-[#9ab]">
                    {movie.deviceAdvice.map((item) => <li key={item}>· {item}</li>)}
                  </ul>
                </InfoCard>
              </div>
            </div>
          </main>

          {/* 右栏：跨平台评分 */}
          <aside className="detail-reveal space-y-6 pt-0 md:pt-2">
            <Card className="detail-reveal rounded-none border-0 bg-transparent p-0 text-[#9ab] shadow-none">
              <div className="flex items-center justify-between border-b border-[#456]/70 pb-2 text-[11px] uppercase tracking-[0.16em]">
                <span>Ratings</span>
                <span>3 sources</span>
              </div>
              <div className="mt-4 space-y-3">
                <RatingSource label="豆瓣" value={movie.ratings?.douban ?? movie.rating.split(" ")[0]} hint="中文社区" />
                <RatingSource label="IMDb" value={movie.ratings?.imdb ?? movie.rating.split(" ")[0]} hint="全球影迷" />
                <RatingSource label="烂番茄" value={movie.ratings?.rottenTomatoes ?? "待补充"} hint="媒体/观众" />
              </div>
            </Card>
          </aside>
        </section>
      </article>
    </SiteShell>
  );
}

// 决策面板小卡片：决策四宫格中的单元，统一「标签 + 取值」的展示样式。
function DecisionPanel({ label, value }: { label: string; value: string }) {
  return (
    <Card className="detail-surface rounded bg-[#202932]/80 p-4 text-[#d9e5ef] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#8fa1b2]">{label}</p>
      <p className="mt-2 text-sm leading-6">{value}</p>
    </Card>
  );
}

// 信息卡容器：带标题栏的内容卡，children 由调用方传入（高清版本判断 / 设备场景建议复用）。
function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="detail-surface rounded bg-[#182129]/80 p-5 text-[#d9e5ef] shadow-none">
      <h2 className="border-b border-[#456]/70 pb-3 text-sm font-semibold uppercase tracking-[0.16em] text-white">{title}</h2>
      <div className="mt-3">{children}</div>
    </Card>
  );
}

function RatingSource({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="detail-surface flex items-center justify-between rounded bg-[#182129]/72 px-4 py-3 text-[#d9e5ef]">
      <div>
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-[#7f93a7]">{hint}</p>
      </div>
      <p className="font-mono text-2xl font-light text-[#b8c8d8]">{value}</p>
    </div>
  );
}
