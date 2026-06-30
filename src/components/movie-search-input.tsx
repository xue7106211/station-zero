"use client";

/**
 * MovieSearchInput — 影片搜索输入框（客户端）。
 *
 * 用于吸顶头部（`compact`）、搜索页回显、移动端 Drawer。
 * 提交后不请求 API，而是通过 `router.push` 导航至 `/search?q=`，由搜索页 SSR 取数。
 */

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import {
  buildSearchPageHref,
  isSearchQueryValid,
  normalizeSearchQuery,
} from "@/lib/movie-search";

/** `MovieSearchInput` 组件的属性。 */
type MovieSearchInputProps = {
  /** 输入框初始值；搜索页用于回显 URL 中的 `q`。 */
  defaultValue?: string;
  /** 紧凑 pill 样式，用于 `site-header`；隐藏可见提交按钮，回车即搜。 */
  compact?: boolean;
  /** 校验通过并发起导航后的回调；移动端 Drawer 用于关闭菜单。 */
  onSubmitted?: () => void;
};

/**
 * 影片搜索框：规范化查询 → 校验 → 跳转 `/search`。
 *
 * 行为说明：
 * - 文本至少 2 字符，或符合 IMDB 编号格式（见 `movie-search`）；
 * - `compact` 与默认模式共用同一套校验，仅布局与 placeholder 不同；
 * - 校验失败时在表单下方展示 inline 错误，不离开当前页。
 *
 * @param props - 搜索框配置
 * @param props.defaultValue - 初始输入值
 * @param props.compact - 是否使用头部紧凑样式
 * @param props.onSubmitted - 成功提交后的副作用回调
 * @returns 带图标与提交控件的 `<form role="search">`
 */
export function MovieSearchInput({
  defaultValue = "",
  compact = false,
  onSubmitted,
}: MovieSearchInputProps) {
  const router = useRouter();
  /** 受控输入值；与 `<input value>` 绑定。 */
  const [value, setValue] = useState(defaultValue);
  /** 客户端校验失败时的提示文案；`null` 表示无错误。 */
  const [error, setError] = useState<string | null>(null);

  /** 同一页面多处挂载时需唯一 id，供 `<label htmlFor>` 关联。 */
  const inputId = compact ? "header-movie-search" : "movie-search";

  /**
   * 拦截原生 form 提交，在前端校验通过后客户端路由至搜索结果页。
   *
   * @param event - React 表单 submit 事件；调用 `preventDefault` 避免整页刷新
   */
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
      {/* 视觉隐藏标签：满足可访问性，不占用头部横向空间 */}
      <label className="sr-only" htmlFor={inputId}>
        搜索影片、IMDB 编号或影人
      </label>

      {/* pill 容器：头部 compact 使用更小 padding / 字号 */}
      <div
        className={`flex items-center gap-2 rounded-full border border-[color:var(--sz-border)] bg-[var(--sz-surface-soft)] ${
          compact ? "px-2 py-1" : "px-3 py-2"
        }`}
      >
        <Search
          className="size-4 shrink-0 text-[var(--sz-muted)]"
          aria-hidden
        />
        <input
          id={inputId}
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

        {/*
         * compact：提交按钮 sr-only，仅保留可聚焦的 submit 控件供键盘/读屏；
         * default：显示主色「搜索」按钮，便于搜索页明确操作。
         */}
        {!compact ? (
          <button
            type="submit"
            className="pressable shrink-0 rounded-full bg-[var(--sz-accent)] px-3 py-1 text-sm font-medium text-[var(--sz-accent-contrast)]"
          >
            搜索
          </button>
        ) : (
          <button type="submit" className="pressable sr-only">
            搜索
          </button>
        )}
      </div>

      {error ? (
        <p className="mt-1 text-xs text-[var(--sz-warn)]">{error}</p>
      ) : null}
    </form>
  );
}
