"use client";

import { useEffect } from "react";
import type { CatBehaviorState } from "@/lib/types";
import { useCatFoodStore } from "@/lib/store/useCatFoodStore";
import { CatAvatar3D } from "./CatAvatar3D";
import { CatClip, type CatPose } from "./CatClip";

/** The 3D models express a pose through the behaviour state that selects the model. */
const STATE_FOR_POSE: Record<CatPose, CatBehaviorState> = {
  beckoning: "stalking",
  hunt: "hunting",
  confirmed: "celebrating",
  refuse: "nervous",
  suspicious: "nervous",
  sleep: "sleeping",
  waiting: "watching",
  watch: "idle",
};

/** The expressions in showreel order, with what each one means. */
export const SHOWREEL: { pose: CatPose; label: string }[] = [
  { pose: "watch", label: "WATCH · allowed, but nothing is strong" },
  { pose: "waiting", label: "WAIT · a calendar hold, or the real share isn't trading" },
  { pose: "beckoning", label: "HUNT · something in the index is worth buying" },
  { pose: "hunt", label: "ACT · the gate has approved a staged buy" },
  { pose: "confirmed", label: "CONFIRMED · a trade has landed on-chain" },
  { pose: "suspicious", label: "REFUSE · priced too far from the real share" },
  { pose: "refuse", label: "REFUSE · thin, stale or unproven" },
  { pose: "sleep", label: "SLEEP · paused" },
];

interface CatStageProps {
  pose: CatPose;
  /** Showreel only: play the pose once and report when it has been seen. */
  onDone?: () => void;
}

/** The cat, in whichever style the visitor chose on the Training page: the video clips
 * (default) or the 3D models. Both are driven by the same pose. */
export function CatStage({ pose, onDone }: CatStageProps) {
  const style = useCatFoodStore((s) => s.catStyle);
  if (style === "3d") {
    return (
      <div className="flex items-center justify-center" style={{ width: 240, height: 320 }}>
        <CatAvatar3D state={STATE_FOR_POSE[pose]} mood={40} size={240} evolutionStage="Hunter" hunger={0} showSvgWhileLoading={false} />
        {onDone && <Advance key={pose} onDone={onDone} />}
      </div>
    );
  }
  return <CatClip pose={pose} width={240} onDone={onDone} />;
}

/** The 3D models have no "ended" event, so the showreel moves on after a fixed time. */
function Advance({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 4000);
    return () => clearTimeout(t);
  }, [onDone]);
  return null;
}
