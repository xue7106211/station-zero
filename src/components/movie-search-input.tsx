"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { buildSearchPageHref, isSearchQueryValid, normalizeSearchQuery } from "@/lib/movie-search";

type MovieSearchInputProps = {
  /** 受控初始值（如搜索结果页回显）。 */
  defaultValue?: string;
  /** 紧凑样式，用于吸顶头部。 */
  compact?: boolean;
  /** 提交后回调（移动端抽屉关闭等）。 */
  onSubmitted?: () => void;
};

/**
 * 影片搜索框：GET 提交至 `/search?q=`。
 */
export function MovieSearchInput({ defaultValue = "", compact = false, onSubmitted }: MovieSearchInputProps) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = normalizeSearchQuery(value);
    if (!isSearchQueryValid(query)) {
      setError("请输入至少 2 个字符，或有效的 IMDB 编号");
      return;
    }
    setError(null);
    onSubmitted?.();
    router.push(buildSearchPageHref(query));
  };

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      className={compact ? "site-header__search w-full max-w-xs" : "w-full"}
    >
      <label className="sr-only" htmlFor={compact ? "header-movie-search" : "movie-search"}>
        搜索影片、IMDB 编号或影人
      </label>
      <div
        className={`flex items-center gap-2 rounded-full border border-[color:var(--sz-border)] bg-[var(--sz-surface-soft)] ${
          compact ? "px-2 py-1" : "px-3 py-2"
        }`}
      >
        <Search className="size-4 shrink-0 text-[var(--sz-muted)]" aria-hidden />
        <input
          id={compact ? "header-movie-search" : "movie-search"}
          name="q"
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            if (error) setError(null);
          }}
          placeholder={compact ? "搜索影片…" : "输入影片 / IMDB 编号 / 影人"}
          className={`min-w-0 flex-1 bg-transparent text-[var(--sz-text)] outline-none placeholder:text-[var(--sz-muted)] ${
            compact ? "text-sm" : "text-base"
          }`}
        />
        {!compact ? (
          <button
            type="submit"
            className="pressable shrink-0 rounded-full bg-[var(--sz-accent)] px-3 py-1 text-sm font-medium text-[var(--sz-accent-contrast)]"
          >
            搜索
          </button>
        ) : (
          <button
            type="submit"
            className="pressable sr-only"
          >
            搜索
          </button>
        )}
      </div>
      {error ? <p className="mt-1 text-xs text-[var(--sz-warn)]">{error}</p> : null}
    </form>
  );
}
