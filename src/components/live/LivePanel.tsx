"use client";

import { referenceLabel, type EngineState, type LiveVerdict, type TokenVerdict } from "@/lib/live/engine";
import { MacroCalendar } from "./MacroCalendar";

const VERDICT_STYLE: Record<LiveVerdict, { icon: string; chip: string }> = {
  REFUSE: { icon: "🙅", chip: "border-[#ff5d5d]/60 bg-[#ff5d5d]/10 text-[#ff9d9d]" },
  WAIT: { icon: "⏳", chip: "border-[#ffd23f]/60 bg-[#ffd23f]/10 text-[#ffd23f]" },
  HUNT: { icon: "🐾", chip: "border-acid/60 bg-acid/10 text-acid" },
  WATCH: { icon: "👀", chip: "border-border bg-ink text-muted-foreground" },
};

const mark = (ok: boolean | null) => (ok == null ? "·" : ok ? "✓" : "✕");
const markColor = (ok: boolean | null) => (ok == null ? "text-muted-foreground" : ok ? "text-acid" : "text-[#ff9d9d]");

interface LivePanelProps {
  engine: EngineState | null;
  verdicts: Record<string, TokenVerdict>;
  error: boolean;
}

/** Live mode: the real engine's read on each token, and why the cat will or
 * won't eat it. Each row opens to show every check. */
export function LivePanel({ engine, verdicts, error }: LivePanelProps) {
  if (!engine) {
    return (
      <div className="chunky-border bg-ink-raised rounded-2xl p-4 font-mono text-xs text-muted-foreground">
        {error ? "Can't reach the CoAgentic engine. The cat won't guess. Switch to Demo to keep playing." : "Reading the CoAgentic engine…"}
      </div>
    );
  }

  const { gate, session, calendar, sentinel } = engine;
  return (
    <div className="chunky-border-acid bg-ink-raised rounded-2xl p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-mono text-xs uppercase tracking-wider text-acid">Live engine · CoAgentic Steward</h2>
        <MacroCalendar calendar={calendar} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono text-[10px]">
        <Fact label="Gate" value={gate.decision ?? "unknown"} sub={gate.council?.stance ? `Council: ${gate.council.stance}` : ""} />
        <Fact label="Tokens" value="trading 24/7" sub="X Layer, always open" />
        <Fact
          label="Fair-price check"
          value={session.anchored ? "live" : "waiting"}
          sub={session.anchored ? "real shares trading" : session.hoursToNextOpen != null ? `real shares live in ${session.hoursToNextOpen.toFixed(1)}h` : `real shares ${referenceLabel(session.state)}`}
        />
        <Fact label="Calendar" value={calendar.holdingNow ? "hold" : "clear"} sub={calendar.holdingFor.map((h) => h.event).join(", ")} />
        <Fact label="Macro view" value={sentinel?.posture ?? "unknown"} sub={sentinel?.confidence ? `${sentinel.confidence} confidence` : ""} />
      </div>

      {gate.rationale[0] && <p className="font-mono text-[10px] text-muted-foreground leading-relaxed">Gate: {gate.rationale[0]}</p>}

      <div className="space-y-1.5">
        {engine.tokens.map((t) => {
          const v = verdicts[t.symbol];
          if (!v) return null;
          const style = VERDICT_STYLE[v.verdict];
          return (
            <details key={t.symbol} className="rounded-lg border border-border bg-ink group">
              <summary className="cursor-pointer list-none p-2.5 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                <span className="flex items-center gap-2 shrink-0">
                  <span className="font-display text-sm font-bold text-cream w-14">{t.symbol}</span>
                  <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${style.chip}`}>
                    {style.icon} {v.verdict}
                  </span>
                </span>
                <span className="font-mono text-[11px] text-cream/80 leading-snug">{v.reason}</span>
              </summary>
              <div className="border-t border-border p-2.5 space-y-1 font-mono text-[10px]">
                {v.checks.map((c) => (
                  <div key={c.label} className="flex items-baseline gap-2">
                    <span className={`w-3 ${markColor(c.ok)}`}>{mark(c.ok)}</span>
                    <span className="text-cream/90 w-32 shrink-0">{c.label}</span>
                    <span className="text-muted-foreground">{c.detail}</span>
                  </div>
                ))}
                {t.realPrice != null && t.wrapperPrice != null && (
                  <p className="text-muted-foreground pt-1">
                    Real share ${t.realPrice.toFixed(2)} · token ${t.wrapperPrice.toFixed(2)}
                    {t.planUsd != null && ` · Steward plan: ${t.planUsd > 0 ? "buy" : "sell"} $${Math.abs(t.planUsd).toFixed(2)}`}
                  </p>
                )}
              </div>
            </details>
          );
        })}
      </div>

      <p className="font-mono text-[9px] text-muted-foreground leading-relaxed">
        Engine read {engine.ageMinutes ?? "?"} min ago{engine.stale ? " (stale)" : ""}
        {engine.equity != null && ` · Steward book $${engine.equity.toFixed(2)}`}
        {engine.failures.length > 0 && ` · unavailable: ${engine.failures.join(", ")}`}. Read-only: the cat shows the engine&apos;s verdict and places no trades. Not
        investment advice.
      </p>
    </div>
  );
}

function Fact({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg border border-border bg-ink p-2">
      <div className="uppercase tracking-wider text-muted-foreground text-[9px]">{label}</div>
      <div className="text-cream text-xs uppercase">{value}</div>
      {sub && <div className="text-muted-foreground text-[9px] truncate">{sub}</div>}
    </div>
  );
}
