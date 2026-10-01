"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { LiveBacktest, LiveBook } from "@/lib/live/engine";

const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** The four headline numbers of the real book. Used in the room sidebar and on the Book page. */
export function BookSummary({ book }: { book: LiveBook }) {
  const stocks = book.holdings.filter((h) => h.sleeve === "equity").length;
  const crypto = book.holdings.filter((h) => h.sleeve === "crypto").length;
  return (
    <div className="grid grid-cols-2 gap-3 font-mono">
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Book value</p>
        <p className="text-lg font-bold text-cream">{usd(book.equityUsd)}</p>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Reserve</p>
        <p className="text-lg font-bold text-acid">
          {usd(book.reserveUsd)} <span className="text-xs">({book.reservePct.toFixed(1)}%)</span>
        </p>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">At risk</p>
        <p className="text-sm text-cream">{usd(book.atRiskUsd)}</p>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Holdings</p>
        <p className="text-sm text-cream">
          {stocks + crypto} <span className="text-[10px] text-muted-foreground">({stocks} stocks + {crypto} crypto)</span>
        </p>
      </div>
    </div>
  );
}

const SLEEVES = [
  { id: "equity", label: "Tokenized stocks", note: "the index core" },
  { id: "crypto", label: "Crypto satellite", note: "ETH and OKB; OKB also pays gas" },
  { id: "reserve", label: "Reserve", note: "undeployed cash, not a holding" },
] as const;

/** The book by sleeve: stocks, the crypto satellite, then the reserve. Each
 * holding is shown against its Steward target weight. */
export function BookHoldings({ book }: { book: LiveBook }) {
  const scale = Math.max(...book.holdings.map((h) => Math.max(h.pct, h.targetPct ?? 0)), 1);
  return (
    <div className="space-y-4">
      {SLEEVES.map((sleeve) => {
        const rows = book.holdings.filter((h) => h.sleeve === sleeve.id);
        if (rows.length === 0) return null;
        const usdTotal = rows.reduce((sum, h) => sum + h.usd, 0);
        const pctTotal = rows.reduce((sum, h) => sum + h.pct, 0);
        const targetTotal = rows.reduce((sum, h) => sum + (h.targetPct ?? 0), 0);
        return (
          <div key={sleeve.id} className="space-y-2">
            <div className="flex items-baseline justify-between gap-2 border-b border-border pb-1 font-mono text-[10px] uppercase tracking-wider">
              <span className="text-acid">
                {sleeve.label}
                {sleeve.id !== "reserve" && ` · ${rows.length}`} <span className="text-muted-foreground normal-case tracking-normal">{sleeve.note}</span>
              </span>
              <span className="text-muted-foreground normal-case tracking-normal shrink-0">
                <span className="text-cream">{usd(usdTotal)}</span> · {pctTotal.toFixed(1)}%
                {targetTotal > 0 && ` of ${targetTotal.toFixed(1)}% target`}
              </span>
            </div>
            {rows.map((h) => (
              <div key={h.symbol} className="font-mono text-[11px]">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-display font-bold text-cream">{h.symbol}</span>
                  <span className="text-muted-foreground">
                    <span className="text-cream">{usd(h.usd)}</span> · {h.pct.toFixed(1)}%
                    {h.targetPct != null && ` of ${h.targetPct}% target`}
                  </span>
                </div>
                <div className="relative mt-1 h-1.5 rounded-full bg-ink">
                  <div
                    className={`absolute inset-y-0 left-0 rounded-full ${sleeve.id === "reserve" ? "bg-[#ffd23f]" : "bg-acid"}`}
                    style={{ width: `${(h.pct / scale) * 100}%` }}
                  />
                  {h.targetPct != null && (
                    <div className="absolute -inset-y-0.5 w-0.5 bg-cream" style={{ left: `${(h.targetPct / scale) * 100}%` }} title={`target ${h.targetPct}%`} />
                  )}
                </div>
              </div>
            ))}
          </div>
        );
      })}
      <p className="font-mono text-[9px] text-muted-foreground">Bar = share of the book now. White mark = Steward target.</p>
    </div>
  );
}

export function BookPlan({ book, gate }: { book: LiveBook; gate: string | null }) {
  if (book.plan.length === 0) return <p className="font-mono text-xs text-muted-foreground">No orders staged. The book is at target.</p>;
  return (
    <div className="space-y-1.5 font-mono text-[11px]">
      {book.plan.map((p) => (
        <div key={`${p.side}-${p.symbol}`} className="flex justify-between">
          <span className="text-cream">
            {p.side} {p.symbol}
          </span>
          <span className="text-muted-foreground">{usd(p.usd)}</span>
        </div>
      ))}
      <p className="text-[9px] text-[#ffd23f] pt-1">
        Staged, not placed. Gate: {gate ?? "unknown"}. Nothing executes without an approve verdict and a human go-ahead.
      </p>
    </div>
  );
}

/** Index as-if performance. Deliberately labelled: this is NOT the book's own return. */
export function BacktestChart({ backtest }: { backtest: LiveBacktest }) {
  const data = backtest.index.map((v, i) => ({ day: i + 1, index: v, equal: backtest.equalWeight[i], eth: backtest.ethHold[i] }));
  const r = backtest.returns;
  const ret = (n: number | null) => (n == null ? "n/a" : `${n > 0 ? "+" : ""}${n.toFixed(1)}%`);
  return (
    <div>
      <p className="font-mono text-[10px] text-[#ffd23f] leading-relaxed mb-2">
        Index backtest, not the book&apos;s actual returns: today&apos;s target weights applied back over {backtest.from} to {backtest.to} (start = 100). The
        real book only went live on 29 Sep 2026.
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <XAxis dataKey="day" tick={{ fontSize: 9, fill: "#9a9887" }} axisLine={{ stroke: "#34362653" }} tickLine={false} minTickGap={40} />
          <YAxis tick={{ fontSize: 9, fill: "#9a9887" }} axisLine={false} tickLine={false} domain={["auto", "auto"]} width={56} />
          <Tooltip
            contentStyle={{ background: "#16180f", border: "2px solid #f3efdf", borderRadius: 8, fontFamily: "var(--font-mono)", fontSize: 11 }}
            labelStyle={{ color: "#9a9887" }}
            labelFormatter={(d) => `day ${d}`}
          />
          <Line type="monotone" dataKey="index" name="Steward index" stroke="#baff29" strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line type="monotone" dataKey="equal" name="Equal weight" stroke="#5fd0ff" strokeWidth={1.5} dot={false} isAnimationActive={false} />
          <Line type="monotone" dataKey="eth" name="Hold ETH" stroke="#ff4fa6" strokeWidth={1.5} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] mt-2">
        <span className="text-acid">━ Steward index {ret(r.index)}</span>
        <span className="text-[#5fd0ff]">━ Equal weight {ret(r.equalWeight)}</span>
        <span className="text-pink">━ Hold ETH {ret(r.ethHold)}</span>
      </div>
    </div>
  );
}
