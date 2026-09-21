export const TOKEN_UNIVERSE = ["SOL", "JUP", "BONK", "WIF", "PYTH", "JTO"] as const;
export type TokenSymbol = (typeof TOKEN_UNIVERSE)[number];

export interface TokenMetrics {
  symbol: TokenSymbol;
  name: string;
  price: number;
  priceChange1h: number;
  priceChange24h: number;
  volume24h: number;
  /** -100..100, rate of change of volume vs its own recent baseline */
  volumeAcceleration: number;
  /** USD depth available to trade without excessive slippage */
  liquidity: number;
  /** 0-100, realized short-window volatility */
  volatility: number;
  /** -100..100 */
  momentum: number;
  /** -100..100, momentum relative to SOL (the market benchmark) */
  relativeStrength: number;
  /** -100..100, slower moving-average-style trend */
  trend: number;
  /** 0-100, higher = riskier (illiquidity, volatility, cap tier) */
  riskScore: number;
}

export type MarketRegime = "RISK_ON" | "NEUTRAL" | "HIGH_VOLATILITY" | "RISK_OFF";

export interface MarketSnapshot {
  regime: MarketRegime;
  tokens: Record<TokenSymbol, TokenMetrics>;
  tick: number;
  timestamp: number;
}

export interface SignalScores {
  momentum: number;
  volume: number;
  liquidity: number;
  trend: number;
  relativeStrength: number;
  risk: number;
  overallOpportunity: number;
}
