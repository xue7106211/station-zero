import Link from "next/link";

import { buildSearchPageHref } from "@/lib/movie-search";

type MovieSearchPaginationProps = {
  query: string;
  page: number;
  totalPages: number;
};

export function MovieSearchPagination({
  query,
  page,
  totalPages,
}: MovieSearchPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const prevPage = page > 1 ? page - 1 : null;
  const nextPage = page < totalPages ? page + 1 : null;

  return (
    <nav
      aria-label="搜索结果分页"
      className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-[color:var(--sz-border)] pt-6"
    >
      <p className="text-sm text-[color:var(--sz-muted)]">
        第 {page} / {totalPages} 页
      </p>

      <div className="flex items-center gap-3">
        {prevPage ? (
          <Link
            href={buildSearchPageHref(query, prevPage)}
            className="inline-flex min-h-10 items-center rounded-full border border-[color:var(--sz-border)] px-4 text-sm font-medium text-[color:var(--sz-text)] transition hover:border-[color:var(--sz-accent)] hover:text-[color:var(--sz-accent)]"
          >
            上一页
          </Link>
        ) : (
          <span className="inline-flex min-h-10 items-center rounded-full border border-transparent px-4 text-sm text-[color:var(--sz-muted)] opacity-50">
            上一页
          </span>
        )}

        {nextPage ? (
          <Link
            href={buildSearchPageHref(query, nextPage)}
            className="inline-flex min-h-10 items-center rounded-full border border-[color:var(--sz-border)] px-4 text-sm font-medium text-[color:var(--sz-text)] transition hover:border-[color:var(--sz-accent)] hover:text-[color:var(--sz-accent)]"
          >
            下一页
          </Link>
        ) : (
          <span className="inline-flex min-h-10 items-center rounded-full border border-transparent px-4 text-sm text-[color:var(--sz-muted)] opacity-50">
            下一页
          </span>
        )}
      </div>
    </nav>
  );
}
