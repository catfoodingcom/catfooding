"use client";

/* eslint-disable react-hooks/immutability -- react-three-fiber's whole
   animation model is mutating Object3D transforms (position/rotation on
   refs and on nodes pulled out of a memoized scene graph) inside
   useFrame every tick, instead of triggering React re-renders. That's the
   documented, idiomatic pattern here, not a bug the immutability rule
   should be catching. */

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { SkeletonUtils } from "three-stdlib";
import { useFrame } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import type { CatBehaviorState, EvolutionStage } from "@/lib/types";

interface CatAvatarModelProps {
  url: string;
  state: CatBehaviorState;
  mood: number; // -100..100
  evolutionStage?: EvolutionStage;
}

// The cat physically grows as it levels up — same body/head model at every
// stage (see the earlier decision to defer full per-stage art), scaled by
// age instead. Kitten is deliberately small; Legendary is the biggest a cat
// gets. Mirrors the level thresholds in evolutionStageForLevel (lib/types/cat.ts).
const SIZE_BY_EVOLUTION_STAGE: Record<EvolutionStage, number> = {
  Kitten: 0.72,
  "Street Cat": 0.85,
  Hunter: 1,
  "Cyber Cat": 1.1,
  "Apex Cat": 1.22,
  Legendary: 1.35,
};

/** Per-state procedural motion tuning. Drives whatever the GLB gives us to
 * work with: named head/paw/tail/ear bones on a rigged body, or — the
 * common case for a plain Meshy face export with no rig at all — the
 * whole object turning/tilting like a head looking around. */
const MOTION_PROFILE: Record<
  CatBehaviorState,
  { headAmp: number; headSpeed: number; pawAmp: number; pawSpeed: number; tailAmp: number; tailSpeed: number; bob: number }
> = {
  sleeping: { headAmp: 0.02, headSpeed: 0.4, pawAmp: 0, pawSpeed: 0, tailAmp: 0.03, tailSpeed: 0.5, bob: 0.01 },
  idle: { headAmp: 0.12, headSpeed: 0.7, pawAmp: 0.03, pawSpeed: 0.7, tailAmp: 0.18, tailSpeed: 0.9, bob: 0.03 },
  watching: { headAmp: 0.28, headSpeed: 0.5, pawAmp: 0.02, pawSpeed: 0.5, tailAmp: 0.12, tailSpeed: 0.6, bob: 0.02 },
  stalking: { headAmp: 0.16, headSpeed: 0.9, pawAmp: 0.08, pawSpeed: 1.4, tailAmp: 0.22, tailSpeed: 1.6, bob: 0.02 },
  hunting: { headAmp: 0.35, headSpeed: 2.2, pawAmp: 0.2, pawSpeed: 3.2, tailAmp: 0.3, tailSpeed: 2.8, bob: 0.05 },
  celebrating: { headAmp: 0.4, headSpeed: 3, pawAmp: 0.3, pawSpeed: 3.6, tailAmp: 0.5, tailSpeed: 4, bob: 0.12 },
  injured: { headAmp: 0.04, headSpeed: 0.4, pawAmp: 0, pawSpeed: 0, tailAmp: 0.04, tailSpeed: 0.4, bob: 0.01 },
  nervous: { headAmp: 0.22, headSpeed: 3.4, pawAmp: 0.05, pawSpeed: 2.8, tailAmp: 0.35, tailSpeed: 3.8, bob: 0.02 },
  curious: { headAmp: 0.3, headSpeed: 0.8, pawAmp: 0.06, pawSpeed: 0.9, tailAmp: 0.2, tailSpeed: 1.1, bob: 0.03 },
  bored: { headAmp: 0.08, headSpeed: 0.3, pawAmp: 0, pawSpeed: 0.2, tailAmp: 0.08, tailSpeed: 0.4, bob: 0.015 },
};

