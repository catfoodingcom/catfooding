import type { Trade } from "@/lib/types";

export interface XpAward {
  amount: number;
  reason: string;
}

/** Rewards good behaviour, not just profitable outcomes — a disciplined
 * loss earns more than the spec wants random gambling to pay out. */
export function xpForClosedTrade(trade: Trade): XpAward[] {
  const awards: XpAward[] = [];
  const pnl = trade.pnl ?? 0;

  if (pnl > 0) awards.push({ amount: 30, reason: "Profitable trade" });
  if (trade.status === "STOPPED_OUT") awards.push({ amount: 10, reason: "Respected the stop loss" });
  if (trade.status === "TOOK_PROFIT") awards.push({ amount: 5, reason: "Clean execution" });
  if (pnl > 0 && !trade.reasonCodes.includes("THIN_LIQUIDITY")) awards.push({ amount: 15, reason: "Avoided dangerous liquidity" });

  return awards;
}

export function xpForSittingOut(): XpAward {
  return { amount: 5, reason: "Sat out a poor market" };
}

export function xpForAvoidedTrade(): XpAward {
  return { amount: 15, reason: "Avoided a dangerous trade" };
}

export function xpForDisciplinedCooldown(): XpAward {
  return { amount: 10, reason: "Maintained discipline under pressure" };
}
