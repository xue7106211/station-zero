"use client";

import { useLayoutEffect, useRef, useState } from "react";

type MovieSummaryProps = {
  summary: string;
  className?: string;
};

/**
 * 影片简介：默认最多 5 行，超出时显示「查看更多」展开全文。
 */
export function MovieSummary({ summary, className }: MovieSummaryProps) {
  const textRef = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [truncated, setTruncated] = useState(false);

  useLayoutEffect(() => {
    const element = textRef.current;
    if (!element || expanded) return;

    const measure = () => {
      setTruncated(element.scrollHeight > element.clientHeight + 1);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [summary, expanded]);

  if (!summary.trim()) {
    return null;
  }

  return (
    <div className={className}>
      <p
        ref={textRef}
        className={`text-pretty text-[15px] leading-7 text-[var(--sz-text-soft)] ${
          expanded ? "" : "line-clamp-5"
        }`}
      >
        {summary}
      </p>
      {!expanded && truncated ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-2 text-sm text-[var(--sz-link)] transition-colors hover:text-[var(--sz-accent)] focus-visible:outline-none focus-visible:text-[var(--sz-accent)]"
        >
          查看更多
        </button>
      ) : null}
    </div>
  );
}
