"use client";

import { motion } from "framer-motion";
import type { AgentDecision, PersonalityTraits, TokenMetrics } from "@/lib/types";
import { computeSignalScores } from "@/lib/engine/signalEngine";
import { SignalBars } from "./SignalBars";
import { Button } from "@/components/ui/button";

interface PreyCardProps {
  decision: AgentDecision;
  metrics: TokenMetrics;
  personality: PersonalityTraits;
  catName: string;
  onApprove: () => void;
  onDecline: () => void;
}

export function PreyCard({ decision, metrics, personality, catName, onApprove, onDecline }: PreyCardProps) {
  const signals = computeSignalScores(metrics, personality);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="chunky-border-pink bg-ink-raised rounded-xl p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-pink">🐦 Prey Spotted</span>
        <span className="font-display text-xl font-bold text-cream">{metrics.symbol}</span>
      </div>

      <SignalBars signals={signals} />

      <p className="font-mono text-xs text-cream/90 leading-relaxed border-t border-border pt-2">{decision.naturalLanguageReason}</p>

      <div className="flex items-center justify-between font-mono text-[11px] text-muted-foreground">
        <span>
          {catName} confidence: <span className="text-acid">{decision.confidence}%</span>
        </span>
        <span>
          Allocation: <span className="text-acid">{decision.positionSizePercent.toFixed(1)}%</span>
        </span>
      </div>

      {decision.riskNotes && <p className="font-mono text-[10px] text-[#ffd23f]">⚠ {decision.riskNotes}</p>}

      <div className="flex gap-2 pt-1">
        <Button onClick={onApprove} className="flex-1 bg-acid text-ink hover:bg-acid-dim font-mono uppercase text-xs tracking-wider">
          Let it hunt
        </Button>
        <Button onClick={onDecline} variant="outline" className="flex-1 font-mono uppercase text-xs tracking-wider border-border">
          Hold back
        </Button>
      </div>
    </motion.div>
  );
}
