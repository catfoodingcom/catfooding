"use client";

import { Component, Suspense, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Canvas } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import type { CatBehaviorState, EvolutionStage } from "@/lib/types";
import { CatAvatarModel } from "./CatAvatarModel";
import { CatAvatar } from "./CatAvatar";

// Same palette as the SVG avatar's GLOW_BY_STATE (and CatAvatarModel's
// STATE_GLOW material tint) — the blurred haze behind the canvas so the 3D
// avatar sits inside the same soft glow the SVG one always had.
const GLOW_BY_STATE: Record<CatBehaviorState, string> = {
  sleeping: "#5fd0ff",
  idle: "#baff29",
  watching: "#baff29",
  stalking: "#ffb84f",
  hunting: "#ff4fa6",
  celebrating: "#baff29",
  injured: "#ff5d5d",
  nervous: "#ff5d5d",
  curious: "#5fd0ff",
  bored: "#9a9887",
};

interface CatAvatar3DProps {
  state: CatBehaviorState;
  mood: number;
  size?: number;
  /** Grows the model — same head at every stage, just scaled — so a
   * Legendary cat visibly reads as bigger than a Kitten without needing
   * separate art per stage. Defaults to a mid-sized "Hunter" scale for
   * call sites (landing/adopt previews) that don't have a real cat yet. */
  evolutionStage?: EvolutionStage;
  /** 0-100, same scale as CatState.hunger. At/above HUNGRY_THRESHOLD, swaps
   * in the dedicated hungry-cat model instead of the default one — a
   * distinct look for "needs feeding," independent of `state` (which
   * drives motion/expression on whichever model is loaded). Omit for call
   * sites with no real cat (landing/adopt previews). */
  hunger?: number;
  /** Explicit override — when set, always used verbatim instead of the
   * hunger-based default/hungry choice below. Where the exported GLB
   * lives, relative to /public. Drop the Meshy export at
   * catfood/public/models/cat.glb and this just works. */
  modelUrl?: string;
  /** Uses a neutral loading shell instead of flashing the legacy SVG avatar
   * while the GLB is loading. Error fallback still uses SVG for resilience. */
  showSvgWhileLoading?: boolean;
}

const DEFAULT_MODEL_URL = "/models/cat.glb";
const HUNGRY_MODEL_URL = "/models/cat-hungry.glb";
const SLEEPY_MODEL_URL = "/models/cat-sleepy.glb";
const HUNGRY_THRESHOLD = 70;

// Only the default model is used right now — the cat-hungry / cat-sleepy exports
// render blank (white), so preloading + swapping to them caused a white square on
// refresh. Preload just the one good model. (Re-export those GLBs to re-enable swaps.)
useGLTF.preload(DEFAULT_MODEL_URL);

/** Suspense catches the "still loading" case; it does not catch errors.
 * A missing/broken GLB (e.g. nothing has been dropped into
 * public/models/ yet) throws inside useGLTF, so this boundary catches
 * that and falls back to the SVG avatar permanently for this mount
 * instead of crashing the page. */
class ModelErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.warn("CatAvatar3D: falling back to SVG avatar —", error);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** Drop-in 3D replacement for <CatAvatar> — same `state`/`mood`/`size`
 * contract, so nothing else needs to change to swap it in. Renders the
 * SVG avatar as both the loading placeholder and the permanent fallback
 * if no GLB has been provided yet, so this is always safe to use. */
export function CatAvatar3D({
  state,
  mood,
  size = 220,
  evolutionStage,
  hunger,
  modelUrl,
  showSvgWhileLoading = true,
}: CatAvatar3DProps) {
  const fallback = <CatAvatar state={state} mood={mood} size={size} />;
  const glow = GLOW_BY_STATE[state];
  const loadingFallback = showSvgWhileLoading ? (
    fallback
  ) : (
    <div
      aria-hidden="true"
      className="rounded-full"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 50% 42%, ${glow}33 0%, ${glow}1a 36%, transparent 74%)`,
      }}
    />
  );
  const isHungry = (hunger ?? 0) >= HUNGRY_THRESHOLD;
  // Always the known-good model (cat-hungry/cat-sleepy exports render white). Per-state
  // difference is carried by glow + motion; the refuse beat by the RED glow + REFUSED card.
  void isHungry; void HUNGRY_MODEL_URL; void SLEEPY_MODEL_URL;
  const resolvedModelUrl = modelUrl ?? DEFAULT_MODEL_URL;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <motion.div
        className="absolute inset-0 rounded-full blur-2xl"
        style={{ background: glow }}
        animate={{ opacity: [0.25, 0.5, 0.25] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="relative" style={{ width: size, height: size }}>
        <ModelErrorBoundary fallback={fallback}>
          <Suspense fallback={loadingFallback}>
            <Canvas camera={{ position: [0, 0, 4.2], fov: 30 }} dpr={[1, 2]}>
              <ambientLight intensity={0.8} />
              <directionalLight position={[2, 3, 2]} intensity={1.4} />
              <directionalLight position={[-2, 1, -1]} intensity={0.4} />
              <CatAvatarModel key={resolvedModelUrl} url={resolvedModelUrl} state={state} mood={mood} evolutionStage={evolutionStage} />
            </Canvas>
          </Suspense>
        </ModelErrorBoundary>
      </div>
    </div>
  );
}
