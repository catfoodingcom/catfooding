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
// Glow colours may be theme tokens (var(--acid)), so fade them with color-mix, not a hex alpha suffix.
const alpha = (color: string, percent: number) => `color-mix(in srgb, ${color} ${percent}%, transparent)`;

const GLOW_BY_STATE: Record<CatBehaviorState, string> = {
  sleeping: "var(--info)",
  idle: "var(--acid)",
  watching: "var(--acid)",
  stalking: "var(--acid)", // paw up: glows in the accent colour
  hunting: "#ff4fa6",
  celebrating: "var(--acid)",
  injured: "#ff5d5d",
  nervous: "#ff5d5d",
  curious: "var(--info)",
  bored: "var(--muted-foreground)",
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
   * lives, relative to /public. */
  modelUrl?: string;
  /** Uses a neutral loading shell instead of flashing the legacy SVG avatar
   * while the GLB is loading. Error fallback still uses SVG for resilience. */
  showSvgWhileLoading?: boolean;
}

const DEFAULT_MODEL_URL = "/models/cat-standing.glb";
const HUNGRY_MODEL_URL = "/models/cat-hungry.glb";
const SLEEPY_MODEL_URL = "/models/cat-sleepy.glb";
const BECKONING_MODEL_URL = "/models/cat-beckoning.glb";
const SITTING_MODEL_URL = "/models/cat-sitting.glb";

// The pose IS the expression: one model per behaviour. Paw raised means the cat would act
// (HUNT); sitting means it is waiting (WAIT); standing is the neutral watch (WATCH).
// There is no turn-away pose for a refusal yet: REFUSE stands, and reads through the red
// glow and the card. The hungry and sleepy models are the older head-only style.
const MODEL_BY_STATE: Partial<Record<CatBehaviorState, string>> = {
  stalking: BECKONING_MODEL_URL,
  hunting: BECKONING_MODEL_URL,
  celebrating: BECKONING_MODEL_URL,
  watching: SITTING_MODEL_URL,
  nervous: DEFAULT_MODEL_URL,
  sleeping: SLEEPY_MODEL_URL,
  injured: HUNGRY_MODEL_URL,
};
const HUNGRY_THRESHOLD = 70;

// All small (a few hundred KB each) — preloading them means a model swap
// (crossing the hunger threshold, falling asleep) doesn't hit a Suspense
// flash back to the SVG fallback the first time it happens.
useGLTF.preload(DEFAULT_MODEL_URL);
useGLTF.preload(HUNGRY_MODEL_URL);
useGLTF.preload(SLEEPY_MODEL_URL);
useGLTF.preload(BECKONING_MODEL_URL);
useGLTF.preload(SITTING_MODEL_URL);

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
        background: `radial-gradient(circle at 50% 42%, ${alpha(glow, 20)} 0%, ${alpha(glow, 10)} 36%, transparent 74%)`,
      }}
    />
  );
  const isHungry = (hunger ?? 0) >= HUNGRY_THRESHOLD;
  // Model-swap "expressions": the behaviour state picks the pose (see MODEL_BY_STATE). A
  // state with its own pose wins; otherwise a hungry cat shows the hungry model, else the
  // default standing one. The refuse also reads via the RED glow + card.
  const resolvedModelUrl = modelUrl ?? MODEL_BY_STATE[state] ?? (isHungry ? HUNGRY_MODEL_URL : DEFAULT_MODEL_URL);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <motion.div
        className="absolute inset-0 rounded-full blur-2xl"
        // Radial halo (bright behind the cat, fading to transparent) instead of a
        // solid color field — keeps the glow BEHIND the cat so the cat reads clearly.
        style={{ background: `radial-gradient(circle at 50% 46%, ${alpha(glow, 80)} 0%, ${alpha(glow, 33)} 44%, transparent 74%)` }}
        animate={{ opacity: [0.5, 0.85, 0.5] }}
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
