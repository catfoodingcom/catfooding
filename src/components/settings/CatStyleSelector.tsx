"use client";

import { useCatFoodStore, type CatStyle } from "@/lib/store/useCatFoodStore";

const STYLES: { id: CatStyle; label: string; note: string }[] = [
  { id: "video", label: "Video clips", note: "eight animated expressions (default)" },
  { id: "3d", label: "3D models", note: "three poses you can see turn" },
];

/** How the cat is drawn. Both styles are driven by the same engine verdict. */
export function CatStyleSelector() {
  const style = useCatFoodStore((s) => s.catStyle);
  const setStyle = useCatFoodStore((s) => s.setCatStyle);
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {STYLES.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => setStyle(s.id)}
          aria-pressed={style === s.id}
          className={`rounded-lg border-2 p-3 text-left transition-colors ${style === s.id ? "border-acid bg-ink" : "border-border hover:border-muted-foreground"}`}
        >
          <span className="block font-mono text-xs text-cream">{s.label}</span>
          <span className="block font-mono text-[10px] text-muted-foreground">{s.note}</span>
        </button>
      ))}
    </div>
  );
}
