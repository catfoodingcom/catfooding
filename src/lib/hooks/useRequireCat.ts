"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCatFoodStore } from "@/lib/store/useCatFoodStore";

/**
 * Redirects to /adopt if there's no cat — but only once zustand/persist has
 * actually finished reading localStorage. Without the hydration check, a
 * hard reload or direct URL visit to /room, /portfolio, or /settings would
 * see `sim === null` for one render (before hydration completes) and bounce
 * a real, saved cat back to the adoption flow.
 */
export function useRequireCat() {
  const router = useRouter();
  const sim = useCatFoodStore((s) => s.sim);
  const hasHydrated = useCatFoodStore((s) => s.hasHydrated);

  useEffect(() => {
    if (hasHydrated && !sim) router.replace("/adopt");
  }, [hasHydrated, sim, router]);

  return { sim, ready: hasHydrated };
}
