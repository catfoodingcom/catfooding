"use client";

import { motion } from "framer-motion";
import type { AgentDecision } from "@/lib/types";

const RISK_LABEL: Record<string, string> = {
  LIQUIDITY_BELOW_MINIMUM: "Liquidity below the tradable floor",
  TOKEN_RISK_ABOVE_LIMIT: "Token risk above limit",
  CHASING_EXTENDED_MOVE: "Chasing an extended move",
  MAX_OPEN_POSITIONS_REACHED: "Max open positions reached",
  MAX_TRADES_PER_DAY_REACHED: "Max trades today reached",
  COOLDOWN_AFTER_LOSSES: "Cooling down after losses",
  MAX_DRAWDOWN_EXCEEDED: "Max drawdown exceeded",
  MAX_DAILY_LOSS_EXCEEDED: "Max daily loss exceeded",
};

interface RefusedCardProps {
  decision: AgentDecision;
  catName: string;
}

/** The "refuse is the proof" beat: when the Risk Engine vetoes a proposal, this
 * card fills the frame — the cat wanted it, the guard said no, and here's why. */
export function RefusedCard({ decision, catName }: RefusedCardProps) {
  const codes = decision.reasonCodes.filter((c) => c !== "POSITION_SIZE_REDUCED_TO_LIMIT");
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 320, damping: 22 }}
      className="rounded-xl border-2 border-[#ff5d5d] bg-[#ff5d5d]/[0.08] p-4 space-y-3 shadow-[0_0_40px_-12px_#ff5d5d]"
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#ff5d5d]">🙅 Refused</span>
        <span className="font-display text-xl font-bold text-cream">{decision.token}</span>
      </div>

      <p className="font-mono text-xs text-cream/90 leading-relaxed border-t border-[#ff5d5d]/30 pt-2">
        {decision.naturalLanguageReason}
      </p>

      <div className="flex flex-wrap gap-1.5">
        {codes.map((c) => (
          <span key={c} className="rounded-full border border-[#ff5d5d]/50 bg-[#ff5d5d]/10 px-2 py-0.5 font-mono text-[10px] text-[#ff9d9d]">
            {RISK_LABEL[c] ?? c}
          </span>
        ))}
      </div>

      <p className="font-mono text-[10px] text-muted-foreground border-t border-[#ff5d5d]/20 pt-2">
        {catName} spotted it — the Risk Engine vetoed it. The refusal is the proof.
      </p>
    </motion.div>
  );
}
