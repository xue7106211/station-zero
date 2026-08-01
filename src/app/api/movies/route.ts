import { NextResponse } from "next/server";
import { getMoviesPage } from "@/lib/movie-api";
import { parseMoviesPage } from "@/lib/movies-pagination";

/** 与首页 ISR 对齐，避免首屏缓存与加载更多实时查询错位。 */
export const revalidate = 86400;

/** GET /api/movies?page=2 — 分页返回已发布影片（供首页「加载更多」）。 */
export async function GET(request: Request) {
  const pageParam = new URL(request.url).searchParams.get("page") ?? undefined;
  const result = await getMoviesPage(parseMoviesPage(pageParam));

  return NextResponse.json(result);
}
