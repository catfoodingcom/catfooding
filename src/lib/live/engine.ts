import type { CatBehaviorState, TokenSymbol } from "@/lib/types";

/**
 * Live mode: what the CoAgentic engine currently says about each token, and
 * the fixed rule table that turns it into the cat's verdict. Pure — the
 * /api/engine route builds the state, the room renders it.
 */

export type LiveVerdict = "REFUSE" | "WAIT" | "HUNT" | "WATCH";

/** Premium (or discount) to the real share beyond this is not fair food. */
export const MAX_PREMIUM_PCT = 1;
/** The Steward feed refreshes every 30 min; older than this is not current evidence. */
export const STALE_AFTER_MIN = 120;
const STRONG_PHASES = ["Breaking", "Running", "Expansion"];

export interface LiveToken {
  symbol: TokenSymbol;
  tradable: boolean | null;
  rating: string | null;
  score: number | null;
  liquidityUsd: number | null;
  premiumPct: number | null;
  realPrice: number | null;
  wrapperPrice: number | null;
  phase: string | null;
  bearing: string | null;
  /** USD the Steward plan wants to buy (+) or sell (-) of this token, if any. */
  planUsd: number | null;
}

export interface LiveGate {
  decision: string | null;
  rationale: string[];
  council: { stance: string | null; confidence: string | null } | null;
}

export interface LiveSession {
  state: string | null;
  anchored: boolean | null;
  hoursToNextOpen: number | null;
}

export interface LiveCalendarEvent {
  date: string;
  timeUtc: string | null;
  event: string;
  series: string | null;
  region: string | null;
  impact: string | null;
  note: string | null;
  previous: number | null;
  forecast: number | null;
  actual: number | null;
  unit: string | null;
  inHours: number | null;
  hold: { from: string; to: string; wholeDay: boolean; active: boolean } | null;
}

export interface LiveHolding {
  symbol: string;
  usd: number;
  balance: number | null;
  price: number | null;
  /** position | cash | gas */
  kind: string;
  /** Share of the book now, and the Steward target for it (null = no target). */
  pct: number;
  targetPct: number | null;
}

/** The real book: what the wallet actually holds. */
export interface LiveBook {
  observedAt: string | null;
  equityUsd: number;
  reserveUsd: number;
  reservePct: number;
  atRiskUsd: number;
  holdings: LiveHolding[];
  /** Steward's staged orders, not yet authorized. */
  plan: { side: string; symbol: string; usd: number }[];
}

/** Index as-if performance: current weights applied back over the window.
 * NOT the book's actual returns. */
export interface LiveBacktest {
  from: string | null;
  to: string | null;
  index: number[];
  equalWeight: number[];
  ethHold: number[];
  returns: { index: number | null; equalWeight: number | null; ethHold: number | null };
}

export interface EngineState {
  ok: boolean;
  fetchedAt: string;
  /** When the Steward engine last ran. */
  asof: string | null;
  ageMinutes: number | null;
  stale: boolean;
  equity: number | null;
  session: LiveSession;
  gate: LiveGate;
  calendar: {
    holdingNow: boolean;
    holdingFor: { date: string; event: string }[];
    upcoming: LiveCalendarEvent[];
    rule: string | null;
  };
  sentinel: { posture: string | null; confidence: string | null; expires: string | null } | null;
  tokens: LiveToken[];
  book: LiveBook | null;
  backtest: LiveBacktest | null;
  /** Feeds that could not be read this time. */
  failures: string[];
}

export interface TokenVerdict {
  verdict: LiveVerdict;
  /** One line, plain words — why the cat decided this. */
  reason: string;
  /** Every check, in order, pass or fail. */
  checks: { label: string; ok: boolean | null; detail: string }[];
}

