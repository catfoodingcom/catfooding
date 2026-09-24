import type { ActivityEvent, MarketSnapshot, Position } from "@/lib/types";
import { computeDrawdown, computePortfolioValue, levelForXP, evolutionStageForLevel } from "@/lib/types";
import { evaluateExit, makeEntryDecision } from "@/lib/engine/decisionEngine";
import { getNarrator } from "@/lib/engine/narrator";
import { xpForClosedTrade, xpForSittingOut } from "@/lib/engine/xpEngine";
import { createMemoryFromTrade } from "@/lib/engine/memoryEngine";
import { ENERGY_COSTS, driftHunger, healthFromDrawdown, regenerateEnergy, spendEnergy, updateMood } from "@/lib/engine/vitalsEngine";
import { closePosition, openPositionFromDecision } from "./positions";
import { MAX_ACTIVITY_LOG, MAX_EQUITY_POINTS, TICKS_PER_SIM_DAY, type SimulationState } from "./types";

let activityCounter = 0;
function pushActivity(activity: ActivityEvent[], entry: Omit<ActivityEvent, "id" | "timestamp">): ActivityEvent[] {
  activityCounter += 1;
  const event: ActivityEvent = { ...entry, id: `act_${Date.now()}_${activityCounter}`, timestamp: Date.now() };
  return [event, ...activity].slice(0, MAX_ACTIVITY_LOG);
}

export interface TickResult {
  state: SimulationState;
  market: MarketSnapshot;
}

/**
 * Advances the whole simulation by one tick: refresh market, mark open
 * positions to market, check exits, update vitals, then (if the cat is
 * free to act) ask the DecisionEngine what to do next. This is the single
 * place all the engines meet — deliberately framework-agnostic so it can
 * be unit tested without React/Zustand in the loop.
 */
