"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import {
  normalizeThemePreference,
  resolveTheme,
  systemPrefersDark,
  themeStorageKey,
  type ThemePreference,
} from "@/lib/theme";

const THEME_CHANGE_EVENT = "station-zero-theme-change";

const themeOptions: {
  value: ThemePreference;
  label: string;
  Icon: typeof Sun;
}[] = [
  { value: "light", label: "浅色模式", Icon: Sun },
  { value: "dark", label: "深色模式", Icon: Moon },
  { value: "system", label: "跟随系统", Icon: Monitor },
];

function subscribe(onChange: () => void) {
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  return () => window.removeEventListener(THEME_CHANGE_EVENT, onChange);
}

function readPreference(): ThemePreference {
  try {
    return normalizeThemePreference(localStorage.getItem(themeStorageKey));
  } catch {
    return "dark";
  }
}

function getSnapshot(): ThemePreference {
  return readPreference();
}

function getServerSnapshot(): ThemePreference {
  return "dark";
}

function applyPreference(preference: ThemePreference) {
  document.documentElement.dataset.theme = resolveTheme(preference, systemPrefersDark());
  localStorage.setItem(themeStorageKey, preference);
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

export function ThemeToggle() {
  const preference = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    if (preference !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      document.documentElement.dataset.theme = resolveTheme("system", media.matches);
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [preference]);

  return (
    <div
      role="group"
      aria-label="主题模式"
      className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-[color:var(--sz-border)] bg-[var(--sz-surface-soft)] p-0.5 shadow-[inset_0_1px_0_var(--sz-inset)]"
    >
      {themeOptions.map(({ value, label, Icon }) => {
        const active = preference === value;
        return (
          <button
            key={value}
            type="button"
            aria-label={label}
            aria-pressed={active}
            onClick={() => applyPreference(value)}
            className={`pressable flex size-7 items-center justify-center rounded-full transition-[color,background-color,box-shadow] duration-200 ${
              active
                ? "bg-[var(--sz-card-strong)] text-[var(--sz-text-strong)] shadow-[0_1px_3px_var(--sz-shadow)]"
                : "text-[var(--sz-muted)] hover:text-[var(--sz-text-soft)]"
            }`}
          >
            <Icon className="size-4" aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
