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

// Seeded from real CoAgentic feeds (Oracle liquidity + venue price, ~2026-09-23):
// basePrice = the xStock's real level, baseLiquidity = its X Layer pool depth,
// baseRiskScore rises with thinness/volatility (NVDAx deepest → lowest; MSTRx/CRCLx
// thin+swingy → highest). volMultiplier: equities are calmer than memecoins, but
// MSTR/SpaceX still swing. The sim walks from these; the shape is real.
export const TOKEN_PROFILES: Record<TokenSymbol, TokenProfile> = {
  NVDAx: { symbol: "NVDAx", name: "NVIDIA xStock", basePrice: 222, baseLiquidity: 1_030_000, baseRiskScore: 12, volMultiplier: 0.8 },
  AAPLx: { symbol: "AAPLx", name: "Apple xStock", basePrice: 336, baseLiquidity: 794_000, baseRiskScore: 18, volMultiplier: 0.85 },
  TSLAx: { symbol: "TSLAx", name: "Tesla xStock", basePrice: 364, baseLiquidity: 639_000, baseRiskScore: 32, volMultiplier: 1.25 },
  SPCXx: { symbol: "SPCXx", name: "SpaceX xStock", basePrice: 152, baseLiquidity: 724_000, baseRiskScore: 40, volMultiplier: 1.4 },
  MSTRx: { symbol: "MSTRx", name: "Strategy xStock", basePrice: 154, baseLiquidity: 583_000, baseRiskScore: 46, volMultiplier: 1.7 },
  CRCLx: { symbol: "CRCLx", name: "Circle xStock", basePrice: 92, baseLiquidity: 568_000, baseRiskScore: 42, volMultiplier: 1.45 },
};
