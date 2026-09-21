import type { Memory, MemoryOutcome, Trade } from "@/lib/types";
import { getNarrator } from "./narrator";

let counter = 0;
function memId() {
  counter += 1;
  return `mem_${Date.now()}_${counter}`;
}

export function createMemoryFromTrade(trade: Trade): Memory {
  const outcome: MemoryOutcome = (trade.pnl ?? 0) > 2 ? "POSITIVE" : (trade.pnl ?? 0) < -2 ? "NEGATIVE" : "NEUTRAL";
  const pnlPercent = trade.pnlPercent ?? 0;
  const { description, lesson } = getNarrator().memoryDescription({
    token: trade.token,
    outcome,
    pnlPercent,
    reasonCodes: trade.reasonCodes,
  });

  return {
    id: memId(),
    timestamp: Date.now(),
    token: trade.token,
    eventType: trade.status === "STOPPED_OUT" ? "STOP_LOSS" : trade.status === "TOOK_PROFIT" ? "TAKE_PROFIT" : "TRADE_CLOSED",
    description,
    lesson,
    importance: Math.min(100, Math.abs(pnlPercent) * 8 + 20),
    outcome,
    tags: [trade.token, ...trade.reasonCodes],
  };
}

/**
 * Memories nudge future scoring within a small, bounded range — they can
 * never override the RiskEngine's hard limits, only shade the
 * DecisionEngine's opinion of a token it has history with.
 */
const MAX_MEMORY_ADJUSTMENT = 12;

export function memoryScoreAdjustment(memories: Memory[], token: string): number {
  const relevant = memories.filter((m) => m.tags.includes(token));
  if (relevant.length === 0) return 0;

  const raw = relevant.reduce((sum, m) => {
    const sign = m.outcome === "NEGATIVE" ? -1 : m.outcome === "POSITIVE" ? 0.4 : 0;
    return sum + sign * (m.importance / 100) * 10;
  }, 0);

  return Math.max(-MAX_MEMORY_ADJUSTMENT, Math.min(MAX_MEMORY_ADJUSTMENT, raw));
}
