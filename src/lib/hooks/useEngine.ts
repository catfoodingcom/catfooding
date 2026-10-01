"use client";

import { useEffect, useState } from "react";
import type { EngineState } from "@/lib/live/engine";

const POLL_MS = 60_000;

/** Polls /api/engine while enabled. `error` is set when the engine can't be
 * reached at all; a partial read still returns state with `failures` listed. */
export function useEngine(enabled: boolean) {
  const [engine, setEngine] = useState<EngineState | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/engine", { cache: "no-store" });
        const body = (await res.json()) as EngineState;
        if (cancelled) return;
        setEngine(body);
        setError(!body.ok);
      } catch {
        if (!cancelled) setError(true);
      }
    };
    load();
    const handle = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(handle);
    };
  }, [enabled]);

  return { engine, error };
}
