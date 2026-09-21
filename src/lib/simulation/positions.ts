import type { AgentDecision, CatState, MarketRegime, Portfolio, Position, Trade, TokenMetrics } from "@/lib/types";
import { getNarrator } from "@/lib/engine/narrator";

let counter = 0;
function id(prefix: string) {
  counter += 1;
  return `${prefix}_${Date.now()}_${counter}`;
}

/** Stop/target distance widen with the token's own volatility and narrow
 * with the cat's fear — a fearful cat keeps a tighter leash. */
export function computeStopAndTarget(metrics: TokenMetrics, personality: CatState["personality"]) {
  const volFactor = 0.02 + metrics.volatility / 1000; // ~2%-12%
  const fearTighten = 1 - (personality.fear - 50) / 300;
  const convictionStretch = 1 + (personality.conviction - 50) / 200;

  const stopDistance = volFactor * 1.4 * fearTighten;
  const targetDistance = volFactor * 2.4 * convictionStretch;

  return {
    stopLoss: metrics.price * (1 - stopDistance),
    takeProfit: metrics.price * (1 + targetDistance),
  };
}

export function openPositionFromDecision(
  decision: AgentDecision,
  metrics: TokenMetrics,
  portfolio: Portfolio,
  cat: CatState,
  regime: MarketRegime
): { position: Position; trade: Trade; portfolio: Portfolio } {
  if (!decision.token) throw new Error("Cannot open a position without a token");

  const positionValue = portfolio.portfolioValue * (decision.positionSizePercent / 100);
  const quantity = positionValue / metrics.price;
  const { stopLoss, takeProfit } = computeStopAndTarget(metrics, cat.personality);

  const position: Position = {
    id: id("pos"),
    token: decision.token,
    symbol: decision.token,
    entryPrice: metrics.price,
    currentPrice: metrics.price,
    quantity,
    positionValue,
    allocationPercent: decision.positionSizePercent,
    stopLoss,
    takeProfit,
    openedAt: Date.now(),
    strategy: cat.archetype,
    confidence: decision.confidence,
    reason: decision.naturalLanguageReason,
  };

  const trade: Trade = {
    id: id("trade"),
    token: decision.token,
    symbol: decision.token,
    side: "BUY",
    entryPrice: metrics.price,
    exitPrice: null,
    quantity,
    positionSizePercent: decision.positionSizePercent,
    openedAt: position.openedAt,
    closedAt: null,
    pnl: null,
    pnlPercent: null,
    status: "OPEN",
    marketRegime: regime,
    signalScores: {
      momentum: 0,
      volume: 0,
      liquidity: 0,
      trend: 0,
      relativeStrength: 0,
      risk: metrics.riskScore,
      overallOpportunity: decision.confidence,
    },
    catStateAtEntry: {
      health: cat.health,
      energy: cat.energy,
      mood: cat.mood,
      confidence: cat.confidence,
      focus: cat.focus,
      caution: cat.caution,
      level: cat.level,
    },
    reasonCodes: decision.reasonCodes,
    naturalLanguageReason: decision.naturalLanguageReason,
    exitReason: null,
    riskNotes: decision.riskNotes,
    xpEarned: 0,
    memoryId: null,
  };

  const nextPortfolio: Portfolio = {
    ...portfolio,
    cash: portfolio.cash - positionValue,
    openPositions: [...portfolio.openPositions, position],
    tradeHistory: [trade, ...portfolio.tradeHistory],
  };

  return { position, trade, portfolio: nextPortfolio };
}

export function closePosition(
  position: Position,
  portfolio: Portfolio,
  exitReason: "STOP_LOSS" | "TAKE_PROFIT" | "MANUAL",
  catName: string
): { portfolio: Portfolio; trade: Trade | null; pnl: number; pnlPercent: number } {
  const proceeds = position.quantity * position.currentPrice;
  const pnl = proceeds - position.quantity * position.entryPrice;
  const pnlPercent = ((position.currentPrice - position.entryPrice) / position.entryPrice) * 100;

  const status = exitReason === "STOP_LOSS" ? "STOPPED_OUT" : exitReason === "TAKE_PROFIT" ? "TOOK_PROFIT" : "CLOSED";
  const exitText = getNarrator().exitReason(position.token, pnlPercent, catName);

  const existingTrade = portfolio.tradeHistory.find((t) => t.status === "OPEN" && t.token === position.token && t.openedAt === position.openedAt);

  const closedTrade: Trade | null = existingTrade
    ? {
        ...existingTrade,
        exitPrice: position.currentPrice,
        closedAt: Date.now(),
        pnl,
        pnlPercent,
        status,
        exitReason: exitText,
      }
    : null;

  const nextPortfolio: Portfolio = {
    ...portfolio,
    cash: portfolio.cash + proceeds,
    realisedPnL: portfolio.realisedPnL + pnl,
    dailyPnL: portfolio.dailyPnL + pnl,
    openPositions: portfolio.openPositions.filter((p) => p.id !== position.id),
    tradeHistory: closedTrade ? portfolio.tradeHistory.map((t) => (t.id === closedTrade.id ? closedTrade : t)) : portfolio.tradeHistory,
  };

  return { portfolio: nextPortfolio, trade: closedTrade, pnl, pnlPercent };
}
