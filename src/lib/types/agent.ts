import type { TokenSymbol } from "./market";

export type AgentAction = "WATCH" | "BUY" | "SELL" | "HOLD" | "SLEEP";

export interface AgentDecision {
  action: AgentAction;
  token: TokenSymbol | null;
  confidence: number; // 0-100
  positionSizePercent: number;
  reasonCodes: string[];
  naturalLanguageReason: string;
  riskNotes: string | null;
  vetoedByRisk: boolean;
}

export interface RiskSettings {
  maxTradeAllocationPercent: number;
  maxOpenPositions: number;
  maxDailyLossPercent: number;
  maxPortfolioDrawdownPercent: number;
  minimumLiquidity: number;
  maximumTokenRiskScore: number;
  cooldownAfterLosses: number;
  maximumTradesPerDay: number;
  /** Added on top of the personality-derived minimum opportunity score.
   * The "Training" screen's "be more careful" / "explore more" controls
   * move this — it's the concrete number behind the vague language. */
  signalThresholdBoost: number;
  /** Reject entries chasing a move already extended past this 1h % change. */
  maxChaseExtensionPercent: number;
}

export const DEFAULT_RISK_SETTINGS: RiskSettings = {
  maxTradeAllocationPercent: 3,
  maxOpenPositions: 4,
  maxDailyLossPercent: 5,
  maxPortfolioDrawdownPercent: 15,
  minimumLiquidity: 250_000,
  maximumTokenRiskScore: 70,
  cooldownAfterLosses: 3,
  maximumTradesPerDay: 8,
  signalThresholdBoost: 0,
  maxChaseExtensionPercent: 25,
};

export interface ActivityEvent {
  id: string;
  timestamp: number;
  icon: string;
  message: string;
  xpChange?: number;
  category: "SYSTEM" | "TRADE" | "RISK" | "MOOD" | "MEMORY" | "LEVEL";
}
