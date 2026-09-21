import type { TokenSymbol } from "@/lib/types";

export interface TokenProfile {
  symbol: TokenSymbol;
  name: string;
  basePrice: number;
  baseLiquidity: number;
  baseRiskScore: number;
  /** multiplies the random-walk step size — meme coins swing harder */
  volMultiplier: number;
}

export const TOKEN_PROFILES: Record<TokenSymbol, TokenProfile> = {
  SOL: { symbol: "SOL", name: "Solana", basePrice: 148, baseLiquidity: 60_000_000, baseRiskScore: 15, volMultiplier: 0.7 },
  JUP: { symbol: "JUP", name: "Jupiter", basePrice: 0.86, baseLiquidity: 9_000_000, baseRiskScore: 35, volMultiplier: 1.1 },
  BONK: { symbol: "BONK", name: "Bonk", basePrice: 0.000021, baseLiquidity: 4_200_000, baseRiskScore: 68, volMultiplier: 2.3 },
  WIF: { symbol: "WIF", name: "dogwifhat", basePrice: 1.95, baseLiquidity: 5_500_000, baseRiskScore: 62, volMultiplier: 2.0 },
  PYTH: { symbol: "PYTH", name: "Pyth Network", basePrice: 0.32, baseLiquidity: 3_400_000, baseRiskScore: 44, volMultiplier: 1.3 },
  JTO: { symbol: "JTO", name: "Jito", basePrice: 2.45, baseLiquidity: 3_800_000, baseRiskScore: 40, volMultiplier: 1.2 },
};
