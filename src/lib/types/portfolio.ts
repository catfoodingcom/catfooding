import type { TokenSymbol, MarketRegime, SignalScores } from "./market";
import type { CatState } from "./cat";

export interface Position {
  id: string;
  token: TokenSymbol;
  symbol: TokenSymbol;
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  positionValue: number;
  allocationPercent: number;
  stopLoss: number;
  takeProfit: number;
  openedAt: number;
  strategy: string;
  confidence: number;
  reason: string;
}

export type TradeStatus = "OPEN" | "CLOSED" | "STOPPED_OUT" | "TOOK_PROFIT";

export interface Trade {
  id: string;
  token: TokenSymbol;
  symbol: TokenSymbol;
  side: "BUY" | "SELL";
  entryPrice: number;
  exitPrice: number | null;
  quantity: number;
  positionSizePercent: number;
  openedAt: number;
  closedAt: number | null;
  pnl: number | null;
  pnlPercent: number | null;
  status: TradeStatus;
  marketRegime: MarketRegime;
  signalScores: SignalScores;
  catStateAtEntry: Pick<CatState, "health" | "energy" | "mood" | "confidence" | "focus" | "caution" | "level">;
  reasonCodes: string[];
  naturalLanguageReason: string;
  exitReason: string | null;
  riskNotes: string | null;
  xpEarned: number;
  memoryId: string | null;
}

export interface Portfolio {
  startingCapital: number;
  cash: number;
  portfolioValue: number;
  realisedPnL: number;
  unrealisedPnL: number;
  dailyPnL: number;
  peakPortfolioValue: number;
  drawdown: number; // positive percent, 0 = at peak
  openPositions: Position[];
  tradeHistory: Trade[];
}

export function computePortfolioValue(portfolio: Pick<Portfolio, "cash" | "openPositions">): number {
  return portfolio.cash + portfolio.openPositions.reduce((sum, p) => sum + p.positionValue, 0);
}

export function computeDrawdown(currentValue: number, peakValue: number): number {
  if (peakValue <= 0) return 0;
  return Math.max(0, ((peakValue - currentValue) / peakValue) * 100);
}