const pct = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(2)}%`;

export function verdictFor(token: LiveToken, engine: EngineState): TokenVerdict {
  const { session, gate, calendar } = engine;
  const premiumOk = token.premiumPct == null ? null : Math.abs(token.premiumPct) <= MAX_PREMIUM_PCT;
  const gateApproves = gate.decision === "approve";
  const strong = token.bearing === "bull" && token.phase != null && STRONG_PHASES.includes(token.phase);
  const holdNames = calendar.holdingFor.map((h) => h.event).join(", ");

  const checks: TokenVerdict["checks"] = [
    { label: "Engine data", ok: !engine.stale, detail: engine.ageMinutes == null ? "no reading" : `${engine.ageMinutes} min old` },
    {
      label: "Token is tradable",
      ok: token.tradable,
      detail: token.liquidityUsd == null ? (token.rating ?? "unknown") : `${token.rating ?? "?"} · $${Math.round(token.liquidityUsd / 1000)}k liquidity`,
    },
    // The tokens trade 24/7; only the real share (the fairness reference) keeps exchange hours.
    { label: "Fair price provable", ok: session.anchored, detail: session.anchored ? "real share is trading now" : `real share ${referenceLabel(session.state)}; token still trades 24/7` },
    {
      label: "Price is fair",
      ok: premiumOk,
      detail: token.premiumPct == null ? "no peg reading" : `${pct(token.premiumPct)} vs ${session.anchored ? "the real share" : "the last reference price"} (limit ±${MAX_PREMIUM_PCT}%)`,
    },
    { label: "Calendar is clear", ok: !calendar.holdingNow, detail: calendar.holdingNow ? `holding for ${holdNames}` : "no hold" },
    { label: "Gate approves", ok: gateApproves, detail: gate.decision ?? "unknown" },
    { label: "Trend is strong", ok: strong, detail: token.phase ? `${token.phase} · ${token.bearing ?? "?"}` : "no phase" },
  ];

  if (engine.stale) return { verdict: "REFUSE", reason: "The engine's reading is stale. Not eating old food.", checks };
  if (token.tradable === false) return { verdict: "REFUSE", reason: `Oracle rates it ${token.rating ?? "untradable"}. Too thin to eat.`, checks };
  if (premiumOk === false)
    return { verdict: "REFUSE", reason: `Priced ${pct(token.premiumPct!)} away from the real share. Not fair food.`, checks };
  if (token.tradable == null || premiumOk == null) return { verdict: "REFUSE", reason: "A check is missing a reading. No proof, no bite.", checks };
  if (!session.anchored) {
    const next = session.hoursToNextOpen != null ? ` Next live reference in ${session.hoursToNextOpen.toFixed(1)}h.` : "";
    return {
      verdict: "WAIT",
      reason: `Trades 24/7, but the real share is ${referenceLabel(session.state)}, so a fair price can't be proven yet. New buying waits.${next}`,
      checks,
    };
  }
  if (calendar.holdingNow) return { verdict: "WAIT", reason: `Calendar hold: ${holdNames}. Waiting for the print to settle.`, checks };
  if (!gateApproves) return { verdict: "WAIT", reason: `The gate says ${gate.decision ?? "nothing yet"}. Waiting.`, checks };
  if (strong) return { verdict: "HUNT", reason: `Real, fairly priced (${pct(token.premiumPct!)}), gate approves, ${token.phase}. Paw up.`, checks };
  return { verdict: "WATCH", reason: `Allowed, but ${token.phase ?? "the trend"} isn't strong enough yet. Watching.`, checks };
}

/** How the real share (the reference the token is checked against) is trading. */
export function referenceLabel(state: string | null): string {
  if (state === "us_regular") return "trading now";
  if (state === "us_extended") return "in thin extended hours";
  return "not trading";
}

export interface CatRead {
  state: CatBehaviorState;
  thought: string;
  headline: LiveVerdict;
}

/** One cat, six tokens: the cat shows the most actionable thing it sees. */
export function catRead(engine: EngineState, verdicts: Record<string, TokenVerdict>): CatRead {
  const all = Object.entries(verdicts);
  const of = (v: LiveVerdict) => all.filter(([, t]) => t.verdict === v);
  const hunts = of("HUNT");
  if (hunts.length) return { state: "stalking", headline: "HUNT", thought: `${hunts.map(([s]) => s).join(", ")}: real, fair and allowed. Paw up.` };
  const refuses = of("REFUSE");
  if (refuses.length) {
    const thought = refuses.length === all.length ? refuses[0][1].reason : `Refusing ${refuses.map(([s]) => s).join(", ")}. ${refuses[0][1].reason}`;
    return { state: "nervous", headline: "REFUSE", thought };
  }
  const waits = of("WAIT");
  if (waits.length) return { state: "watching", headline: "WAIT", thought: waits[0][1].reason };
  if (!all.length) return { state: "curious", headline: "WATCH", thought: "Can't reach the engine. Not guessing." };
  return { state: "idle", headline: "WATCH", thought: "Everything's allowed, nothing's strong. Watching." };
}
