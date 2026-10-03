"use client";

import { useSyncExternalStore } from "react";

const subscribe = (onChange: () => void) => {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
};

/** Viewport width in px, updated on resize. Before hydration it reports a phone width, so the
 * first paint never overflows a small screen. */
export function useViewportWidth(): number {
  return useSyncExternalStore(subscribe, () => window.innerWidth, () => 390);
}

/** The cat's on-screen size: as large as `max`, but never wider than the space it sits in. */
export function catSize(viewport: number, max: number, taken: number): number {
  return Math.max(200, Math.min(max, Math.floor(viewport - taken)));
}
