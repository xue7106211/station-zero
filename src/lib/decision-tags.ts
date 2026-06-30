type DecisionTag = {
  text: string;
  emphasis: boolean;
};

/** bulk-ingest 入库时策展字段的默认占位文案。 */
export const CURATION_PLACEHOLDER = "待人工补充";

export type DecisionTagFallback = {
  genres?: string[];
  runtime?: string;
  rating?: string;
};

export function isCurationPlaceholder(value: string) {
  const trimmed = value.trim();
  return !trimmed || trimmed === CURATION_PLACEHOLDER;
}

/** 解析决策 Tag 列表：策展占位时不展示占位文案，改读 fallback 客观字段。 */
export function resolveDecisionTags(
  verdict: string,
  bestWay: string,
  fallback?: DecisionTagFallback,
): DecisionTag[] {
  const tags: DecisionTag[] = [];
  const used = new Set<string>();

  const addTag = (text: string, emphasis: boolean) => {
    const trimmed = text.trim();
    if (!trimmed || used.has(trimmed)) return;
    tags.push({ text: trimmed, emphasis });
    used.add(trimmed);
  };

  if (!isCurationPlaceholder(verdict)) {
    addTag(verdict, true);
  } else if (fallback) {
    const emphasis = pickVerdictFallback(fallback);
    if (emphasis) addTag(emphasis, true);
  }

  if (!isCurationPlaceholder(bestWay)) {
    bestWay
      .split(/\s*[+/·]\s*/)
      .map((part) => part.trim())
      .filter(Boolean)
      .forEach((part) => addTag(part, false));
  } else if (fallback) {
    appendBestWayFallback(fallback, tags, used).forEach((tag) => addTag(tag.text, tag.emphasis));
  }

  return tags;
}

function pickVerdictFallback(fallback: DecisionTagFallback): string | undefined {
  const genre = fallback.genres?.find((item) => item.trim());
  if (genre) return genre.trim();

  const rating = fallback.rating?.trim();
  if (rating) return rating;

  return undefined;
}

function appendBestWayFallback(
  fallback: DecisionTagFallback,
  existing: DecisionTag[],
  used: Set<string>,
): DecisionTag[] {
  const tags: DecisionTag[] = [];
  const emphasisText = existing.find((tag) => tag.emphasis)?.text;
  const genres = (fallback.genres ?? []).map((item) => item.trim()).filter(Boolean);

  for (const genre of genres) {
    if (genre === emphasisText || used.has(genre)) continue;
    tags.push({ text: genre, emphasis: false });
  }

  const runtime = fallback.runtime?.trim();
  if (runtime && !used.has(runtime) && runtime !== emphasisText) {
    tags.push({ text: runtime, emphasis: false });
  }

  const rating = fallback.rating?.trim();
  if (rating && !used.has(rating) && rating !== emphasisText) {
    tags.push({ text: rating, emphasis: false });
  }

  return tags;
}
