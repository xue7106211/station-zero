"use client";

import { useSyncExternalStore } from "react";
import { Button } from "@heroui/react";
import { normalizeTheme, themeStorageKey, type ThemeName } from "@/lib/theme";

// 主题变更事件：toggleTheme 改写 <html data-theme> 后派发，通知所有订阅者重渲染。
const THEME_CHANGE_EVENT = "station-zero-theme-change";

/**
 * 订阅主题变化（仅在客户端调用）。
 * @param onChange - 主题变更时触发的回调
 * @returns 取消订阅函数
 */
function subscribe(onChange: () => void) {
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  return () => window.removeEventListener(THEME_CHANGE_EVENT, onChange);
}

/** 客户端快照：真实主题来自 <html data-theme>（由 layout 内联脚本在 paint 前写入）。 */
function getSnapshot(): ThemeName {
  return normalizeTheme(document.documentElement.dataset.theme);
}

/** 服务端 / 水合首帧快照：与 layout 的 SSR 兜底 `data-theme="dark"` 保持一致，避免水合不匹配。 */
function getServerSnapshot(): ThemeName {
  return "dark";
}

export function ThemeToggle() {
  // useSyncExternalStore 保证：SSR 与 hydration 首帧用 getServerSnapshot（"dark"），
  // 与服务端 HTML 一致；hydration 完成后再切到 getSnapshot（真实主题），不会报水合错误。
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggleTheme() {
    const nextTheme: ThemeName = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    localStorage.setItem(themeStorageKey, nextTheme);
    // 派发事件触发 useSyncExternalStore 重新读取快照并重渲染。
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }

  const isLight = theme === "light";

  return (
    <Button
      type="button"
      size="sm"
      variant="secondary"
      aria-label={isLight ? "切换到深色模式" : "切换到亮色模式"}
      aria-pressed={isLight}
      onPress={toggleTheme}
      className="pressable min-w-0 rounded-full border border-[color:var(--sz-border)] bg-[var(--sz-surface-soft)] px-3 font-mono text-xs text-[var(--sz-text)] shadow-none"
    >
      <span aria-hidden>{isLight ? "☀" : "☾"}</span>
      <span className="hidden sm:inline">{isLight ? "Light" : "Dark"}</span>
    </Button>
  );
}
