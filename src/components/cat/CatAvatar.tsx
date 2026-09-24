"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { CatBehaviorState } from "@/lib/types";

interface CatAvatarProps {
  state: CatBehaviorState;
  mood: number;
  size?: number;
}

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

function Eyes({ state }: { state: CatBehaviorState }) {
  switch (state) {
    case "sleeping":
      return (
        <g stroke="#0d0e0c" strokeWidth={4} strokeLinecap="round">
          <path d="M70 96 Q80 104 90 96" fill="none" />
          <path d="M110 96 Q120 104 130 96" fill="none" />
        </g>
      );
    case "injured":
      return (
        <g stroke="#0d0e0c" strokeWidth={4} strokeLinecap="round">
          <path d="M68 88 L88 104 M88 88 L68 104" />
          <path d="M112 88 L132 104 M132 88 L112 104" />
        </g>
      );
    case "celebrating":
      return (
        <g stroke="#0d0e0c" strokeWidth={4} strokeLinecap="round" fill="none">
          <path d="M68 100 Q80 84 92 100" />
          <path d="M108 100 Q120 84 132 100" />
        </g>
      );
    case "nervous":
      return (
        <g>
          <circle cx="80" cy="94" r="9" fill="#0d0e0c" />
          <circle cx="120" cy="94" r="9" fill="#0d0e0c" />
          <circle cx="83" cy="90" r="2.5" fill="#f3efdf" />
          <circle cx="123" cy="90" r="2.5" fill="#f3efdf" />
        </g>
      );
    case "hunting":
    case "stalking":
      return (
        <g stroke="#0d0e0c" strokeWidth={5} strokeLinecap="round">
          <path d="M70 94 L92 94" />
          <path d="M108 94 L130 94" />
        </g>
      );
    case "curious":
      return (
        <g>
          <ellipse cx="80" cy="94" rx="11" ry="13" fill="#0d0e0c" />
          <ellipse cx="120" cy="94" rx="11" ry="13" fill="#0d0e0c" />
          <circle cx="83.5" cy="88" r="3" fill="#f3efdf" />
          <circle cx="123.5" cy="88" r="3" fill="#f3efdf" />
        </g>
      );
    default:
      return (
        <g>
          <ellipse cx="80" cy="94" rx="9" ry="11" fill="#0d0e0c" />
          <ellipse cx="120" cy="94" rx="9" ry="11" fill="#0d0e0c" />
          <circle cx="83" cy="89" r="2.5" fill="#f3efdf" />
          <circle cx="123" cy="89" r="2.5" fill="#f3efdf" />
        </g>
      );
  }
}

function Mouth({ state }: { state: CatBehaviorState }) {
  if (state === "celebrating") {
    return <path d="M90 112 Q100 124 110 112" stroke="#0d0e0c" strokeWidth={4} strokeLinecap="round" fill="none" />;
  }
  if (state === "injured" || state === "nervous") {
    return <path d="M92 116 Q100 110 108 116" stroke="#0d0e0c" strokeWidth={3.5} strokeLinecap="round" fill="none" />;
  }
  return (
    <path d="M100 108 L100 114 Q92 122 84 114 M100 114 Q108 122 116 114" stroke="#0d0e0c" strokeWidth={3} strokeLinecap="round" fill="none" />
  );
}

export function CatAvatar({ state, mood, size = 220 }: CatAvatarProps) {
  const glow = GLOW_BY_STATE[state];
  const isAsleep = state === "sleeping";
  const tilt = mood > 30 ? 2 : mood < -30 ? -2 : 0;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <motion.div
        className="absolute inset-0 rounded-full blur-2xl opacity-40"
        style={{ background: glow }}
        animate={{ opacity: [0.25, 0.45, 0.25] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.svg
        viewBox="0 0 200 200"
        width={size}
        height={size}
        className="relative"
        animate={
          state === "celebrating"
            ? { y: [0, -14, 0], rotate: [0, -4, 4, 0] }
            : isAsleep
              ? { y: [0, 2, 0] }
              : { y: [0, -5, 0], rotate: [tilt, tilt, tilt] }
        }
        transition={{ duration: state === "celebrating" ? 0.7 : isAsleep ? 3.2 : 2.6, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* tail — wags via rotation on the wrapping <g> rather than
            morphing `d` directly: on a statically prerendered page,
            animating `d` through Framer Motion can render `d="undefined"`
            in the pre-hydration HTML. */}
        <motion.g
          animate={{ rotate: [0, 10, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "148px 140px" }}
        >
          <path d="M148 140 Q186 150 172 108" stroke="#f3efdf" strokeWidth={14} strokeLinecap="round" fill="none" />
        </motion.g>

        {/* ears — rotation animates on the wrapping <g>, not the <path>
            itself; Framer Motion animating transform-like props directly on
            an SVG <path> alongside a static `d` can emit a malformed `d`
            on the first frame. */}
        <motion.g
          animate={{ rotate: [0, -4, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "60px 70px" }}
        >
          <path d="M56 78 L44 34 L86 62 Z" fill="#f3efdf" />
        </motion.g>
        <motion.g
          animate={{ rotate: [0, 4, 0] }}
          transition={{ duration: 4.4, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "140px 70px" }}
        >
          <path d="M144 78 L156 34 L114 62 Z" fill="#f3efdf" />
        </motion.g>
        <path d="M58 72 L50 46 L76 62 Z" fill={glow} opacity={0.6} />
        <path d="M142 72 L150 46 L124 62 Z" fill={glow} opacity={0.6} />

        {/* head */}
        <circle cx="100" cy="98" r="62" fill="#f3efdf" stroke="#0d0e0c" strokeWidth={3} />

        {/* cheeks */}
        <circle cx="62" cy="108" r="8" fill={glow} opacity={0.35} />
        <circle cx="138" cy="108" r="8" fill={glow} opacity={0.35} />

        <AnimatePresence mode="wait">
          <motion.g key={state} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <Eyes state={state} />
            <Mouth state={state} />
          </motion.g>
        </AnimatePresence>

        {/* whiskers */}
        <g stroke="#0d0e0c" strokeWidth={2} strokeLinecap="round" opacity={0.5}>
          <path d="M40 104 L14 100" />
          <path d="M40 112 L14 116" />
          <path d="M160 104 L186 100" />
          <path d="M160 112 L186 116" />
        </g>

        {state === "injured" && (
          <rect x="76" y="72" width="48" height="14" rx="4" fill="#f3efdf" stroke="#0d0e0c" strokeWidth={2} transform="rotate(-8 100 79)" />
        )}
      </motion.svg>

      {state === "celebrating" && (
        <>
          {[0, 1, 2, 3].map((i) => (
            <motion.span
              key={i}
              className="absolute text-lg"
              style={{ left: `${20 + i * 20}%`, top: `${10 + (i % 2) * 60}%` }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 1, 0], scale: [0, 1.2, 0], y: [0, -20] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            >
              ✨
            </motion.span>
          ))}
        </>
      )}
    </div>
  );
}
