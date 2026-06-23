import Image from "next/image";

/**
 * 顶部氛围光晕背景层。
 *
 * 将影片海报本身放大、强模糊、提高饱和度后铺在详情页顶部，作为纯装饰的背景气氛，
 * 并叠加一层渐变蒙版把四周压暗收进站点背景色 `#09090b`，从而呈现「随海报智能取色」的观感。
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
    <div className="pointer-events-none absolute -top-24 left-1/2 h-[760px] w-[140vw] min-w-full -translate-x-1/2 overflow-hidden opacity-70">
      {/* 被模糊的海报：fill 填满容器，priority 优化首屏 LCP，scale-125 防止模糊后露边 */}
      <Image src={posterUrl} alt="" fill className="scale-125 object-cover blur-3xl saturate-150" sizes="100vw" aria-hidden />
      {/* 渐变蒙版：径向高光 + 上下/左右暗化，避免海报色块边缘生硬 */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_32%_18%,rgba(255,255,255,0.16),transparent_24%),linear-gradient(180deg,rgba(9,9,11,0.18)_0%,rgba(9,9,11,0.76)_56%,#09090b_100%),linear-gradient(90deg,#09090b_0%,rgba(9,9,11,0.62)_8%,rgba(9,9,11,0.28)_30%,rgba(9,9,11,0.28)_70%,rgba(9,9,11,0.62)_92%,#09090b_100%)]" />
    </div>
  );
}
