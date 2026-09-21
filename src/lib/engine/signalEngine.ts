import type { PersonalityTraits, SignalScores, TokenMetrics } from "@/lib/types";
import { clamp } from "@/lib/market/random";

/** A reference ceiling for scaling raw USD liquidity into a 0-100 score.
 * SOL (our largest, most liquid token) sits well below this so it still
 * reads as a strong-but-not-maxed liquidity score. */
const LIQUIDITY_REFERENCE_MAX = 80_000_000;

interface SignalWeights {
  momentum: number;
  volume: number;
  trend: number;
  relativeStrength: number;
  liquidity: number;
  riskAdjusted: number;
}

const BASE_WEIGHTS: SignalWeights = {
  momentum: 0.25,
  volume: 0.2,
  trend: 0.2,
  relativeStrength: 0.15,
  liquidity: 0.1,
  riskAdjusted: 0.1,
};

/** Personality reshapes *how much each factor matters*, not the raw scores
 * themselves — deterministic scoring first, taste second. */
export function personalityWeights(p: PersonalityTraits): SignalWeights {
  const aggr = (p.aggression - 50) / 50; // -1..1
  const fear = (p.fear - 50) / 50;
  const disc = (p.discipline - 50) / 50;
  const curiosity = (p.curiosity - 50) / 50;

  const w: SignalWeights = {
    momentum: BASE_WEIGHTS.momentum + aggr * 0.08,
    volume: BASE_WEIGHTS.volume + curiosity * 0.04,
    trend: BASE_WEIGHTS.trend + disc * 0.04,
    relativeStrength: BASE_WEIGHTS.relativeStrength,
    liquidity: BASE_WEIGHTS.liquidity + fear * 0.05 - curiosity * 0.03,
    riskAdjusted: BASE_WEIGHTS.riskAdjusted + fear * 0.08 + disc * 0.04,
  };

  // clamp negatives (a very curious+brave cat can push liquidity weight low,
  // but never negative) then renormalize to sum to 1
  (Object.keys(w) as (keyof SignalWeights)[]).forEach((k) => (w[k] = Math.max(0.02, w[k])));
  const total = Object.values(w).reduce((a, b) => a + b, 0);
  (Object.keys(w) as (keyof SignalWeights)[]).forEach((k) => (w[k] = w[k] / total));
  return w;
}

export function computeSignalScores(metrics: TokenMetrics, personality: PersonalityTraits): SignalScores {
  const momentum = clamp(50 + metrics.momentum / 2, 0, 100);
  const volume = clamp(50 + metrics.volumeAcceleration / 2, 0, 100);
  const trend = clamp(50 + metrics.trend / 2, 0, 100);
  const relativeStrength = clamp(50 + metrics.relativeStrength / 2, 0, 100);
  const liquidity = clamp((Math.log10(Math.max(1, metrics.liquidity)) / Math.log10(LIQUIDITY_REFERENCE_MAX)) * 100, 0, 100);
  const riskAdjusted = clamp(100 - metrics.riskScore, 0, 100);

  const w = personalityWeights(personality);

  const overallOpportunity = clamp(
    momentum * w.momentum +
      volume * w.volume +
      trend * w.trend +
      relativeStrength * w.relativeStrength +
      liquidity * w.liquidity +
      riskAdjusted * w.riskAdjusted,
    0,
    100
  );

  return {
    momentum: Math.round(momentum),
    volume: Math.round(volume),
    liquidity: Math.round(liquidity),
    trend: Math.round(trend),
    relativeStrength: Math.round(relativeStrength),
    risk: Math.round(metrics.riskScore),
    overallOpportunity: Math.round(overallOpportunity),
  };
}

/** Minimum opportunity score required to act on a signal at all. High
 * discipline raises the bar; high curiosity lowers it slightly (willing to
 * poke at weaker setups). */
export function minimumOpportunityScore(personality: PersonalityTraits): number {
  const disc = (personality.discipline - 50) / 50;
  const curiosity = (personality.curiosity - 50) / 50;
  return clamp(58 + disc * 12 - curiosity * 8, 40, 80);
}

export function deriveReasonCodes(signals: SignalScores): string[] {
  const codes: string[] = [];
  if (signals.momentum >= 70) codes.push("HIGH_MOMENTUM");
  if (signals.volume >= 68) codes.push("VOLUME_ACCELERATION");
  if (signals.liquidity >= 70) codes.push("STRONG_LIQUIDITY");
  if (signals.trend >= 68) codes.push("CONFIRMED_TREND");
  if (signals.relativeStrength >= 65) codes.push("OUTPERFORMING_MARKET");
  if (signals.risk <= 35) codes.push("LOW_RISK_SCORE");
  if (signals.liquidity < 40) codes.push("THIN_LIQUIDITY");
  if (signals.risk >= 65) codes.push("ELEVATED_RISK");
  if (codes.length === 0) codes.push("MARGINAL_SETUP");
  return codes;
}
