export const MOVIES_PAGE_SIZE = 12;

export function parseMoviesPage(pageParam?: string): number {
  const page = Number(pageParam);
  if (!Number.isFinite(page) || page < 1) return 1;
  return Math.floor(page);
}

export function paginateMovies<T>(items: T[], page: number, pageSize = MOVIES_PAGE_SIZE) {
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    currentPage,
    totalPages,
    totalItems,
    pageSize,
  };
}

export function buildMoviesPageHref(page: number): string {
  return page <= 1 ? "/movies" : `/movies?page=${page}`;
}

/** 生成分页页码序列，过长时用省略号折叠。 */
export function getPaginationRange(currentPage: number, totalPages: number): (number | "ellipsis")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages: (number | "ellipsis")[] = [1];

  if (currentPage > 3) {
    pages.push("ellipsis");
  }

  const rangeStart = Math.max(2, currentPage - 1);
  const rangeEnd = Math.min(totalPages - 1, currentPage + 1);

  for (let page = rangeStart; page <= rangeEnd; page += 1) {
    pages.push(page);
  }

  if (currentPage < totalPages - 2) {
    pages.push("ellipsis");
  }

  pages.push(totalPages);
  return pages;
}
