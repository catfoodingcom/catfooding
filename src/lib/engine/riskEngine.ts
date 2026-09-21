import type { AgentAction, Portfolio, RiskSettings, TokenMetrics } from "@/lib/types";

export interface RiskCheckInput {
  settings: RiskSettings;
  portfolio: Portfolio;
  metrics: TokenMetrics;
  proposedAction: AgentAction;
  proposedSizePercent: number;
  tradesToday: number;
  consecutiveLosses: number;
}

export interface RiskCheckResult {
  approved: boolean;
  reasonCodes: string[];
  /** Position size after any risk-driven reduction — always <= proposed. */
  adjustedSizePercent: number;
}

/**
 * The RiskEngine has final authority. It never proposes trades — it only
 * ever approves, shrinks, or vetoes what the DecisionEngine proposes. Every
 * check here is a hard deterministic rule, never a personality- or
 * LLM-influenced judgement call.
 */
export function evaluateRisk(input: RiskCheckInput): RiskCheckResult {
  const { settings, portfolio, metrics, proposedAction, proposedSizePercent, tradesToday, consecutiveLosses } = input;
  const reasonCodes: string[] = [];
  let approved = true;
  let size = proposedSizePercent;

  if (proposedAction !== "BUY") {
    return { approved: true, reasonCodes: [], adjustedSizePercent: 0 };
  }

  if (portfolio.openPositions.length >= settings.maxOpenPositions) {
    approved = false;
    reasonCodes.push("MAX_OPEN_POSITIONS_REACHED");
  }
  if (metrics.liquidity < settings.minimumLiquidity) {
    approved = false;
    reasonCodes.push("LIQUIDITY_BELOW_MINIMUM");
  }
  if (metrics.riskScore > settings.maximumTokenRiskScore) {
    approved = false;
    reasonCodes.push("TOKEN_RISK_ABOVE_LIMIT");
  }
  if (metrics.priceChange1h > settings.maxChaseExtensionPercent) {
    approved = false;
    reasonCodes.push("CHASING_EXTENDED_MOVE");
  }
  if (tradesToday >= settings.maximumTradesPerDay) {
    approved = false;
    reasonCodes.push("MAX_TRADES_PER_DAY_REACHED");
  }
  if (consecutiveLosses >= settings.cooldownAfterLosses) {
    approved = false;
    reasonCodes.push("COOLDOWN_AFTER_LOSSES");
  }
  if (portfolio.drawdown >= settings.maxPortfolioDrawdownPercent) {
    approved = false;
    reasonCodes.push("MAX_DRAWDOWN_EXCEEDED");
  }
  const dailyLossPercent = portfolio.startingCapital > 0 ? (-portfolio.dailyPnL / portfolio.startingCapital) * 100 : 0;
  if (dailyLossPercent >= settings.maxDailyLossPercent) {
    approved = false;
    reasonCodes.push("MAX_DAILY_LOSS_EXCEEDED");
  }

  if (size > settings.maxTradeAllocationPercent) {
    size = settings.maxTradeAllocationPercent;
    reasonCodes.push("POSITION_SIZE_REDUCED_TO_LIMIT");
  }

  return { approved, reasonCodes, adjustedSizePercent: approved ? size : 0 };
}

/** True once a portfolio drawdown is severe enough to cost the cat a life
 * and force a cooldown, per the "NINE LIVES" spec. */
export function isSevereDrawdownEvent(drawdownPercent: number, settings: RiskSettings): boolean {
  return drawdownPercent >= settings.maxPortfolioDrawdownPercent;
}
