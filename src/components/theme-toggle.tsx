"use client";

import { useState } from "react";
import { Button } from "@heroui/react";
import { normalizeTheme, themeStorageKey, type ThemeName } from "@/lib/theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeName>(() => {
    if (typeof document === "undefined") return "dark";
    return normalizeTheme(document.documentElement.dataset.theme);
  });

  function toggleTheme() {
    const nextTheme: ThemeName = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    localStorage.setItem(themeStorageKey, nextTheme);
    setTheme(nextTheme);
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
