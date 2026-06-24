import Image from "next/image";
import type { Movie } from "@/lib/content";

export type MovieCardProps = {
  movie: Movie;
  priority?: boolean;
  className?: string;
};

/** 影片卡片网格：默认宽视口 6 列，逐级收窄。 */
export const movieCardGridClassName =
  "grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6";

/**
 * 极简影片卡片：竖版海报 + 标题 + 一行元信息。
 * 外层链接由调用方包裹（建议 `<Link className="group block">`）。
 */
export function MovieCard({ movie, priority = false, className }: MovieCardProps) {
  return (
    <article className={className}>
      <div
        className={`relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-gradient-to-br ${movie.posterTone} transition-transform duration-200 group-hover:scale-[1.02]`}
      >
        {movie.posterUrl ? (
          <Image
            src={movie.posterUrl}
            alt={`${movie.title} poster`}
            fill
            className="object-cover"
            loading={priority ? undefined : "lazy"}
            priority={priority}
            sizes="(min-width: 1280px) 16vw, (min-width: 768px) 20vw, 45vw"
          />
        ) : null}
      </div>
      <h3 className="mt-2 truncate text-sm font-medium text-[var(--sz-link)] transition-colors group-hover:text-[var(--sz-accent)]">
        {movie.title}
      </h3>
      <p className="mt-1 truncate text-xs text-[var(--sz-muted)]">
        {movie.year} · {movie.verdict}
      </p>
    </article>
  );
}
