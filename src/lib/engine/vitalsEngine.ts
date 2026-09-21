import { clamp } from "@/lib/market/random";

/** Piecewise-linear so the drop from 0%→15% drawdown reads the way the spec
 * describes it: 0%→100, 5%→~80, 10%→~55, 15%→~25, 20%+→forced sleep. */
const DRAWDOWN_HEALTH_POINTS: [number, number][] = [
  [0, 100],
  [5, 80],
  [10, 55],
  [15, 25],
  [20, 5],
];

export function healthFromDrawdown(drawdownPercent: number): number {
  const pts = DRAWDOWN_HEALTH_POINTS;
  if (drawdownPercent <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (drawdownPercent <= pts[i][0]) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      const t = (drawdownPercent - x0) / (x1 - x0);
      return y0 + (y1 - y0) * t;
    }
  }
  return pts[pts.length - 1][1];
}

/** Energy costs per the spec's "ENERGY SYSTEM" — a hard rate limiter on
 * top of (not instead of) the RiskEngine's trade-count limits. */
export const ENERGY_COSTS = {
  scan: 1,
  watch: 2,
  openTrade: 8,
  highRiskTrade: 12,
  closeTrade: 4,
} as const;

export const ENERGY_REGEN_PER_TICK = 3;
export const SLEEP_ENERGY_THRESHOLD = 12;

export function regenerateEnergy(current: number): number {
  return clamp(current + ENERGY_REGEN_PER_TICK, 0, 100);
}

export function spendEnergy(current: number, cost: number): number {
  return clamp(current - cost, 0, 100);
}

/** Hunger drifts up over time (desire to search); feeding/finding good
 * setups brings it back down. Never gated behind real money. */
export function driftHunger(current: number, ticksElapsed = 1): number {
  return clamp(current + 0.6 * ticksElapsed, 0, 100);
}

export function satiateHunger(current: number, amount: number): number {
  return clamp(current - amount, 0, 100);
}

export interface MoodInputs {
  currentMood: number;
  dailyPnLPercent: number;
  winStreak: number;
  lossStreak: number;
  health: number;
}

/** Mood is expressive, not a risk control — it influences dialogue and
 * animation, never position sizing directly (personality traits do that). */
export function updateMood(inputs: MoodInputs): number {
  let mood = inputs.currentMood * 0.9;
  mood += inputs.dailyPnLPercent * 4;
  mood += inputs.winStreak * 6;
  mood -= inputs.lossStreak * 8;
  if (inputs.health < 40) mood -= 10;
  return clamp(mood, -100, 100);
}

export function moodLabel(mood: number, health: number): "happy" | "confident" | "curious" | "nervous" | "angry" | "sleepy" | "bored" | "injured" {
  if (health < 30) return "injured";
  if (mood > 60) return "happy";
  if (mood > 25) return "confident";
  if (mood > -10) return "curious";
  if (mood > -35) return "bored";
  if (mood > -60) return "nervous";
  return "angry";
}
