import type { ActivityEvent, AgentDecision, CatState, Memory, Portfolio, RiskSettings } from "@/lib/types";

export interface EquityPoint {
  timestamp: number;
  value: number;
}

export interface SimulationState {
  cat: CatState;
  portfolio: Portfolio;
  memories: Memory[];
  activity: ActivityEvent[];
  riskSettings: RiskSettings;
  tradesToday: number;
  ticksSinceDayStart: number;
  consecutiveLosses: number;
  winStreak: number;
  lossStreak: number;
  pendingProposal: AgentDecision | null;
  equityCurve: EquityPoint[];
}

export const TICKS_PER_SIM_DAY = 180;
export const MAX_ACTIVITY_LOG = 200;
export const MAX_EQUITY_POINTS = 300;