// Same palette as the SVG avatar's GLOW_BY_STATE, applied here as a subtle
// emissive tint rather than a full recolor — until real facial expressions
// exist (see below), this is the main per-state visual differentiation on
// a face model that's otherwise just sitting there with one fixed shape.
// Kept intentionally FAINT — the state color is carried by the halo BEHIND the cat
// (CatAvatar3D), so this on-material tint is only a whisper; the cat keeps its true
// texture/color. (Was up to 0.45, which washed the whole cat in the state color.)
const STATE_GLOW: Record<CatBehaviorState, { color: string; intensity: number }> = {
  sleeping: { color: "#5fd0ff", intensity: 0.03 },
  idle: { color: "#baff29", intensity: 0.02 },
  watching: { color: "#baff29", intensity: 0.03 },
  stalking: { color: "#ffb84f", intensity: 0.04 },
  hunting: { color: "#ff4fa6", intensity: 0.06 },
  celebrating: { color: "#baff29", intensity: 0.06 },
  injured: { color: "#ff5d5d", intensity: 0.08 },
  nervous: { color: "#ff5d5d", intensity: 0.1 },
  curious: { color: "#5fd0ff", intensity: 0.03 },
  bored: { color: "#9a9887", intensity: 0.02 },
};

// If a future export adds Blender shape keys (glTF morph targets) for real
// facial expressions, match them up against these state groups — the same
// 6-expression grouping the SVG avatar already uses (see
// CatAvatar.tsx's GLOW_BY_STATE/Eyes groupings). Listed most-specific-first
// so e.g. "sleepy" is preferred over a generic "closed" match.
const EXPRESSION_SYNONYMS: Record<CatBehaviorState, string[]> = {
  sleeping: ["sleepy", "sleep", "eyesclosed", "closed"],
  idle: ["neutral", "idle", "default"],
  watching: ["neutral", "alert", "focus"],
  curious: ["neutral", "alert", "focus"],
  bored: ["neutral", "idle"],
  stalking: ["alert", "focus", "narrow"],
  hunting: ["alert", "focus", "narrow"],
  celebrating: ["happy", "joy", "smile"],
  nervous: ["worried", "scared", "nervous", "wide"],
  injured: ["dazed", "hurt", "dizzy", "xeyes"],
};

const HEAD_KEYWORDS = ["head", "neck"];
const PAW_KEYWORDS = ["paw", "hand", "foot", "feet", "leg", "arm"];
const TAIL_KEYWORDS = ["tail"];
const EAR_KEYWORDS = ["ear"];

function findNodesByKeyword(root: THREE.Object3D, keywords: string[]) {
  const found: THREE.Object3D[] = [];
  root.traverse((child) => {
    const name = child.name.toLowerCase();
    if (keywords.some((k) => name.includes(k))) found.push(child);
  });
  // Rigs commonly pair a real joint with an "end"/tip effector bone right
  // below it (e.g. "head" + "headend") that carries no useful rotation of
  // its own — driving both compounds into a double-nod. Prefer the real
  // joint whenever one exists in the same group; keep the tip bones only
  // when they're all we found (e.g. this rig's ears are tip-only bones).
  const primary = found.filter((n) => !n.name.toLowerCase().includes("end"));
  return primary.length > 0 ? primary : found;
}

function findMorphMeshes(root: THREE.Object3D) {
  const found: THREE.Mesh[] = [];
  root.traverse((child) => {
    if (child instanceof THREE.Mesh && child.morphTargetDictionary && child.morphTargetInfluences?.length) found.push(child);
  });
  return found;
}

/** Best-matching morph target key for a state, or null if this mesh has no
 * target whose name loosely matches (e.g. it has shape keys for some other
 * purpose entirely). Matching is case-insensitive substring, most-specific
 * synonym first. */
function pickMorphTarget(dict: Record<string, number>, state: CatBehaviorState): string | null {
  const keys = Object.keys(dict);
  for (const synonym of EXPRESSION_SYNONYMS[state]) {
    const hit = keys.find((k) => k.toLowerCase().includes(synonym));
    if (hit) return hit;
  }
  return null;
}

