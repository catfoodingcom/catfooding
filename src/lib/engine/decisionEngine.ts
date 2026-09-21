import type {
  AgentDecision,
  CatState,
  MarketRegime,
  Memory,
  Portfolio,
  Position,
  RiskSettings,
  TokenMetrics,
  TokenSymbol,
} from "@/lib/types";
import { clamp } from "@/lib/market/random";
import { computeSignalScores, deriveReasonCodes, minimumOpportunityScore } from "./signalEngine";
import { evaluateRisk } from "./riskEngine";
import { memoryScoreAdjustment } from "./memoryEngine";
import { getNarrator } from "./narrator";

export interface DecisionContext {
  cat: CatState;
  portfolio: Portfolio;
  regime: MarketRegime;
  universe: TokenMetrics[];
  memories: Memory[];
  riskSettings: RiskSettings;
  tradesToday: number;
  consecutiveLosses: number;
}

function sleepDecision(reason: string): AgentDecision {
  return {
    action: "SLEEP",
    token: null,
    confidence: 0,
    positionSizePercent: 0,
    reasonCodes: ["RESTING"],
    naturalLanguageReason: reason,
    riskNotes: null,
    vetoedByRisk: false,
  };
}

/** Entry decisions: scans the universe, scores everything, picks the best
 * qualifying setup (if any), and always routes the proposal through the
 * RiskEngine before it can become a BUY. */
export function makeEntryDecision(ctx: DecisionContext): AgentDecision {
  const cat = ctx.cat;
  const personality = cat.personality;
  const narrator = getNarrator();

  const now = Date.now();
  if (cat.cooldownUntil && now < cat.cooldownUntil) {
    return sleepDecision(`${cat.name} is still recovering. Cooldown active.`);
  }
  if (cat.energy < 15 || cat.health < 20) {
    return sleepDecision(`${cat.name} is too worn out to hunt right now.`);
  }
  if (ctx.regime === "RISK_OFF" && personality.fear > 60) {
    return sleepDecision(`Markets feel unsafe. ${cat.name} is sitting this one out.`);
  }

  const scored = ctx.universe.map((metrics) => {
    const signals = computeSignalScores(metrics, personality);
    const memAdj = memoryScoreAdjustment(ctx.memories, metrics.symbol);
    return { metrics, signals: { ...signals, overallOpportunity: clamp(signals.overallOpportunity + memAdj, 0, 100) } };
  });

  scored.sort((a, b) => b.signals.overallOpportunity - a.signals.overallOpportunity);
  const best = scored[0];
  const threshold = clamp(minimumOpportunityScore(personality) + ctx.riskSettings.signalThresholdBoost, 20, 95);

  if (!best || best.signals.overallOpportunity < threshold) {
    return {
      action: "WATCH",
      token: best?.metrics.symbol ?? null,
      confidence: best ? best.signals.overallOpportunity : 0,
      positionSizePercent: 0,
      reasonCodes: ["NO_QUALIFYING_SIGNAL"],
      naturalLanguageReason: `Nothing clears the bar yet. ${cat.name} keeps watching.`,
      riskNotes: null,
      vetoedByRisk: false,
    };
  }

  const aggr = personality.aggression / 100;
  const fear = personality.fear / 100;
  const baseSize = 1 + aggr * 3.5; // 1% - 4.5%
  const sizePercent = clamp(baseSize * (1 - fear * 0.45), 0.5, 6);

  const convictionBoost = (personality.conviction - 50) / 250;
  const confidence = Math.round(clamp(best.signals.overallOpportunity * (0.65 + convictionBoost), 0, 99));

  const reasonCodes = deriveReasonCodes(best.signals);
  const token: TokenSymbol = best.metrics.symbol;

  const riskResult = evaluateRisk({
    settings: ctx.riskSettings,
    portfolio: ctx.portfolio,
    metrics: best.metrics,
    proposedAction: "BUY",
    proposedSizePercent: sizePercent,
    tradesToday: ctx.tradesToday,
    consecutiveLosses: ctx.consecutiveLosses,
  });

  if (!riskResult.approved) {
    return {
      action: "WATCH",
      token,
      confidence,
      positionSizePercent: 0,
      reasonCodes: riskResult.reasonCodes,
      naturalLanguageReason: narrator.riskRejection(riskResult.reasonCodes, cat.name),
      riskNotes: riskResult.reasonCodes.join(", "),
      vetoedByRisk: true,
    };
  }

  return {
    action: "BUY",
    token,
    confidence,
    positionSizePercent: riskResult.adjustedSizePercent,
    reasonCodes,
    naturalLanguageReason: narrator.tradeReason(token, reasonCodes, cat.name),
    riskNotes: riskResult.reasonCodes.length ? riskResult.reasonCodes.join(", ") : null,
    vetoedByRisk: false,
  };
}

export interface ExitCheck {
  position: Position;
  shouldExit: boolean;
  exitReason: "STOP_LOSS" | "TAKE_PROFIT" | "TRAIL" | null;
}

/** Personality reshapes exits too: high conviction widens the effective
 * take-profit (lets winners run), high fear tightens stops. */
export function evaluateExit(position: Position, personality: CatState["personality"]): ExitCheck {
  const convictionStretch = 1 + (personality.conviction - 50) / 200; // 0.75x - 1.25x
  const fearTighten = 1 - (personality.fear - 50) / 300;

  const effectiveStop = position.entryPrice - (position.entryPrice - position.stopLoss) * fearTighten;
  const effectiveTarget = position.entryPrice + (position.takeProfit - position.entryPrice) * convictionStretch;

  if (position.currentPrice <= effectiveStop) {
    return { position, shouldExit: true, exitReason: "STOP_LOSS" };
  }
  if (position.currentPrice >= effectiveTarget) {
    return { position, shouldExit: true, exitReason: "TAKE_PROFIT" };
  }
  return { position, shouldExit: false, exitReason: null };
}
