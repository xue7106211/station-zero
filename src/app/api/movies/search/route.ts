import { NextResponse } from "next/server";

import { searchMovies } from "@/lib/movie-api";
import { normalizeSearchQuery } from "@/lib/movie-search";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = normalizeSearchQuery(searchParams.get("q") ?? "");
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(
    30,
    Math.max(1, Number.parseInt(searchParams.get("limit") ?? "20", 10) || 20),
  );

  if (!query) {
    return NextResponse.json(
      {
        query: "",
        items: [],
        total: 0,
        page: 1,
        totalPages: 0,
        hasMore: false,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );
  }

  const result = await searchMovies(query, page, limit);

  return NextResponse.json(
    {
      ...result,
      hasMore: result.currentPage < result.totalPages,
    },
    {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
