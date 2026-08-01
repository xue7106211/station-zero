import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import {
  MOVIES_CATALOG_CACHE_TAG,
  MOVIES_CATALOG_REVALIDATE_SECONDS,
} from "@/lib/movie-catalog-cache";

/** POST /api/revalidate?secret=... — 后台脚本在 bulk publish 后刷新列表缓存。 */
export async function POST(request: Request) {
  const configuredSecret = process.env.REVALIDATE_SECRET?.trim();
  if (!configuredSecret) {
    return NextResponse.json({ error: "REVALIDATE_SECRET is not configured" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  if (searchParams.get("secret") !== configuredSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  revalidateTag(MOVIES_CATALOG_CACHE_TAG, { expire: 0 });
  revalidatePath("/", "page");
  revalidatePath("/movies", "page");
  revalidatePath("/search", "page");

  return NextResponse.json({
    revalidated: true,
    tag: MOVIES_CATALOG_CACHE_TAG,
    revalidateSeconds: MOVIES_CATALOG_REVALIDATE_SECONDS,
  });
}
