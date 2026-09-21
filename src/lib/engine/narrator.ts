import type { CatBehaviorState, MarketRegime, TokenSymbol } from "@/lib/types";

/**
 * Everything that turns cold numbers into cat-voiced language goes through
 * this interface. TemplateCatNarrator (below) is deterministic and needs no
 * network call — that's what ships in the MVP. A future LlmCatNarrator could
 * implement the same interface (e.g. calling an LLM with the same context
 * object) and be swapped in via getNarrator() without touching any UI or
 * engine code that consumes narration.
 */
export interface CatNarrator {
  thought(context: ThoughtContext): string;
  tradeReason(token: TokenSymbol, reasonCodes: string[], catName: string): string;
  exitReason(token: TokenSymbol, pnlPercent: number, catName: string): string;
  memoryDescription(input: MemoryNarrationInput): { description: string; lesson: string };
  riskRejection(reasonCodes: string[], catName: string): string;
}

export interface ThoughtContext {
  state: CatBehaviorState;
  regime: MarketRegime;
  hunger: number;
  energy: number;
  mood: number;
  focusToken?: TokenSymbol;
}

export interface MemoryNarrationInput {
  token: TokenSymbol;
  outcome: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
  pnlPercent: number;
  reasonCodes: string[];
}

function pick<T>(arr: T[], seedValue: number): T {
  const idx = Math.floor(Math.abs(Math.sin(seedValue) * 10000)) % arr.length;
  return arr[idx];
}

const THOUGHTS: Record<CatBehaviorState, string[]> = {
  sleeping: ["Zzz...", "Dreaming of tuna charts.", "Not now. Recharging."],
  idle: ["...", "Watching the room.", "Waiting for something to move."],
  watching: ["Something is moving...", "Too noisy. I'm watching.", "Volume is waking up."],
  stalking: ["That mouse is fast.", "Getting closer...", "Almost. Not yet."],
  hunting: ["I'm going hunting.", "Locked on.", "Now."],
  celebrating: ["Got it!", "Good hunt.", "That felt right."],
  injured: ["Ow. That one hurt.", "Licking my wounds.", "Need a minute."],
  nervous: ["Too dangerous.", "Something feels wrong.", "Nope. Smells wrong."],
  curious: ["Big bird.", "What's that?", "Interesting..."],
  bored: ["Nothing's moving.", "Boring market.", "I'm tired."],
};

const REASON_PHRASES: Partial<Record<string, string>> = {
  HIGH_MOMENTUM: "moving faster than the rest of the pack",
  VOLUME_ACCELERATION: "volume is picking up fast",
  STRONG_LIQUIDITY: "there's enough depth to hunt safely",
  CONFIRMED_TREND: "the trend has held up",
  OUTPERFORMING_MARKET: "outrunning the rest of the market",
  LOW_RISK_SCORE: "the setup feels clean",
  THIN_LIQUIDITY: "the water looks shallow",
  ELEVATED_RISK: "the ground feels unstable",
  MARGINAL_SETUP: "nothing special, but worth a look",
};

export class TemplateCatNarrator implements CatNarrator {
  thought(context: ThoughtContext): string {
    const bank = THOUGHTS[context.state] ?? THOUGHTS.idle;
    return pick(bank, Date.now() / 1000 + context.hunger + context.energy);
  }

  tradeReason(token: TokenSymbol, reasonCodes: string[], catName: string): string {
    const positives = reasonCodes.filter((c) => REASON_PHRASES[c] && !["THIN_LIQUIDITY", "ELEVATED_RISK"].includes(c));
    const phrases = positives.length ? positives : reasonCodes;
    const clauses = phrases.slice(0, 2).map((c) => REASON_PHRASES[c] ?? "the signal looked right");
    const joined = clauses.length > 1 ? `${clauses[0]}, and ${clauses[1]}` : clauses[0] ?? "the signal looked right";
    return `${catName} spotted ${token} — ${joined}.`;
  }

  exitReason(token: TokenSymbol, pnlPercent: number, catName: string): string {
    if (pnlPercent >= 0) {
      return `${catName} took the win on ${token} and backed away clean.`;
    }
    return `${catName} got scratched on ${token} and pulled back.`;
  }

  memoryDescription(input: MemoryNarrationInput): { description: string; lesson: string } {
    if (input.outcome === "NEGATIVE" && input.reasonCodes.includes("THIN_LIQUIDITY")) {
      return {
        description: `Chased ${input.token} into shallow water and got scratched, ${Math.abs(input.pnlPercent).toFixed(1)}% down.`,
        lesson: "Avoid tokens with liquidity below the configured threshold.",
      };
    }
    if (input.outcome === "NEGATIVE") {
      return {
        description: `${input.token} turned on the way in — closed ${Math.abs(input.pnlPercent).toFixed(1)}% down.`,
        lesson: "Respect the stop. Don't wait for it to come back.",
      };
    }
    if (input.outcome === "POSITIVE") {
      return {
        description: `${input.token} ran clean, closed +${input.pnlPercent.toFixed(1)}%.`,
        lesson: "That setup — momentum plus real liquidity — is worth repeating.",
      };
    }
    return {
      description: `Watched ${input.token} without acting.`,
      lesson: "Sitting out a marginal setup is still a decision.",
    };
  }

  riskRejection(reasonCodes: string[], catName: string): string {
    if (reasonCodes.includes("LIQUIDITY_BELOW_MINIMUM")) return `${catName} doesn't like this one. Too shallow.`;
    if (reasonCodes.includes("TOKEN_RISK_ABOVE_LIMIT")) return `${catName} smells danger here.`;
    if (reasonCodes.includes("MAX_DRAWDOWN_EXCEEDED")) return `${catName} got spooked and went to bed.`;
    if (reasonCodes.includes("COOLDOWN_AFTER_LOSSES")) return `${catName} is licking wounds. Needs time.`;
    if (reasonCodes.includes("MAX_OPEN_POSITIONS_REACHED")) return `${catName}'s paws are full right now.`;
    if (reasonCodes.includes("CHASING_EXTENDED_MOVE")) return `${catName} isn't chasing that one — it already ran too far.`;
    return `${catName} backed off. Something wasn't right.`;
  }
}

let narratorInstance: CatNarrator | null = null;
export function getNarrator(): CatNarrator {
  if (!narratorInstance) narratorInstance = new TemplateCatNarrator();
  return narratorInstance;
}