export function runTick(state: SimulationState, market: MarketSnapshot): TickResult {
  let activity = state.activity;
  const cat = { ...state.cat };
  let portfolio = { ...state.portfolio };
  let memories = state.memories;
  let consecutiveLosses = state.consecutiveLosses;
  let winStreak = state.winStreak;
  let lossStreak = state.lossStreak;
  let tradesToday = state.tradesToday;
  let ticksSinceDayStart = state.ticksSinceDayStart + 1;
  let pendingProposal = state.pendingProposal;
  let lastRefusal = state.lastRefusal;
  const narrator = getNarrator();

  if (ticksSinceDayStart >= TICKS_PER_SIM_DAY) {
    ticksSinceDayStart = 0;
    tradesToday = 0;
    portfolio = { ...portfolio, dailyPnL: 0 };
  }

  // 1. Mark open positions to market, check exits.
  const stillOpen: Position[] = [];
  for (const position of portfolio.openPositions) {
    const metrics = market.tokens[position.token];
    const marked: Position = {
      ...position,
      currentPrice: metrics.price,
      positionValue: position.quantity * metrics.price,
    };

    const exitCheck = evaluateExit(marked, cat.personality);
    if (!exitCheck.shouldExit) {
      stillOpen.push(marked);
      continue;
    }

    const exitKind = exitCheck.exitReason === "STOP_LOSS" ? "STOP_LOSS" : "TAKE_PROFIT";
    const result = closePosition(marked, portfolio, exitKind, cat.name);
    portfolio = result.portfolio;

    if (result.trade) {
      const awards = xpForClosedTrade(result.trade);
      const xpGained = awards.reduce((sum, a) => sum + a.amount, 0);
      cat.xp += xpGained;

      const memory = createMemoryFromTrade({ ...result.trade, xpEarned: xpGained });
      memories = [memory, ...memories].slice(0, 500);

      const won = result.pnl > 0;
      winStreak = won ? winStreak + 1 : 0;
      lossStreak = won ? 0 : lossStreak + 1;
      consecutiveLosses = won ? 0 : consecutiveLosses + 1;

      activity = pushActivity(activity, {
        icon: won ? "🏆" : "😿",
        message: `${result.trade.exitReason} ${won ? `+${result.pnl.toFixed(2)}` : result.pnl.toFixed(2)} USDC (${result.pnlPercent.toFixed(1)}%).`,
        xpChange: xpGained,
        category: "TRADE",
      });
      activity = pushActivity(activity, {
        icon: "🧠",
        message: memory.description,
        category: "MEMORY",
      });
    }

    cat.energy = spendEnergy(cat.energy, ENERGY_COSTS.closeTrade);
  }
  portfolio = { ...portfolio, openPositions: stillOpen };

  // 2. Recompute portfolio aggregates.
  const portfolioValue = computePortfolioValue(portfolio);
  const peakPortfolioValue = Math.max(portfolio.peakPortfolioValue, portfolioValue);
  const drawdown = computeDrawdown(portfolioValue, peakPortfolioValue);
  const unrealisedPnL = portfolio.openPositions.reduce((sum, p) => sum + (p.currentPrice - p.entryPrice) * p.quantity, 0);
  portfolio = { ...portfolio, portfolioValue, peakPortfolioValue, drawdown, unrealisedPnL };

  // 3. Vitals.
  cat.energy = regenerateEnergy(cat.energy);
  cat.hunger = driftHunger(cat.hunger);
  const previousHealth = cat.health;
  cat.health = healthFromDrawdown(portfolio.drawdown);
  cat.mood = updateMood({ currentMood: cat.mood, dailyPnLPercent: (portfolio.dailyPnL / portfolio.startingCapital) * 100, winStreak, lossStreak, health: cat.health });
  cat.confidence = Math.max(10, Math.min(95, cat.confidence + (winStreak > 0 ? 2 : lossStreak > 0 ? -3 : 0)));
  cat.caution = Math.max(10, Math.min(95, 100 - cat.confidence + cat.personality.fear / 4));

  // Severe drawdown -> lose a life, force a cooldown, but never delete the cat.
  const severeDrawdown = portfolio.drawdown >= state.riskSettings.maxPortfolioDrawdownPercent;
  if (severeDrawdown && previousHealth >= 20 && cat.health < 20 && cat.lives > 0) {
    cat.lives -= 1;
    cat.cooldownUntil = Date.now() + 1000 * 60; // 60s real-time cooldown for the MVP demo pace
    cat.currentState = "injured";
    activity = pushActivity(activity, {
      icon: "🚨",
      message: `${cat.name} got spooked and went to bed. Drawdown hit ${portfolio.drawdown.toFixed(1)}%. Trading paused.`,
      category: "RISK",
    });
  }

  // 4. Leveling.
  const newLevel = levelForXP(cat.xp);
  if (newLevel > cat.level) {
    cat.level = newLevel;
    const newStage = evolutionStageForLevel(newLevel);
    if (newStage !== cat.evolutionStage) {
      cat.evolutionStage = newStage;
      activity = pushActivity(activity, { icon: "✨", message: `${cat.name} evolved into a ${newStage}!`, category: "LEVEL" });
    } else {
      activity = pushActivity(activity, { icon: "📈", message: `${cat.name} reached level ${newLevel}.`, category: "LEVEL" });
    }
  }

  // 5. Decide next move, if the cat is free to act and nothing is pending.
  const canAct = !pendingProposal && !(cat.cooldownUntil && Date.now() < cat.cooldownUntil) && cat.energy > ENERGY_COSTS.scan && cat.lives > 0;

  if (canAct) {
    cat.energy = spendEnergy(cat.energy, ENERGY_COSTS.scan);
    const decision = makeEntryDecision({
      cat,
      portfolio,
      regime: market.regime,
      universe: Object.values(market.tokens),
      memories,
      riskSettings: state.riskSettings,
      tradesToday,
      consecutiveLosses,
    });

    if (decision.action === "SLEEP") {
      cat.currentState = "sleeping";
    } else if (decision.action === "WATCH") {
      cat.energy = spendEnergy(cat.energy, ENERGY_COSTS.watch);
      cat.currentState = decision.vetoedByRisk ? "nervous" : cat.hunger > 60 ? "curious" : "bored";
      if (decision.vetoedByRisk) {
        activity = pushActivity(activity, { icon: "🙅", message: decision.naturalLanguageReason, category: "RISK" });
        lastRefusal = decision; // surface the prominent REFUSED card
      }
    } else if (decision.action === "BUY" && decision.token) {
      lastRefusal = null; // a successful hunt clears the last refusal
      if (cat.autonomyMode === "PAPER_OBSERVER") {
        cat.currentState = "watching";
        activity = pushActivity(activity, {
          icon: "👀",
          message: `${cat.name} would have hunted ${decision.token} — observing only.`,
          category: "SYSTEM",
        });
      } else if (cat.autonomyMode === "ASK_ME") {
        cat.currentState = "stalking";
        pendingProposal = decision;
        activity = pushActivity(activity, { icon: "🐦", message: `PREY SPOTTED: ${decision.token}. Awaiting your call.`, category: "TRADE" });
      } else {
        cat.currentState = "hunting";
        const metrics = market.tokens[decision.token];
        const opened = openPositionFromDecision(decision, metrics, portfolio, cat, market.regime);
        portfolio = opened.portfolio;
        tradesToday += 1;
        cat.energy = spendEnergy(cat.energy, metrics.riskScore > 55 ? ENERGY_COSTS.highRiskTrade : ENERGY_COSTS.openTrade);
        activity = pushActivity(activity, { icon: "⚔️", message: decision.naturalLanguageReason, category: "TRADE" });
      }
    }
  } else if (cat.energy <= ENERGY_COSTS.scan) {
    cat.currentState = "sleeping";
  }

  const equityCurve = [...state.equityCurve, { timestamp: Date.now(), value: portfolio.portfolioValue }].slice(-MAX_EQUITY_POINTS);

  cat.currentThought = narrator.thought({
    state: cat.currentState,
    regime: market.regime,
    hunger: cat.hunger,
    energy: cat.energy,
    mood: cat.mood,
    focusToken: pendingProposal?.token ?? undefined,
  });

  return {
    state: {
      cat,
      portfolio,
      memories,
      activity,
      riskSettings: state.riskSettings,
      tradesToday,
      ticksSinceDayStart,
      consecutiveLosses,
      winStreak,
      lossStreak,
      pendingProposal,
      lastRefusal,
      equityCurve,
    },
    market,
  };
}

