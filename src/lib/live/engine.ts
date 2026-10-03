import type { CatBehaviorState } from "@/lib/types";

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
  /** A stock token from TOKEN_UNIVERSE, or a crypto-satellite asset (ETH, OKB). */
  symbol: string;
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

/** The Council's advisory deliberation on the staged plan. It argues; the
 * deterministic gate decides. */
export interface LiveCouncil {
  stance: string | null;
  confidence: string | null;
  asof: string | null;
  bull: string | null;
  bear: string | null;
  risk: string | null;
  synthesis: string | null;
  keyRisks: string[];
}

export interface LiveGate {
  decision: string | null;
  rationale: string[];
  council: LiveCouncil | null;
}

export interface LiveHypothesis {
  posture: string | null;
  confidence: string | null;
  expects: string | null;
  falsifier: string | null;
  watching: string[];
}

/** Sentinel's macro view: the published hypothesis, the Council's draft
 * successor (no authority until a human promotes it), and resolved views. */
export interface LiveSentinel extends LiveHypothesis {
  published: string | null;
  expires: string | null;
  /** True once the evaluation window has closed and a successor is due. */
  expired: boolean;
  hash: string | null;
  candidate: (LiveHypothesis & { asof: string | null; hash: string | null; falsifierTripped: boolean | null; assessment: string | null }) | null;
  record: { posture: string | null; published: string | null; expires: string | null; outcome: string | null }[];
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
  /** equity = tokenized stocks, crypto = the ETH/OKB satellite, reserve = undeployed cash. */
  sleeve: "equity" | "crypto" | "reserve";
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

/** One kind of real, recorded behaviour and the XP it earns. */
export interface RecordItem {
  label: string;
  count: number;
  xpEach: number;
}

/** The engine's track record, counted from public feeds every time (nothing
 * is stored here): the level can only rise as real, verifiable events accrue. */
export interface LiveRecord {
  /** When the Steward book went live (its first on-chain fill). */
  since: string | null;
  items: RecordItem[];
  xp: number;
}

export const RECORD_XP = { fill: 15, hold: 5, hypothesis: 20 } as const;

/** What the gate measured on the staged plan, and the limits it is held to. */
export interface LiveRisk {
  executorMode: string | null;
  stagedBuyUsd: number | null;
  stagedBuyPct: number | null;
  /** Advisory ceiling on deploying new risk in one go, as stated by the gate. */
  deployCeilingPct: number | null;
  largestLegPct: number | null;
  thinDeployPct: number | null;
  worstImpactPct: number | null;
  legsPassing: number;
  legsTotal: number;
  flags: string[];
}

/** One real, dated event from the public feeds. */
export interface LiveActivity {
  id: string;
  /** epoch ms */
  timestamp: number;
  icon: string;
  message: string;
  category: "SYSTEM" | "TRADE" | "RISK" | "MOOD" | "MEMORY" | "LEVEL";
  xpChange?: number;
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
  sentinel: LiveSentinel | null;
  tokens: LiveToken[];
  /** ETH and OKB: no real share behind them, so no peg or fair-price reading. */
  satellite: LiveToken[];
  book: LiveBook | null;
  backtest: LiveBacktest | null;
  record: LiveRecord | null;
  /** The engine's own answer to "could a book starting from cash enter the index now?" */
  entry: { decision: string | null; released: number; total: number } | null;
  risk: LiveRisk | null;
  activity: LiveActivity[];
  /** Feeds that could not be read this time. */
  failures: string[];
}

export interface TokenVerdict {
  verdict: LiveVerdict;
  /** One line, plain words — why the cat decided this. */
  reason: string;
  /** The same reason without this token's own numbers, for when several tokens share it. */
  shared?: string;
  /** A problem with this token specifically: always shown on its own, never folded into a group. */
  solo?: boolean;
  /** Every check, in order, pass or fail. */
  checks: { label: string; ok: boolean | null; detail: string }[];
}

const pct = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(2)}%`;

/** A token's verdict is about the token, for someone who could buy it. The gate's verdict is
 * about OUR book's rebalance: it reads "hold" when our book is on target and has nothing to
 * buy, which says nothing against the token. Only a "defer" (the rules withholding new
 * risk) or a missing reading blocks a token's verdict. */
export function rulesAllowBuying(gate: LiveGate): boolean {
  return gate.decision != null && gate.decision !== "defer";
}

function gateDetail(gate: LiveGate): string {
  if (gate.decision === "hold") return "allowed; our own book is on target, so nothing to rebalance";
  if (gate.decision === "approve") return "gate approves";
  if (gate.decision === "defer") return "gate deferring new buying";
  return "no gate reading";
}

export function verdictFor(token: LiveToken, engine: EngineState): TokenVerdict {
  const { session, gate, calendar } = engine;
  const premiumOk = token.premiumPct == null ? null : Math.abs(token.premiumPct) <= MAX_PREMIUM_PCT;
  const rulesAllow = rulesAllowBuying(gate);
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
    { label: "Rules allow buying", ok: rulesAllow, detail: gateDetail(gate) },
    { label: "Trend is strong", ok: strong, detail: token.phase ? `${token.phase} · ${token.bearing ?? "?"}` : "no phase" },
  ];

  if (engine.stale) return { verdict: "REFUSE", reason: "The engine's reading is stale. Not eating old food.", checks };
  if (token.tradable === false) return { verdict: "REFUSE", reason: `Oracle rates it ${token.rating ?? "untradable"}. Too thin to eat.`, solo: true, checks };
  if (premiumOk === false)
    return { verdict: "REFUSE", reason: `Priced ${pct(token.premiumPct!)} away from the real share. Not fair food.`, solo: true, checks };
  if (token.tradable == null || premiumOk == null) return { verdict: "REFUSE", reason: "A check is missing a reading. No proof, no bite.", solo: true, checks };
  if (!session.anchored) {
    const next = session.hoursToNextOpen != null ? ` Next live reference in ${session.hoursToNextOpen.toFixed(1)}h.` : "";
    return {
      verdict: "WAIT",
      reason: `Trades 24/7, but the real share is ${referenceLabel(session.state)}, so a fair price can't be proven yet. New buying waits.${next}`,
      checks,
    };
  }
  if (calendar.holdingNow) return { verdict: "WAIT", reason: `Calendar hold: ${holdNames}. Waiting for the print to settle.`, checks };
  if (!rulesAllow) return { verdict: "WAIT", reason: `The gate says ${gate.decision ?? "nothing yet"}. Waiting.`, checks };
  if (strong) return { verdict: "HUNT", reason: `Real, fairly priced (${pct(token.premiumPct!)}), rules allow it, ${token.phase}. Paw up.`, shared: "Real, fairly priced, rules allow it, strong trend. Paw up.", checks };
  return { verdict: "WATCH", reason: `Allowed, but ${token.phase ?? "the trend"} isn't strong enough yet. Watching.`, shared: "Allowed, but the trend isn't strong enough yet. Watching.", checks };
}

