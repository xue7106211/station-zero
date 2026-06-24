"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { Movie } from "@/lib/content";

export type MovieCardProps = {
  movie: Movie;
  priority?: boolean;
  className?: string;
};

/** 影片卡片网格：默认宽视口 6 列，逐级收窄。 */
export const movieCardGridClassName =
  "grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6";

function MovieCardPoster({ movie, priority = false }: { movie: Movie; priority?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(priority);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (priority) return;

    const node = containerRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "240px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [priority]);

  const showSkeleton = Boolean(movie.posterUrl) && (!isVisible || !isLoaded);

  return (
    <div
      ref={containerRef}
      className={`relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-gradient-to-br ${movie.posterTone} transition-transform duration-200 group-hover:scale-[1.02]`}
    >
      {showSkeleton ? (
        <div
          className="absolute inset-0 z-10 bg-[var(--sz-surface-soft)]"
          role="status"
          aria-label={`${movie.title} 海报加载中`}
        >
          <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-[var(--sz-surface-muted)] via-[var(--sz-surface-soft)] to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[var(--sz-bg)]/20 to-transparent" />
        </div>
      ) : null}

      {isVisible && movie.posterUrl ? (
        <Image
          src={movie.posterUrl}
          alt={`${movie.title} poster`}
          fill
          className={`object-cover transition-opacity duration-300 ${isLoaded ? "opacity-100" : "opacity-0"}`}
          loading={priority ? undefined : "lazy"}
          priority={priority}
          sizes="(min-width: 1280px) 16vw, (min-width: 768px) 20vw, 45vw"
          onLoad={() => setIsLoaded(true)}
        />
      ) : null}
    </div>
  );
}

/**
 * 极简影片卡片：竖版海报 + 标题 + 一行元信息。
 * 外层链接由调用方包裹（建议 `<Link className="group block">`）。
 */
export function MovieCard({ movie, priority = false, className }: MovieCardProps) {
  return (
    <article className={className}>
      <MovieCardPoster movie={movie} priority={priority} />
      <h3 className="mt-2 truncate text-sm font-medium text-[var(--sz-link)] transition-colors group-hover:text-[var(--sz-accent)]">
        {movie.title}
      </h3>
      <p className="mt-1 truncate text-xs text-[var(--sz-muted)]">
        {movie.year} · {movie.verdict}
      </p>
    </article>
  );
}
