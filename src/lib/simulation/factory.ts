import type { Archetype, CatState, Portfolio } from "@/lib/types";
import { DEFAULT_RISK_SETTINGS } from "@/lib/types";
import { ARCHETYPE_TRAITS } from "@/lib/personality/archetypes";
import type { SimulationState } from "./types";

let counter = 0;
function id(prefix: string) {
  counter += 1;
  return `${prefix}_${Date.now()}_${counter}`;
}

export function createCat(input: { name: string; archetype: Archetype }): CatState {
  return {
    id: id("cat"),
    name: input.name,
    archetype: input.archetype,
    personality: { ...ARCHETYPE_TRAITS[input.archetype] },
    health: 100,
    energy: 100,
    hunger: 25,
    mood: 15,
    focus: 55,
    confidence: 50,
    caution: 50,
    xp: 0,
    level: 1,
    evolutionStage: "Kitten",
    lives: 9,
    currentState: "idle",
    currentThought: "Smells like fresh tape.",
    lastAction: null,
    autonomyMode: "ASK_ME",
    cooldownUntil: null,
    createdAt: Date.now(),
  };
}

export function createPortfolio(startingCapital: number): Portfolio {
  return {
    startingCapital,
    cash: startingCapital,
    portfolioValue: startingCapital,
    realisedPnL: 0,
    unrealisedPnL: 0,
    dailyPnL: 0,
    peakPortfolioValue: startingCapital,
    drawdown: 0,
    openPositions: [],
    tradeHistory: [],
  };
}

export function createSimulationState(input: { name: string; archetype: Archetype; startingCapital: number }): SimulationState {
  return {
    cat: createCat(input),
    portfolio: createPortfolio(input.startingCapital),
    memories: [],
    activity: [{ id: id("act"), timestamp: Date.now(), icon: "🐱", message: `${input.name} woke up in a new bowl.`, category: "SYSTEM" }],
    riskSettings: { ...DEFAULT_RISK_SETTINGS },
    tradesToday: 0,
    ticksSinceDayStart: 0,
    consecutiveLosses: 0,
    winStreak: 0,
    lossStreak: 0,
    pendingProposal: null,
    equityCurve: [{ timestamp: Date.now(), value: input.startingCapital }],
  };
}

/** Hand-authored per the spec's "SAMPLE STATE" section — not derived by
 * fast-forwarding the simulator, just a believable mid-run snapshot so a
 * first-time visitor sees a populated room immediately. */
export function createDemoSeed(): SimulationState {
  const cat: CatState = {
    id: "demo_mochi",
    name: "Mochi",
    archetype: "Hunter",
    personality: { ...ARCHETYPE_TRAITS.Hunter },
    health: 92,
    energy: 68,
    hunger: 58,
    mood: 65,
    focus: 71,
    confidence: 73,
    caution: 54,
    xp: 2480,
    level: 7,
    evolutionStage: "Street Cat",
    lives: 9,
    currentState: "idle",
    currentThought: "Volume is waking up.",
    lastAction: "Exited TSLAx at +6.4%",
    autonomyMode: "ASK_ME",
    cooldownUntil: null,
    createdAt: Date.now() - 1000 * 60 * 60 * 6,
  };

  const portfolio: Portfolio = {
    startingCapital: 1000,
    cash: 1122.4,
    portfolioValue: 1284,
    realisedPnL: 284,
    unrealisedPnL: 0,
    dailyPnL: 42.6,
    peakPortfolioValue: 1310,
    drawdown: computeDemoDrawdown(),
    openPositions: [
      {
        id: "demo_pos_1",
        token: "MSTRx",
        symbol: "MSTRx",
        entryPrice: 150,
        currentPrice: 154,
        quantity: 1.1,
        positionValue: 168.5,
        allocationPercent: 13.1,
        stopLoss: 144,
        takeProfit: 168,
        openedAt: Date.now() - 1000 * 60 * 24,
        strategy: "Hunter",
        confidence: 68,
        reason: "Mochi spotted MSTRx — moving faster than the rest of the pack, and volume is picking up fast.",
      },
    ],
    tradeHistory: [
      {
        id: "demo_trade_1",
        token: "TSLAx",
        symbol: "TSLAx",
        side: "BUY",
        entryPrice: 342,
        exitPrice: 364,
        quantity: 0.72,
        positionSizePercent: 2.4,
        openedAt: Date.now() - 1000 * 60 * 90,
        closedAt: Date.now() - 1000 * 60 * 40,
        pnl: 15.8,
        pnlPercent: 6.4,
        status: "TOOK_PROFIT",
        marketRegime: "RISK_ON",
        signalScores: { momentum: 82, volume: 76, liquidity: 91, trend: 79, relativeStrength: 74, risk: 43, overallOpportunity: 79 },
        catStateAtEntry: { health: 95, energy: 80, mood: 40, confidence: 65, focus: 68, caution: 50, level: 6 },
        reasonCodes: ["HIGH_MOMENTUM", "VOLUME_ACCELERATION", "STRONG_LIQUIDITY"],
        naturalLanguageReason: "Mochi spotted TSLAx — moving faster than the rest of the pack, and volume is picking up fast.",
        exitReason: "Mochi took the win on TSLAx and backed away clean.",
        riskNotes: null,
        xpEarned: 42,
        memoryId: "demo_mem_1",
      },
    ],
  };

  return {
    cat,
    portfolio,
    memories: [
      {
        id: "demo_mem_1",
        timestamp: Date.now() - 1000 * 60 * 40,
        token: "TSLAx",
        eventType: "TAKE_PROFIT",
        description: "TSLAx ran clean, closed +6.4%.",
        lesson: "That setup — momentum plus real liquidity — is worth repeating.",
        importance: 71,
        outcome: "POSITIVE",
        tags: ["TSLAx", "HIGH_MOMENTUM", "VOLUME_ACCELERATION", "STRONG_LIQUIDITY"],
      },
    ],
    activity: [
      { id: "demo_act_5", timestamp: Date.now() - 1000 * 60 * 5, icon: "😼", message: "Position is +4.1%.", category: "TRADE" },
      { id: "demo_act_4", timestamp: Date.now() - 1000 * 60 * 24, icon: "⚔️", message: "Mochi entered MSTRx at $150.", category: "TRADE" },
      { id: "demo_act_3", timestamp: Date.now() - 1000 * 60 * 40, icon: "🏆", message: "Mochi exited TSLAx at +6.4%. +42 XP.", xpChange: 42, category: "TRADE" },
      { id: "demo_act_2", timestamp: Date.now() - 1000 * 60 * 55, icon: "⚔️", message: "Mochi entered TSLAx at $342.", category: "TRADE" },
      { id: "demo_act_1", timestamp: Date.now() - 1000 * 60 * 90, icon: "👀", message: "Mochi spotted TSLAx.", category: "TRADE" },
    ],
    riskSettings: { ...DEFAULT_RISK_SETTINGS },
    tradesToday: 2,
    ticksSinceDayStart: 40,
    consecutiveLosses: 0,
    winStreak: 1,
    lossStreak: 0,
    pendingProposal: null,
    equityCurve: Array.from({ length: 12 }, (_, i) => ({
      timestamp: Date.now() - (11 - i) * 1000 * 60 * 8,
      value: 1000 + i * 24 + Math.sin(i) * 15,
    })),
  };
}

function computeDemoDrawdown() {
  const peak = 1310;
  const current = 1284;
  return ((peak - current) / peak) * 100;
}