/** Called when the user approves a pending ASK_ME proposal. */
export function acceptProposal(state: SimulationState, market: MarketSnapshot): SimulationState {
  if (!state.pendingProposal || !state.pendingProposal.token) return state;
  const decision = state.pendingProposal;
  const metrics = market.tokens[decision.token!];
  const opened = openPositionFromDecision(decision, metrics, state.portfolio, state.cat, market.regime);

  const cat = { ...state.cat, currentState: "hunting" as const, energy: spendEnergy(state.cat.energy, ENERGY_COSTS.openTrade) };
  const activity = pushActivity(state.activity, { icon: "⚔️", message: decision.naturalLanguageReason, category: "TRADE" });

  return {
    ...state,
    cat,
    portfolio: opened.portfolio,
    tradesToday: state.tradesToday + 1,
    pendingProposal: null,
    activity,
  };
}

/** Called when the user declines a pending ASK_ME proposal. */
export function rejectProposal(state: SimulationState): SimulationState {
  if (!state.pendingProposal) return state;
  const award = xpForSittingOut();
  const activity = pushActivity(state.activity, {
    icon: "😼",
    message: `You held ${state.cat.name} back from ${state.pendingProposal.token}.`,
    xpChange: award.amount,
    category: "SYSTEM",
  });
  return {
    ...state,
    cat: { ...state.cat, xp: state.cat.xp + award.amount, currentState: "idle" },
    pendingProposal: null,
    activity,
  };
}
