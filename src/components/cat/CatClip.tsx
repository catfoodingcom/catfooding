"use client";

import { useEffect, useRef, useState } from "react";
import type { CatBehaviorState } from "@/lib/types";

/** One short clip per expression. The clip IS the expression: the pose and gesture carry the
 * meaning, so the choice of clip must come from engine state, never from a timer. */
export type CatPose = "beckoning" | "hunt" | "confirmed" | "refuse" | "suspicious" | "sleep" | "waiting" | "watch";

/** Ambient clips end where they began, so they loop. Gesture clips end in a held pose (paw up,
 * nose in the air): they play, hold, then repeat the gesture. */
const LOOPS: Record<CatPose, boolean> = {
  beckoning: false,
  hunt: false,
  confirmed: false,
  refuse: false,
  suspicious: false,
  sleep: true,
  waiting: true,
  watch: true,
};
const HOLD_MS = 5000;

const GLOW: Record<CatPose, string> = {
  beckoning: "var(--acid)",
  hunt: "var(--acid)",
  confirmed: "var(--acid)",
  refuse: "#ff5d5d",
  suspicious: "#ffd23f",
  sleep: "var(--info)",
  waiting: "var(--info)",
  watch: "var(--muted-foreground)",
};

/** Demo mode: the paper cat's behaviour state picks the clip. */
export const POSE_BY_STATE: Record<CatBehaviorState, CatPose> = {
  sleeping: "sleep",
  idle: "waiting",
  watching: "watch",
  stalking: "hunt",
  hunting: "hunt",
  celebrating: "confirmed",
  injured: "sleep",
  nervous: "refuse",
  curious: "watch",
  bored: "waiting",
};

// Fade all four edges of the frame: two linear fades, intersected, give a soft rectangle
// (a single radial fade left the straight sides visible).
const FADE = "linear-gradient(to right, transparent 0%, #000 16%, #000 84%, transparent 100%), linear-gradient(to bottom, transparent 0%, #000 12%, #000 88%, transparent 100%)";
const FEATHER = { maskImage: FADE, WebkitMaskImage: FADE, maskComposite: "intersect", WebkitMaskComposite: "source-in" } as const;

interface CatClipProps {
  pose: CatPose;
  /** Frame width in px. The clips are 3:4, so the frame is this wide and 4/3 as tall. */
  width?: number;
  /** Showreel only: play the clip once from the start and call this when it has been seen
   * (a gesture clip when it ends, an ambient loop after one pass). */
  onDone?: () => void;
}

export function CatClip({ pose, width = 240, onDone }: CatClipProps) {
  const ref = useRef<HTMLVideoElement>(null);
  const [dipped, setDipped] = useState(false);
  const height = Math.round((width * 4) / 3);

  // Gesture clips: play once, hold the final pose, then repeat the gesture behind a short dip
  // so the jump back to the first frame is not seen as a cut.
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (onDone) {
      // showreel: one pass of every clip, then hand back
      video.addEventListener("ended", onDone);
      const guard = setTimeout(onDone, 9000); // never stall the reel if a clip fails to play
      return () => {
        video.removeEventListener("ended", onDone);
        clearTimeout(guard);
      };
    }
    if (LOOPS[pose]) return;
    let hold: ReturnType<typeof setTimeout> | undefined;
    let dip: ReturnType<typeof setTimeout> | undefined;
    const onEnded = () => {
      hold = setTimeout(() => {
        setDipped(true);
        dip = setTimeout(() => {
          video.currentTime = 0;
          void video.play().catch(() => {});
          setDipped(false);
        }, 220);
      }, HOLD_MS);
    };
    video.addEventListener("ended", onEnded);
    return () => {
      video.removeEventListener("ended", onEnded);
      clearTimeout(hold);
      clearTimeout(dip);
    };
  }, [pose, onDone]);

  return (
    <div className="relative" style={{ width, height }}>
      <div
        aria-hidden="true"
        className="absolute inset-0 rounded-full blur-2xl opacity-60"
        style={{ background: `radial-gradient(circle at 50% 55%, color-mix(in srgb, ${GLOW[pose]} 55%, transparent) 0%, transparent 70%)` }}
      />
      {/* The clips have their own dark backdrop. Feathering the edges lets the frame melt into
          the panel in either theme instead of sitting on it as a hard rectangle. */}
      <video
        key={pose}
        ref={ref}
        className="relative h-full w-full object-cover transition-opacity duration-200 motion-reduce:hidden"
        style={{ opacity: dipped ? 0.25 : 1, ...FEATHER }}
        src={`/cat/${pose}.mp4`}
        poster={`/cat/${pose}.jpg`}
        autoPlay
        muted
        playsInline
        loop={LOOPS[pose] && !onDone}
        preload="auto"
        aria-label={`The cat: ${pose}`}
      />
      {/* Reduced motion: the still first frame only. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/cat/${pose}.jpg`}
        alt={`The cat: ${pose}`}
        className="absolute inset-0 hidden h-full w-full object-cover motion-reduce:block"
        style={FEATHER}
      />
    </div>
  );
}
