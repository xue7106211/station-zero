import Image from "next/image";
import type { MoviePalette } from "@/lib/content";

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
 * 把十六进制色值转为带透明度的 `rgba()` 字符串。
 *
 * 取色库（node-vibrant）落库的是 6 位十六进制（如 `#f47e07`），而合成光晕需要给每个色块
 * 叠加不同透明度，因此在渲染时解析为 rgb 分量并拼上 alpha。
 *
 * @param hex - 6 位十六进制色值，带或不带前导 `#` 均可
 * @param alpha - 透明度（0–1）
 * @returns 形如 `rgba(244, 126, 7, 0.6)` 的字符串
 */
function hexToRgba(hex: string, alpha: number): string {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * 用调色板合成多层径向渐变「色彩 mesh」作为氛围背景。
 *
 * 思路：从海报提取的几个主色（vibrant / lightVibrant / darkVibrant / darkMuted）各放在
 * 顶部不同位置作为柔光色块，向 `transparent` 衰减，互相叠加成一片随海报取色的色场。
 * 每个 swatch 都做了多级回退，保证某个色族缺失时仍有合理替代色。
 * CSS 多背景中**靠前的层绘制在更上层**，这里把高光色放前、暗色铺底放后。
 *
 * @param palette - 海报调色板（后台 node-vibrant 取色落库）
 * @returns 可直接赋给 `background` 的多层渐变字符串
 */
function buildMeshBackground(palette: MoviePalette): string {
  const vibrant = palette.vibrant ?? palette.lightVibrant ?? palette.muted ?? "#3b3b3b";
  const light = palette.lightVibrant ?? palette.vibrant ?? palette.lightMuted ?? vibrant;
  const dark = palette.darkVibrant ?? palette.muted ?? palette.darkMuted ?? vibrant;
  const deep = palette.darkMuted ?? palette.darkVibrant ?? "#09090b";

  return [
    // 左上：主色高光，落在海报/标题区域上方
    `radial-gradient(70% 60% at 16% 8%, ${hexToRgba(vibrant, 0.7)}, transparent 60%)`,
    // 右上：亮色补光，平衡左右
    `radial-gradient(62% 55% at 86% 4%, ${hexToRgba(light, 0.5)}, transparent 58%)`,
    // 顶部中央：暗主色大范围铺陈，为整体定调
    `radial-gradient(110% 80% at 52% -8%, ${hexToRgba(dark, 0.62)}, transparent 72%)`,
    // 纵向铺底：深色自上而下轻微衬底，避免色块之间出现突兀的纯背景缝隙
    `linear-gradient(180deg, ${hexToRgba(deep, 0.55)}, transparent 70%)`,
  ].join(", ");
}

/**
 * 顶部氛围光晕背景层。
 *
 * 背景取色（重构后）：颜色来自后台 node-vibrant 从海报提取、落库到 `movie.palette` 的主色，
 * 在服务端用多层径向渐变合成色彩 mesh（见 buildMeshBackground），而非把整张海报模糊后当色源。
 * 这样背景是「真实主色驱动」的干净色场；取色库见 https://vibrant.dev。
 * 当影片还没有 palette（未取色）但有海报时，降级为「模糊海报」的旧方案，保证始终有氛围背景。
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
 * 饱和色，模糊海报/彩色 mesh 都会变成过曝色罩并压低正文对比度，因此亮色模式通过 CSS
 * 隐藏取色层（`.poster-glow-paint` 与 `.poster-glow-img`），仅保留一层极淡的中性渐变，保持页面干净。
 *
 * 该层为纯装饰：`pointer-events-none` 不拦截点击，`<Image alt="" aria-hidden>` 对屏幕阅读器隐藏。
 * 无副作用、无浏览器 API，因此保持为服务端组件（无需 `"use client"`）。
 *
 * @param props - 组件属性
 * @param props.posterUrl - 海报图片地址；用于无 palette 时的模糊海报降级
 * @param props.palette - 海报主色调色板；存在时驱动彩色 mesh 背景
 * @returns 海报氛围光晕背景层；既无 palette 也无海报时返回 `null`
 *
 * @example
 * ```tsx
 * // 父级需为定位上下文（如 relative），光晕通过绝对定位铺在顶部
 * <PosterAmbientGlow posterUrl={movie.posterUrl} palette={movie.palette} />
 * ```
 */
export function PosterAmbientGlow({ posterUrl, palette }: { posterUrl?: string; palette?: MoviePalette }) {
  const hasPalette = Boolean(palette && Object.keys(palette).length > 0);
  if (!hasPalette && !posterUrl) return null;

  return (
    <div
      className="poster-glow pointer-events-none absolute left-1/2 -top-24 h-[90vh] w-screen -translate-x-1/2 overflow-hidden opacity-80"
      // 底部溶解遮罩：让整层的不透明度自上而下平滑降到 0，由底层页面背景自然接管，无硬切线。
      // 用 -webkit- 前缀兼容 WebKit/Safari；上 40% 保持满不透明以托住正文区域的取色氛围。
      style={{ maskImage: FADE_MASK, WebkitMaskImage: FADE_MASK }}
    >
      {hasPalette ? (
        // 主路径：用提取的主色合成彩色 mesh（亮色模式下由 globals.css 隐藏）
        <div className="poster-glow-paint absolute inset-0" style={{ background: buildMeshBackground(palette!) }} aria-hidden />
      ) : (
        // 降级：还没取色但有海报时，沿用模糊海报作为色源（亮色模式下由 globals.css 隐藏）
        <Image src={posterUrl!} alt="" fill className="poster-glow-img scale-125 object-cover blur-3xl saturate-150" sizes="100vw" aria-hidden />
      )}
      {/* 渐变蒙版：深色为径向高光 + 轻度纵向压暗（保证正文可读）+ 左右视口收边；亮色为极淡中性渐变（见 --sz-detail-glow）。底部的消隐交给上面的 FADE_MASK。 */}
      <div className="absolute inset-0 bg-[var(--sz-detail-glow)]" />
    </div>
  );
}
