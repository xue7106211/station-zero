import Image from "next/image";

/**
 * 顶部氛围光晕背景层。
 *
 * 将影片海报本身放大、强模糊、提高饱和度后铺在详情页顶部，作为纯装饰的背景气氛，
 * 并叠加一层渐变蒙版把四周压暗收进站点背景色 `#09090b`，从而呈现「随海报智能取色」的观感。
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
    <div className="poster-glow pointer-events-none absolute inset-x-0 -top-24 h-[760px] overflow-hidden opacity-70">
      {/* 被模糊的海报：fill 填满容器，scale-125 防止模糊后露边；亮色模式下由 globals.css 隐藏 */}
      <Image src={posterUrl} alt="" fill className="poster-glow-img scale-125 object-cover blur-3xl saturate-150" sizes="100vw" aria-hidden />
      {/* 渐变蒙版：深色为径向高光 + 四周压暗收边；亮色为极淡中性渐变（见 --sz-detail-glow） */}
      <div className="absolute inset-0 bg-[var(--sz-detail-glow)]" />
    </div>
  );
}
