import { NextResponse } from "next/server";
import { TOKEN_UNIVERSE } from "@/lib/types";
import {
  RECORD_XP,
  STALE_AFTER_MIN,
  type EngineState,
  type LiveBacktest,
  type LiveBook,
  type LiveCalendarEvent,
  type LiveActivity,
  type LiveRecord,
  type LiveRisk,
  type LiveToken,
} from "@/lib/live/engine";

// The CoAgentic public feeds send no CORS header, so the browser can't read
// them from this domain. This route reads them server-side and returns only
// the fields the cat needs.
const FEED_BASE = process.env.COAGENTIC_FEED_BASE ?? "https://tv.coagentic.markets";
const TIMEOUT_MS = 8000;

export const revalidate = 60;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = Record<string, any>;

async function feed(name: string, failures: string[]): Promise<Raw | null> {
  try {
    const res = await fetch(`${FEED_BASE}/api/public/${name}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      next: { revalidate },
    });
    if (!res.ok) throw new Error(String(res.status));
    return (await res.json()) as Raw;
  } catch {
    failures.push(name);
    return null;
  }
}

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null);

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

function hypothesis(h: Raw) {
  return { posture: str(h.posture), confidence: str(h.confidence), expects: str(h.expects), falsifier: str(h.falsifier), watching: strings(h.watching) };
}

function calendarEvent(e: Raw): LiveCalendarEvent {
  return {
    date: String(e.date),
    timeUtc: str(e.timeUtc),
    event: String(e.event),
    series: str(e.series),
    region: str(e.region),
    impact: str(e.impact),
    note: str(e.note),
    previous: num(e.previous),
    forecast: num(e.forecast),
    actual: num(e.actual),
    unit: str(e.unit),
    inHours: num(e.inHours),
    hold: e.hold ? { from: String(e.hold.from), to: String(e.hold.to), wholeDay: !!e.hold.wholeDay, active: !!e.hold.active } : null,
  };
}

// The index names ETH; the book holds it as xETH on X Layer.
const TARGET_ALIAS: Record<string, string> = { xETH: "ETH" };

function buildBook(book: Raw | null, tei: Raw | null, swaps: Raw[]): LiveBook | null {
  const b: Raw | undefined = book?.books?.[0];
  if (!b || num(b.equityUsd) == null) return null;
  const targets = new Map<string, number>((tei?.constituents ?? []).map((c: Raw) => [String(c.symbol), Number(c.weightPct)]));
  const sleeves = new Map<string, string>((tei?.constituents ?? []).map((c: Raw) => [String(c.symbol), String(c.sleeve)]));
  const universe = new Set<string>(TOKEN_UNIVERSE);
  return {
    observedAt: str(book?.observedAt),
    equityUsd: b.equityUsd,
    reserveUsd: num(b.dryPowderUsd) ?? 0,
    reservePct: num(b.dryPowderPct) ?? 0,
    atRiskUsd: num(b.atRiskUsd) ?? 0,
    holdings: (b.holdings ?? [])
      .filter((h: Raw) => !h.dust && num(h.usd) != null)
      .map((h: Raw) => {
        const symbol = String(h.symbol);
        const kind = str(h.kind) ?? "position";
        const declared = sleeves.get(TARGET_ALIAS[symbol] ?? symbol);
        const sleeve = kind === "cash" ? "reserve" : declared === "equity" || universe.has(symbol) ? "equity" : "crypto";
        return {
          symbol,
          usd: h.usd,
          balance: num(h.balance),
          price: num(h.price),
          kind,
          sleeve,
          pct: Math.round((h.usd / b.equityUsd) * 1000) / 10,
          targetPct: targets.get(TARGET_ALIAS[symbol] ?? symbol) ?? null,
        };
      }),
    plan: swaps.filter((s) => num(s.usd) != null).map((s) => ({ side: String(s.side), symbol: String(s.symbol), usd: s.usd })),
  };
}

function buildBacktest(tei: Raw | null): LiveBacktest | null {
  const nav: Raw | undefined = tei?.nav;
  const series = (v: unknown) => (Array.isArray(v) ? v.filter((n): n is number => typeof n === "number") : []);
  const index = series(nav?.nav?.tei);
  if (!nav || index.length < 2) return null;
  return {
    from: str(nav.from),
    to: str(nav.to),
    index,
    equalWeight: series(nav.nav.equal),
    ethHold: series(nav.nav.ethhold),
    returns: { index: num(nav.metrics?.tei?.ret), equalWeight: num(nav.metrics?.equal?.ret), ethHold: num(nav.metrics?.ethhold?.ret) },
  };
}

// The track record is recounted from the public feeds on every read, starting
// at the Steward book's first on-chain fill. Nothing is stored or self-reported.
function buildRecord(trades: Raw | null, calendar: Raw | null, sentinel: Raw | null): LiveRecord | null {
  if (!trades) return null;
  const universe = new Set<string>(TOKEN_UNIVERSE);
  const all: Raw[] = Array.isArray(trades.trades) ? trades.trades : [];
  const stewardFills = all.filter((t) => universe.has(String(t.symbol)) && str(t.txHash) && str(t.ts));
  const since = stewardFills.map((t) => String(t.ts)).sort()[0] ?? null;
  // From the start of that day: the first allocation's ETH and OKB legs filled before its first stock token.
  const fills = since ? all.filter((t) => str(t.txHash) && String(t.ts).slice(0, 10) >= since.slice(0, 10)).length : 0;
  const holds = since
    ? (calendar?.past ?? []).filter((e: Raw) => e.kind === "scheduled" && e.scope === "broad" && String(e.date) >= since.slice(0, 10)).length
    : 0;
  const hypotheses = (sentinel?.record ?? []).filter((r: Raw) => str(r.outcome)).length;
  const items = [
    { label: "On-chain fills, each verified", count: fills, xpEach: RECORD_XP.fill },
    { label: "Scheduled events waited through", count: holds, xpEach: RECORD_XP.hold },
    { label: "Macro views published and resolved", count: hypotheses, xpEach: RECORD_XP.hypothesis },
  ];
  return { since, items, xp: items.reduce((sum, i) => sum + i.count * i.xpEach, 0) };
}

function buildRisk(tei: Raw | null, swaps: Raw[]): LiveRisk | null {
  const packet: Raw | undefined = tei?.verdict?.packet;
  if (!packet) return null;
  const equity = num(packet.equity);
  const buy = num(packet.buy_usd);
  const ceiling = /ceiling (\d+(?:\.\d+)?)%/.exec(strings(tei?.verdict?.rationale).join(" "));
  const impacts = swaps.map((s) => num(s.impact)).filter((n): n is number => n != null);
  return {
    executorMode: str(tei?.mode),
    stagedBuyUsd: buy,
    stagedBuyPct: buy != null && equity ? Math.round((buy / equity) * 1000) / 10 : null,
    deployCeilingPct: ceiling ? Number(ceiling[1]) : null,
    largestLegPct: num(packet.concentration_pct),
    thinDeployPct: num(packet.thin_deploy_pct),
    worstImpactPct: impacts.length ? Math.max(...impacts) : null,
    legsPassing: swaps.filter((s) => s.gate === "pass").length,
    legsTotal: swaps.length,
    flags: strings(tei?.verdict?.flags),
  };
}

// A dated log of what the engine and its operator actually did, newest first.
// Fills carry no transaction link here: the link would identify the wallet.
function buildActivity(tei: Raw | null, calendar: Raw | null, sentinel: Raw | null, trades: Raw | null, since: string | null): LiveActivity[] {
  const out: LiveActivity[] = [];
  const add = (iso: unknown, e: Omit<LiveActivity, "id" | "timestamp">) => {
    const timestamp = typeof iso === "string" ? Date.parse(iso) : NaN;
    if (Number.isFinite(timestamp)) out.push({ id: `${e.category}-${timestamp}-${out.length}`, timestamp, ...e });
  };
  const day = since?.slice(0, 10) ?? null;

  if (tei?.verdict?.decision) {
    add(tei.asof, { icon: "🚦", category: "RISK", message: `Gate says ${tei.verdict.decision}. ${strings(tei.verdict.rationale)[0] ?? ""}`.trim() });
  }
  if (tei?.deliberation?.stance) {
    add(tei.deliberation.asof, {
      icon: "⚖️",
      category: "MOOD",
      message: `Council deliberated: ${tei.deliberation.stance} (${tei.deliberation.confidence ?? "unrated"} confidence).`,
    });
  }
  for (const e of (calendar?.upcoming ?? []) as Raw[]) {
    if (e.hold?.active) add(e.hold.from, { icon: "⏳", category: "RISK", message: `Calendar hold began for ${e.event}: no new buying until it has printed and settled.` });
  }
  for (const e of (calendar?.past ?? []) as Raw[]) {
    if (!day || e.kind !== "scheduled" || e.scope !== "broad" || String(e.date) < day) continue;
    const figures = num(e.actual) != null ? ` Actual ${e.actual}${e.unit ?? ""}${num(e.forecast) != null ? ` vs ${e.forecast}${e.unit ?? ""} forecast` : ""}.` : "";
    add(e.hold?.to ?? `${e.date}T${e.timeUtc ?? "00:00"}:00Z`, { icon: "📅", category: "LEVEL", message: `Waited through ${e.event}.${figures}`, xpChange: RECORD_XP.hold });
  }
  if (sentinel?.hypothesis?.published) {
    add(sentinel.hypothesis.published, { icon: "🔭", category: "MEMORY", message: `Sentinel published a ${sentinel.hypothesis.posture ?? "macro"} view, with a stated kill condition.` });
  }
  for (const r of (Array.isArray(sentinel?.record) ? sentinel.record : []) as Raw[]) {
    if (str(r.outcome)) add(r.expires, { icon: "✅", category: "MEMORY", message: `Macro view "${r.posture}" resolved: ${r.outcome}.`, xpChange: RECORD_XP.hypothesis });
  }
  for (const t of (Array.isArray(trades?.trades) ? trades.trades : []) as Raw[]) {
    if (!day || !str(t.txHash) || String(t.ts).slice(0, 10) < day) continue;
    const who = t.source === "manual" ? "authorized by a human" : `by ${t.agentLabel ?? "an agent"}`;
    add(t.ts, {
      icon: t.side === "SELL" ? "📤" : "🐾",
      category: "TRADE",
      message: `${t.side === "SELL" ? "Sold" : "Bought"} ${t.symbol} for $${Number(t.usdt).toFixed(0)}, ${who}. Verified on X Layer.`,
      xpChange: RECORD_XP.fill,
    });
  }
  return out.sort((a, b) => b.timestamp - a.timestamp).slice(0, 40);
}

export async function GET() {
  const failures: string[] = [];
  const [tei, calendar, sentinel, book, trades] = await Promise.all([
    feed("tei", failures),
    feed("calendar", failures),
    feed("sentinel", failures),
    feed("book", failures),
    feed("trades", failures),
  ]);

  const asof = str(tei?.asof);
  const ageMinutes = asof ? Math.max(0, Math.round((Date.now() - Date.parse(asof)) / 60000)) : null;
  const basket: Raw = tei?.pegHealth?.basket ?? {};
  const legs: Raw = tei?.pegHealth?.legs ?? {};
  const swaps: Raw[] = Array.isArray(tei?.swaps) ? tei.swaps : [];

  const tokens: LiveToken[] = TOKEN_UNIVERSE.map((symbol) => {
    const oracle: Raw = tei?.oracle?.[symbol] ?? {};
    const leg: Raw = legs[symbol] ?? {};
    const phase: Raw = tei?.nav?.phases?.[symbol] ?? {};
    const swap = swaps.find((s) => s.symbol === symbol);
    const planUsd = swap && num(swap.usd) != null ? (swap.side === "SELL" ? -swap.usd : swap.usd) : null;
    return {
      symbol,
      tradable: typeof oracle.tradable === "boolean" ? oracle.tradable : null,
      rating: str(oracle.rating),
      score: num(oracle.score),
      liquidityUsd: num(leg.liquidityUsd),
      premiumPct: num(leg.premiumPct),
      realPrice: num(leg.realPrice),
      wrapperPrice: num(leg.wrapperPrice),
      phase: str(phase.phase),
      bearing: str(phase.bearing),
      planUsd,
    };
  });

  // The index names ETH; the plan and the book call it xETH.
  const satellite: LiveToken[] = (Array.isArray(tei?.constituents) ? (tei.constituents as Raw[]) : [])
    .filter((c) => c.sleeve === "crypto")
    .map((c) => {
      const symbol = String(c.symbol);
      const oracle: Raw = tei?.oracle?.[symbol] ?? {};
      const phase: Raw = tei?.nav?.phases?.[symbol] ?? {};
      const held: Raw | undefined = (book?.books?.[0]?.holdings ?? []).find((h: Raw) => (TARGET_ALIAS[String(h.symbol)] ?? String(h.symbol)) === symbol);
      const swap = swaps.find((s) => (TARGET_ALIAS[String(s.symbol)] ?? String(s.symbol)) === symbol);
      return {
        symbol,
        tradable: typeof oracle.tradable === "boolean" ? oracle.tradable : null,
        rating: str(oracle.rating),
        score: num(oracle.score),
        liquidityUsd: null,
        premiumPct: null,
        realPrice: null,
        wrapperPrice: num(held?.price),
        phase: str(phase.phase),
        bearing: str(phase.bearing),
        planUsd: swap && num(swap.usd) != null ? (swap.side === "SELL" ? -swap.usd : swap.usd) : null,
      };
    });

  const record = buildRecord(trades, calendar, sentinel);

  const state: EngineState = {
    ok: !!tei,
    fetchedAt: new Date().toISOString(),
    asof,
    ageMinutes,
    stale: ageMinutes == null || ageMinutes > STALE_AFTER_MIN || basket.wrapperStale === true,
    equity: num(tei?.equity),
    session: {
      state: str(basket.session),
      anchored: typeof basket.anchored === "boolean" ? basket.anchored : null,
      hoursToNextOpen: num(basket.hoursToNextOpen),
    },
    gate: {
      decision: str(tei?.verdict?.decision),
      rationale: Array.isArray(tei?.verdict?.rationale) ? tei.verdict.rationale.map(String).slice(0, 4) : [],
      council: tei?.deliberation
        ? {
            stance: str(tei.deliberation.stance),
            confidence: str(tei.deliberation.confidence),
            asof: str(tei.deliberation.asof),
            bull: str(tei.deliberation.bull),
            bear: str(tei.deliberation.bear),
            risk: str(tei.deliberation.risk),
            synthesis: str(tei.deliberation.synthesis),
            keyRisks: strings(tei.deliberation.key_risks),
          }
        : null,
    },
    calendar: {
      // No calendar reading means we can't show the board is clear: hold.
      holdingNow: calendar ? !!calendar.holdingNow : true,
      holdingFor: calendar
        ? (calendar.holdingFor ?? []).map((h: Raw) => ({ date: String(h.date), event: String(h.event) }))
        : [{ date: "", event: "calendar unavailable" }],
      upcoming: (calendar?.upcoming ?? []).map(calendarEvent),
      rule: str(calendar?.rule?.note),
    },
    sentinel: sentinel?.hypothesis
      ? {
          ...hypothesis(sentinel.hypothesis),
          published: str(sentinel.hypothesis.published),
          expires: str(sentinel.hypothesis.expires),
          expired: str(sentinel.hypothesis.expires) != null && Date.parse(sentinel.hypothesis.expires) < Date.now(),
          hash: str(sentinel.hypothesisHash),
          candidate: sentinel.candidate
            ? {
                ...hypothesis(sentinel.candidate),
                asof: str(sentinel.candidate.asof),
                hash: str(sentinel.candidate.hash),
                falsifierTripped: typeof sentinel.candidate.publishedFalsifier?.tripped === "boolean" ? sentinel.candidate.publishedFalsifier.tripped : null,
                assessment: str(sentinel.candidate.publishedFalsifier?.assessment),
              }
            : null,
          record: (Array.isArray(sentinel.record) ? (sentinel.record as Raw[]) : []).map((r) => ({
            posture: str(r.posture),
            published: str(r.published),
            expires: str(r.expires),
            outcome: str(r.outcome),
          })),
        }
      : null,
    tokens,
    satellite,
    book: buildBook(book, tei, swaps),
    backtest: buildBacktest(tei),
    record,
    entry: Array.isArray(tei?.entry?.legs)
      ? { decision: str(tei.entry.decision), released: (tei.entry.legs as Raw[]).filter((l) => l.release === true).length, total: tei.entry.legs.length }
      : null,
    risk: buildRisk(tei, swaps),
    activity: buildActivity(tei, calendar, sentinel, trades, record?.since ?? null),
    failures,
  };

  return NextResponse.json(state, { status: tei ? 200 : 502 });
}
