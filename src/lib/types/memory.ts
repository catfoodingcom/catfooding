export type MemoryOutcome = "POSITIVE" | "NEGATIVE" | "NEUTRAL";

export interface Memory {
  id: string;
  timestamp: number;
  token: string;
  eventType: string;
  description: string;
  lesson: string;
  importance: number; // 0-100
  outcome: MemoryOutcome;
  tags: string[];
}
