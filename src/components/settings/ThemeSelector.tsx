"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";

export const THEMES = [
  { id: "blue", label: "Terminal blue", note: "the default", swatch: ["#0a0c14", "#4dc4ff", "#ff4fa6", "#a78bfa"] },
  { id: "green", label: "Acid green", note: "the original", swatch: ["#0d0e0c", "#baff29", "#ff4fa6", "#5fd0ff"] },
] as const;

const noop = () => () => {};

/** Colour theme choice, remembered per browser. Red (refuse) and amber (wait)
 * are the same in every theme because they carry meaning. */
export function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  // The saved theme is only known in the browser; render the choice after hydration.
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const current = mounted ? (theme ?? "blue") : null;

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {THEMES.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => setTheme(t.id)}
          aria-pressed={current === t.id}
          className={`flex items-center gap-3 rounded-lg border-2 p-3 text-left transition-colors ${current === t.id ? "border-acid bg-ink" : "border-border hover:border-muted-foreground"}`}
        >
          <span className="flex shrink-0 overflow-hidden rounded border border-border">
            {t.swatch.map((c) => (
              <span key={c} className="h-6 w-4" style={{ background: c }} />
            ))}
          </span>
          <span>
            <span className="block font-mono text-xs text-cream">{t.label}</span>
            <span className="block font-mono text-[10px] text-muted-foreground">{t.note}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
