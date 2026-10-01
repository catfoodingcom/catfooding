import { NextResponse } from "next/server";
import { TOKEN_UNIVERSE } from "@/lib/types";
import { STALE_AFTER_MIN, type EngineState, type LiveBacktest, type LiveBook, type LiveCalendarEvent, type LiveToken } from "@/lib/live/engine";

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
        return {
          symbol,
          usd: h.usd,
          balance: num(h.balance),
          price: num(h.price),
          kind: str(h.kind) ?? "position",
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

export async function GET() {
  const failures: string[] = [];
  const [tei, calendar, sentinel, book] = await Promise.all([
    feed("tei", failures),
    feed("calendar", failures),
    feed("sentinel", failures),
    feed("book", failures),
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
      council: tei?.deliberation ? { stance: str(tei.deliberation.stance), confidence: str(tei.deliberation.confidence) } : null,
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
      ? { posture: str(sentinel.hypothesis.posture), confidence: str(sentinel.hypothesis.confidence), expires: str(sentinel.hypothesis.expires) }
      : null,
    tokens,
    book: buildBook(book, tei, swaps),
    backtest: buildBacktest(tei),
    failures,
  };

  return NextResponse.json(state, { status: tei ? 200 : 502 });
}
