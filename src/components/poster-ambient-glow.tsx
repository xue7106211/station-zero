import Image from "next/image";

/**
 * 底部溶解遮罩的渐变定义（供 `mask-image` / `-webkit-mask-image` 使用）。
 *
 * 关键点：遮罩的颜色只取其 **alpha 通道**——不透明处保留光晕、透明处抹掉光晕。
 * 因此这里用 `#000 → transparent` 表达「上方完整保留、下方逐渐消隐」。
 * 上 40% 保持满不透明（托住标题/正文区域的取色氛围），之后用多档 alpha 平滑降到 0，
 * 到容器底部完全透明，让页面背景无缝接管，杜绝任何硬切线。
 */
const FADE_MASK =
  "linear-gradient(to bottom, #000 0%, #000 40%, rgba(0,0,0,0.72) 58%, rgba(0,0,0,0.34) 78%, rgba(0,0,0,0.12) 90%, transparent 100%)";

/**
 * 顶部氛围光晕背景层。
 *
 * 将影片海报本身放大、强模糊、提高饱和度后铺在详情页顶部，作为纯装饰的背景气氛，
 * 并叠加一层渐变蒙版把四周压暗收进站点背景色 `#09090b`，从而呈现「随海报智能取色」的观感。
 *
 * 宽度自适应视口（full-bleed）：本组件渲染在 `max-w-[1280px]` 的居中文章内，但光晕需要铺满整个视口。
 * 由于文章 `mx-auto` 居中、其水平中线即视口中线，这里用 `left-1/2 + w-screen + -translate-x-1/2`
 * 让 100vw 宽的光晕以中线对齐撑满视口；`body` 已设 `overflow-x: clip`，不会产生横向滚动条。
 * 左右两侧的收边由 `--sz-detail-glow` 的横向渐变在视口边缘完成。
 *
 * 底部收尾「溶解」进背景：不靠某个实色在固定高度处收口（那样只要实色没在硬裁切边之前精确铺满，
 * 就会留下一条横向硬切线），而是给整层光晕加一个 alpha 遮罩 `mask-image`，让其不透明度自上而下
 * 平滑衰减到 0。这样底层页面背景会自然透出，无需精确配色，物理上也不会出现硬切线（见 FADE_MASK）。
 *
 * 主题差异（方案 C）：该「随海报取色」效果仅在深色模式呈现。亮色模式下白底无法吸收
 * 饱和色，模糊海报会变成过曝色罩并压低正文对比度，因此亮色模式通过 CSS
 * （`html[data-theme="light"] .poster-glow-img { display: none }`）隐藏模糊海报，
 * 仅保留一层极淡的中性渐变，保持页面干净。
 *
 * 该层为纯装饰：`pointer-events-none` 不拦截点击，`<Image alt="" aria-hidden>` 对屏幕阅读器隐藏。
 * 无副作用、无浏览器 API，因此保持为服务端组件（无需 `"use client"`）。
 *
 * @param props - 组件属性
 * @param props.posterUrl - 海报图片地址；为 `undefined`（影片无海报）时组件返回 `null`，不渲染任何节点
 * @returns 海报氛围光晕背景层；无海报时返回 `null`
 *
 * @example
 * ```tsx
 * // 父级需为定位上下文（如 relative），光晕通过绝对定位铺在顶部
 * <PosterAmbientGlow posterUrl={movie.posterUrl} />
 * ```
 */
export function PosterAmbientGlow({ posterUrl }: { posterUrl?: string }) {
  if (!posterUrl) return null;

  return (
    <div
      className="poster-glow pointer-events-none absolute left-1/2 -top-24 h-[760px] w-screen -translate-x-1/2 overflow-hidden opacity-70"
      // 底部溶解遮罩：让整层（模糊海报 + 渐变蒙版）的不透明度自上而下平滑降到 0，
      // 由底层页面背景自然接管，因此无论背景色如何都不会出现硬切线。
      // 用 -webkit- 前缀兼容 WebKit/Safari；上 40% 保持满不透明以托住正文区域的取色氛围。
      style={{ maskImage: FADE_MASK, WebkitMaskImage: FADE_MASK }}
    >
      {/* 被模糊的海报：fill 填满容器，scale-125 防止模糊后露边；亮色模式下由 globals.css 隐藏 */}
      <Image src={posterUrl} alt="" fill className="poster-glow-img scale-125 object-cover blur-3xl saturate-150" sizes="100vw" aria-hidden />
      {/* 渐变蒙版：深色为径向高光 + 轻度纵向压暗（保证正文可读）+ 左右视口收边；亮色为极淡中性渐变（见 --sz-detail-glow）。底部的消隐交给上面的 FADE_MASK。 */}
      <div className="absolute inset-0 bg-[var(--sz-detail-glow)]" />
    </div>
  );
}