/** How the real share (the reference the token is checked against) is trading. */
export function referenceLabel(state: string | null): string {
  if (state === "us_regular") return "trading now";
  if (state === "us_extended") return "in thin extended hours";
  return "not trading";
}

/** The crypto satellite is judged by a shorter rule: there is no real share to
 * compare against, so the fair-price checks don't apply, and the Oracle gives
 * no depth score. It trades 24/7 with nothing to wait for but the calendar and gate. */
export function satelliteVerdictFor(token: LiveToken, engine: EngineState): TokenVerdict {
  const { gate, calendar } = engine;
  const rulesAllow = rulesAllowBuying(gate);
  const strong = token.bearing === "bull" && token.phase != null && STRONG_PHASES.includes(token.phase);
  const holdNames = calendar.holdingFor.map((h) => h.event).join(", ");
  const checks: TokenVerdict["checks"] = [
    { label: "Engine data", ok: !engine.stale, detail: engine.ageMinutes == null ? "no reading" : `${engine.ageMinutes} min old` },
    { label: "Token is tradable", ok: token.tradable, detail: `${token.rating ?? "unknown"} · no Oracle depth score for this asset` },
    { label: "Fair price provable", ok: null, detail: "not applicable: no real share behind it" },
    { label: "Price is fair", ok: null, detail: "not applicable: it is the asset, not a wrapper" },
    { label: "Calendar is clear", ok: !calendar.holdingNow, detail: calendar.holdingNow ? `holding for ${holdNames}` : "no hold" },
    { label: "Rules allow buying", ok: rulesAllow, detail: gateDetail(gate) },
    { label: "Trend is strong", ok: strong, detail: token.phase ? `${token.phase} · ${token.bearing ?? "?"}` : "no phase" },
  ];
  if (engine.stale) return { verdict: "REFUSE", reason: "The engine's reading is stale. Not eating old food.", checks };
  if (token.tradable !== true) return { verdict: "REFUSE", reason: `Rated ${token.rating ?? "unknown"}. No proof it can be traded cleanly.`, solo: true, checks };
  if (calendar.holdingNow) return { verdict: "WAIT", reason: `Calendar hold: ${holdNames}. Waiting for the print to settle.`, checks };
  if (!rulesAllow) return { verdict: "WAIT", reason: `The gate says ${gate.decision ?? "nothing yet"}. Waiting.`, checks };
  if (strong) return { verdict: "HUNT", reason: `Tradable, rules allow it, ${token.phase}. Paw up.`, shared: "Tradable, rules allow it, strong trend. Paw up.", checks };
  return { verdict: "WATCH", reason: `Allowed, but ${token.phase ?? "the trend"} isn't strong enough yet. Watching.`, shared: "Allowed, but the trend isn't strong enough yet. Watching.", checks };
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
  if (hunts.length) {
    // Paw up means "this is good food", not "we are buying": say so when our own bowl is full.
    const full = engine.gate.decision === "hold" ? " Our own book is already on target." : "";
    return { state: "stalking", headline: "HUNT", thought: `${hunts.map(([s]) => s).join(", ")}: real, fair and allowed. Paw up.${full}` };
  }
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

export interface LiveVital {
  key: string;
  icon: string;
  label: string;
  color: string;
  /** 0-100 */
  value: number;
  /** What the bar is measuring right now, in plain words. */
  caption: string;
}

const clamp100 = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
const CONFIDENCE_SCORE: Record<string, number> = { high: 90, medium: 60, low: 30 };
const POSTURE_CAUTION: Record<string, number> = { defensive: 85, cautious: 65, neutral: 45, constructive: 25 };

/** The cat's vitals in Live mode: each bar is a real reading from the engine. */
export function liveVitals(engine: EngineState): LiveVital[] {
  const { book, gate, sentinel, calendar } = engine;
  const targeted = book?.holdings.filter((h) => h.targetPct != null) ?? [];
  const gap = targeted.reduce((sum, h) => sum + Math.abs(h.pct - h.targetPct!), 0);
  const planUsd = book?.plan.filter((p) => p.side === "BUY").reduce((sum, p) => sum + p.usd, 0) ?? 0;
  const confidence = gate.council?.confidence?.toLowerCase() ?? "";
  const posture = sentinel?.posture?.toLowerCase() ?? "";
  const holds = calendar.holdingFor.map((h) => h.event).join(", ");

  return [
    {
      key: "health",
      icon: "❤️",
      label: "Health",
      color: "#ff5d5d",
      value: book ? clamp100(100 - gap) : 0,
      caption: book ? `Book is ${gap.toFixed(1)} points off its target weights` : "No book reading",
    },
    {
      key: "energy",
      icon: "⚡",
      label: "Energy",
      color: "#ffd23f",
      value: book ? clamp100(book.reservePct) : 0,
      caption: book ? `${book.reservePct.toFixed(1)}% of the book is in reserve, ready to deploy` : "No book reading",
    },
    {
      key: "hunger",
      icon: "🍣",
      label: "Hunger",
      color: "#ff9f4f",
      value: book && book.reserveUsd > 0 ? clamp100((planUsd / book.reserveUsd) * 100) : 0,
      caption: planUsd > 0 ? `Wants to buy $${planUsd.toFixed(2)} of the $${book!.reserveUsd.toFixed(2)} reserve` : "Nothing staged to buy",
    },
    {
      key: "focus",
      icon: "🎯",
      label: "Focus",
      color: "var(--info)",
      value: engine.ageMinutes == null ? 0 : clamp100(100 - (engine.ageMinutes / STALE_AFTER_MIN) * 100),
      caption: engine.ageMinutes == null ? "No engine reading" : `Engine reading is ${engine.ageMinutes} min old`,
    },
    {
      key: "confidence",
      icon: "😼",
      label: "Confidence",
      color: "var(--acid)",
      value: CONFIDENCE_SCORE[confidence] ?? 0,
      caption: gate.council?.stance ? `Council is ${confidence || "unrated"} confidence in "${gate.council.stance}"` : "No Council reading",
    },
    {
      key: "caution",
      icon: "🛡",
      label: "Caution",
      color: "#ff4fa6",
      value: clamp100((POSTURE_CAUTION[posture] ?? 50) + (calendar.holdingNow ? 20 : 0)),
      caption: `Macro view: ${posture || "unknown"}${calendar.holdingNow ? ` · holding for ${holds}` : " · calendar clear"}`,
    },
  ];
}

const MOOD: Record<LiveVerdict, string> = { HUNT: "Alert", WAIT: "Patient", REFUSE: "Wary", WATCH: "Calm" };
export const liveMood = (headline: LiveVerdict) => MOOD[headline];