/** Renders a GLB cat and animates it every frame, adapting to whatever the
 * file actually contains:
 * - Morph targets (Blender shape keys exported as glTF blend shapes) →
 *   crossfades to whichever target best matches the current behaviour
 *   state. This is the intended long-term path for real facial expressions.
 * - A rigged body with named head/paw/tail/ear bones → rotates those
 *   procedurally per state (no morph targets needed).
 * - Neither (a plain single-mesh face export, e.g. straight out of Meshy
 *   Image-to-3D with no rig or shape keys) → animates the whole object like
 *   a head looking around, plus a per-state emissive tint, so it's never
 *   just a frozen mask even before real expressions exist. */
export function CatAvatarModel({ url, state, mood, evolutionStage = "Hunter" }: CatAvatarModelProps) {
  const group = useRef<THREE.Group>(null);
  const gltf = useGLTF(url);
  const { actions, names } = useAnimations(gltf.animations, group);

  // Clone the scene once per mount so multiple avatars (or re-mounts) never
  // share transforms/materials — mutating a cached useGLTF result in place
  // would bleed into every other instance on the page. Plain
  // Object3D.clone(true) does NOT correctly re-link a SkinnedMesh's
  // skeleton to the newly cloned bones — it keeps pointing at the
  // original (detached, never-updated) bones, which renders as either a
  // frozen bind pose or nothing at all. SkeletonUtils.clone does the
  // proper bone re-linking, and is a safe no-op for a plain unskinned mesh.
  const scene = useMemo(() => SkeletonUtils.clone(gltf.scene) as THREE.Group, [gltf.scene]);

  // Clone materials too, so the per-state tint below never bleeds into a
  // material shared with anything else that happens to reuse this GLB.
  useEffect(() => {
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        child.material = Array.isArray(child.material) ? child.material.map((m) => m.clone()) : child.material.clone();
      }
    });
  }, [scene]);

  // Normalize scale/position: exports come in at whatever unit scale their
  // source file used (a Blender export authored in cm-as-meters can come in
  // thousands of times smaller than a typical one-unit prop), so this fits
  // the model's bounding box to a fixed on-screen size and centers it,
  // rather than assuming the export is already ~1 unit across. Same
  // approach used for the GLB props on the main site.
  //
  // Box3.setFromObject measures in WORLD space, i.e. it already reflects
  // whatever scale/position is currently set — so this must reset both to
  // identity before measuring. Without that reset, a second run of this
  // effect (React re-invokes effects in dev, and Fast Refresh can too)
  // would measure the already-normalized (~1.7 unit) result, compute a
  // near-1x "correction", and overwrite the real scale with it — silently
  // shrinking the model back down to its raw, near-invisible export size.
  useEffect(() => {
    scene.scale.set(1, 1, 1);
    scene.position.set(0, 0, 0);
    scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    // Fit by what the camera actually sees: width and height. Depth is excluded, because a
    // full-body model that is deep front-to-back would otherwise be shrunk to fit a dimension
    // that points away from the viewer, and end up small in the frame.
    const maxDim = Math.max(size.x, size.y) || 1;
    // Deliberately leaves headroom in the camera frame (see CatAvatar3D's
    // camera distance/fov) rather than filling it edge-to-edge — a model
    // sized to just barely fit gets clipped the moment it floats at all.
    // The evolution-stage multiplier is applied on top, within that
    // headroom, so an Apex/Legendary cat visibly reads as bigger without
    // needing a separate model per stage.
    // The frame is ~2.25 units tall at this camera distance/fov; cap below that so the
    // largest stage still clears the edges while it bobs.
    const targetSize = Math.min(2.0, 1.6 * SIZE_BY_EVOLUTION_STAGE[evolutionStage]);
    const scale = targetSize / maxDim;
    scene.scale.setScalar(scale);
    scene.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
    scene.updateMatrixWorld(true);

    // SkinnedMesh.bindMatrix is captured once, at whatever scale the scene
    // graph had when the skin was bound (GLTF parse time, on the original
    // — tiny — authored transform). It does not follow later changes to
    // an ancestor's scale/position, like the ones just above. Left stale,
    // the skin deformation math ends up applying our scale factor twice
    // (once baked into the frozen bind matrices, once via the mesh's
    // now-current matrixWorld), silently corrupting every vertex position
    // rather than throwing. Re-binding recaptures a bindMatrix consistent
    // with the transform we just applied. A no-op for an unskinned mesh
    // (e.g. a plain face export) since the traversal just finds nothing.
    scene.traverse((child) => {
      if (child instanceof THREE.SkinnedMesh) child.bind(child.skeleton, child.matrixWorld);
    });
  }, [scene, evolutionStage]);

  const heads = useMemo(() => findNodesByKeyword(scene, HEAD_KEYWORDS), [scene]);
  const paws = useMemo(() => findNodesByKeyword(scene, PAW_KEYWORDS), [scene]);
  const tails = useMemo(() => findNodesByKeyword(scene, TAIL_KEYWORDS), [scene]);
  const ears = useMemo(() => findNodesByKeyword(scene, EAR_KEYWORDS), [scene]);
  const morphMeshes = useMemo(() => findMorphMeshes(scene), [scene]);

  // No named head/paw/tail/ear bones at all — a plain single-mesh face
  // export, most likely. Animate the whole object like a head looking
  // around instead of leaving it frozen.
  const hasNoSubParts = heads.length === 0 && paws.length === 0 && tails.length === 0 && ears.length === 0;

  // Remember each node's rest pose once, so procedural motion oscillates
  // around it instead of drifting frame to frame.
  const restRotations = useMemo(() => {
    const map = new Map<THREE.Object3D, THREE.Euler>();
    for (const node of [...heads, ...paws, ...tails, ...ears]) map.set(node, node.rotation.clone());
    return map;
  }, [heads, paws, tails, ears]);

  // Baked-animation path: only worth using when there are enough clips to
  // actually distinguish states from each other. A single generic clip
  // (the common case for a "rig + one motion preset" export) can't
  // represent 10 different behaviour states on its own, so in that case
  // we skip the mixer entirely and drive bones/whole-object motion
  // procedurally instead — that's what actually varies by state. With 2+
  // clips, find the one whose name loosely matches the current state and
  // crossfade into it.
  useEffect(() => {
    if (names.length <= 1) return;
    const synonyms: Record<CatBehaviorState, string[]> = {
      sleeping: ["sleep", "lie", "rest"],
      idle: ["idle"],
      watching: ["alert", "look", "idle"],
      stalking: ["walk", "prowl", "sneak", "creep"],
      hunting: ["pounce", "attack", "jump", "run"],
      celebrating: ["happy", "play", "dance", "jump"],
      injured: ["hurt", "down", "lie"],
      nervous: ["scared", "flinch", "alert"],
      curious: ["look", "sniff", "idle"],
      bored: ["idle", "sit"],
    };
    const wanted = synonyms[state];
    const match = names.find((n) => wanted.some((w) => n.toLowerCase().includes(w))) ?? names[0];
    const action = actions[match];
    if (!action) return;
    action.reset().fadeIn(0.3).play();
    return () => {
      action.fadeOut(0.3);
    };
  }, [state, actions, names]);

  const usingBakedAnimation = names.length > 1;

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();
    const profile = MOTION_PROFILE[state];

    // Whole-body float + a slight mood tilt — always applied, baked
    // animation or not, since a clip only drives the rig, not the root.
    // A slow, gentle up/down drift (like a floating avatar portrait)
    // layered under the smaller, faster per-state bob, so even the calmest
    // states (sleeping, injured) still read as alive rather than frozen.
    if (group.current) {
      const FLOAT_SPEED = 0.8;
      const FLOAT_AMPLITUDE = 0.13;
      group.current.position.y = Math.sin(t * FLOAT_SPEED) * FLOAT_AMPLITUDE + Math.sin(t * 1.4) * profile.bob;
      const moodTilt = THREE.MathUtils.clamp(mood / 100, -1, 1) * 0.06;
      group.current.rotation.z = moodTilt + Math.sin(t * 0.6) * 0.01;

      if (hasNoSubParts && !usingBakedAnimation) {
        group.current.rotation.y = Math.sin(t * profile.headSpeed) * profile.headAmp;
        group.current.rotation.x = Math.sin(t * profile.headSpeed * 0.6 + 1) * profile.headAmp * 0.4;
      }
    }

    // Morph-target expressions, when the file actually has any — crossfade
    // every mesh's influences toward the matching target and everything
    // else toward 0, rather than snapping, so a state change reads as an
    // expression change rather than a jump-cut.
    for (const mesh of morphMeshes) {
      const dict = mesh.morphTargetDictionary;
      const influences = mesh.morphTargetInfluences;
      if (!dict || !influences) continue;
      const targetKey = pickMorphTarget(dict, state);
      for (const [name, index] of Object.entries(dict)) {
        const goal = name === targetKey ? 1 : 0;
        influences[index] = THREE.MathUtils.damp(influences[index], goal, 6, delta);
      }
    }

    if (usingBakedAnimation) return;

    for (const head of heads) {
      const rest = restRotations.get(head);
      if (!rest) continue;
      head.rotation.y = rest.y + Math.sin(t * profile.headSpeed) * profile.headAmp;
      head.rotation.x = rest.x + Math.sin(t * profile.headSpeed * 0.6 + 1) * profile.headAmp * 0.4;
    }
    // Leg/tail bones are chains (thigh→shin→paw, tail→tail1→tail2→tail3):
    // each joint's local rotation stacks on top of every parent's, so
    // rotating every joint in a chain by the full profile amplitude would
    // compound into an unrealistically huge sweep at the tip. Splitting
    // the amplitude across the chain keeps the total deflection roughly
    // bounded to `profile.*Amp` while the per-joint phase offset still
    // reads as a natural traveling wave rather than one rigid rod swinging.
    paws.forEach((paw, i) => {
      const rest = restRotations.get(paw);
      if (!rest) return;
      const perJointAmp = paws.length > 0 ? profile.pawAmp / Math.min(paws.length, 3) : profile.pawAmp;
      paw.rotation.x = rest.x + Math.sin(t * profile.pawSpeed + i * 0.7) * perJointAmp;
    });
    tails.forEach((tail, i) => {
      const rest = restRotations.get(tail);
      if (!rest) return;
      const perJointAmp = tails.length > 0 ? profile.tailAmp / tails.length : profile.tailAmp;
      tail.rotation.z = rest.z + Math.sin(t * profile.tailSpeed + i * 0.9) * perJointAmp;
    });
    ears.forEach((ear, i) => {
      const rest = restRotations.get(ear);
      if (!rest) return;
      ear.rotation.z = rest.z + Math.sin(t * profile.headSpeed * 1.8 + i * 2) * profile.headAmp * 0.3;
    });
  });

  // Per-state emissive tint — nudges every mesh material's glow rather
  // than replacing its color, so the model's own texture still reads
  // through. This is the main per-state visual signal on a plain face
  // mesh with no morph targets yet; once real expressions exist it's just
  // a nice accent on top.
  useEffect(() => {
    const glow = STATE_GLOW[state];
    scene.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials) {
        if (!(material instanceof THREE.MeshStandardMaterial) && !(material instanceof THREE.MeshPhysicalMaterial)) continue;
        material.emissive = new THREE.Color(glow.color);
        material.emissiveIntensity = glow.intensity;
      }
    });
  }, [scene, state]);

  return <primitive ref={group} object={scene} />;
}
