import type { Archetype, PersonalityTraits } from "./personality";

export type EvolutionStage = "Kitten" | "Street Cat" | "Hunter" | "Cyber Cat" | "Apex Cat" | "Legendary";

export type CatBehaviorState =
  | "sleeping"
  | "idle"
  | "watching"
  | "stalking"
  | "hunting"
  | "celebrating"
  | "injured"
  | "nervous"
  | "curious"
  | "bored";

/** How much authority the agent has to act without a human in the loop.
 * Every mode still passes through the RiskEngine — this only controls
 * whether a human confirms before a paper trade executes. */
export type AutonomyMode = "PAPER_OBSERVER" | "ASK_ME" | "AUTONOMOUS_PAPER";

export interface CatState {
  id: string;
  name: string;
  archetype: Archetype;
  personality: PersonalityTraits;

  health: number; // 0-100, driven by drawdown
  energy: number; // 0-100, rate-limits activity
  hunger: number; // 0-100, desire to search
  mood: number; // -100..100
  focus: number; // 0-100, required signal quality
  confidence: number; // 0-100, position sizing tendency
  caution: number; // 0-100, risk tolerance (inverse-ish of confidence)

  xp: number;
  level: number; // 1-50
  evolutionStage: EvolutionStage;
  lives: number; // 0-9

  currentState: CatBehaviorState;
  currentThought: string;
  lastAction: string | null;

  autonomyMode: AutonomyMode;
  cooldownUntil: number | null; // epoch ms, null when not in cooldown

  createdAt: number;
}

export const XP_FOR_LEVEL = (level: number) => 50 * (level - 1) ** 2;

export function levelForXP(xp: number): number {
  let level = 1;
  while (level < 50 && xp >= XP_FOR_LEVEL(level + 1)) level++;
  return level;
}

export function evolutionStageForLevel(level: number): EvolutionStage {
  if (level >= 50) return "Legendary";
  if (level >= 35) return "Apex Cat";
  if (level >= 20) return "Cyber Cat";
  if (level >= 10) return "Hunter";
  if (level >= 5) return "Street Cat";
  return "Kitten";
}
