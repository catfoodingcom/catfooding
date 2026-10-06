"use client";

import { referenceLabel, type EngineState, type LiveToken, type LiveVerdict, type TokenVerdict } from "@/lib/live/engine";
import { MacroCalendar } from "./MacroCalendar";
import { GateReasoning, MacroReasoning } from "./Reasoning";
import { TechnicalReasoning } from "./Technical";

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
  satelliteVerdicts: Record<string, TokenVerdict>;
  error: boolean;
}

/** Live mode: the real engine's read on each token, and why the cat will or
 * won't eat it. Each row opens to show every check. */
export function LivePanel({ engine, verdicts, satelliteVerdicts, error }: LivePanelProps) {
  if (!engine) {
    return (
      <div className="chunky-border bg-ink-raised rounded-2xl p-4 font-mono text-xs text-muted-foreground">
        {error ? "Can't reach the CoAgentic engine. The cat won't guess. Switch to Demo to keep playing." : "Reading the CoAgentic engine…"}
      </div>
    );
  }

  const { gate, session, calendar, sentinel, technical } = engine;
  return (
    <div className="chunky-border-acid bg-ink-raised rounded-2xl p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-mono text-xs uppercase tracking-wider text-acid">Live engine · CoAgentic Steward</h2>
        <MacroCalendar calendar={calendar} asOf={engine.fetchedAt} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 font-mono text-[10px]">
        <GateReasoning gate={gate} tile={<Fact label="Gate · our book" value={gate.decision === "hold" ? "on target" : (gate.decision ?? "unknown")} sub={gate.council?.stance ? `Council: ${gate.council.stance}` : ""} more />} />
        <Fact label="Tokens" value="trading 24/7" sub="X Layer, always open" />
        <Fact
          label="Fair-price check"
          value={session.anchored ? "live" : "waiting"}
          sub={session.anchored ? "real shares trading" : session.hoursToNextOpen != null ? `real shares live in ${session.hoursToNextOpen.toFixed(1)}h` : `real shares ${referenceLabel(session.state)}`}
        />
        <Fact label="Calendar" value={calendar.holdingNow ? "hold" : "clear"} sub={calendar.holdingFor.map((h) => h.event).join(", ")} />
        <MacroReasoning
          sentinel={sentinel}
          tile={<Fact label="Macro view" value={sentinel?.posture ?? "unknown"} sub={sentinel?.confidence ? `${sentinel.confidence} confidence` : ""} more={!!sentinel} />}
        />
        <TechnicalReasoning
          technical={technical}
          tile={
            <Fact
              label="Technical view"
              value={technical[0] ? `${technical[0].symbol} ${technical[0].signal ?? "?"}` : "unknown"}
              sub={technical[1] ? `${technical[1].symbol} ${technical[1].signal ?? "?"}` : ""}
              more={technical.length > 0}
            />
          }
        />
      </div>

      {gate.rationale[0] && <p className="font-mono text-[10px] text-muted-foreground leading-relaxed">Gate: {gate.rationale[0]}</p>}
      <p className="font-mono text-[10px] text-muted-foreground leading-relaxed">
        The gate above is about <span className="text-cream">our book</span>. The verdicts below are about <span className="text-cream">each token</span>, for
        anyone who could buy it
        {engine.entry && (
          <>
            : right now {engine.entry.released} of {engine.entry.total} index legs are open to a new entry
          </>
        )}
        .
      </p>

      <div className="space-y-1.5 border-t border-border pt-3">
        <p className="font-mono text-[10px] text-muted-foreground leading-relaxed">
          <span className="uppercase tracking-wider text-acid">Tokenized stocks</span> · the index core on X Layer: each must be tradable and fairly priced
          against its real share before the calendar and gate are even asked.
        </p>
        <TokenGroups tokens={engine.tokens} verdicts={verdicts} />
      </div>

      {engine.satellite.length > 0 && (
        <div className="space-y-1.5 border-t border-border pt-3">
          <p className="font-mono text-[10px] text-muted-foreground leading-relaxed">
            <span className="uppercase tracking-wider text-acid">Crypto satellite</span> · judged by a shorter rule: no real share behind these, so no
            fair-price check, and no Oracle depth score.
          </p>
          <TokenGroups tokens={engine.satellite} verdicts={satelliteVerdicts} />
        </div>
      )}

      <p className="font-mono text-[9px] text-muted-foreground leading-relaxed">
        Engine read {engine.ageMinutes ?? "?"} min ago{engine.stale ? " (stale)" : ""}
        {engine.equity != null && ` · Steward book $${engine.equity.toFixed(2)}`}
        {engine.failures.length > 0 && ` · unavailable: ${engine.failures.join(", ")}`}. Read-only: the cat shows the engine&apos;s verdict and places no trades. Not
        investment advice.
      </p>
    </div>
  );
}

function TokenGroups({ tokens, verdicts }: { tokens: LiveToken[]; verdicts: Record<string, TokenVerdict> }) {
  return (
    <div className="space-y-1.5">
      {groupTokens(tokens, verdicts).map((g) =>
        g.tokens.length === 1 ? (
          <TokenRow key={g.key} token={g.tokens[0]} verdict={verdicts[g.tokens[0].symbol]} showReason />
        ) : (
          <details key={g.key} className="group/row rounded-lg border border-border bg-ink">
            <summary className="cursor-pointer list-none p-2.5 space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-display text-sm font-bold text-cream shrink-0">
                  {g.tokens.length === tokens.length ? `All ${g.tokens.length}` : `${g.tokens.length} of ${tokens.length}`}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground min-w-0">{g.tokens.map((t) => t.symbol).join(" · ")}</span>
                <RowEnd verdict={g.verdict} hint="tap for each" />
              </div>
              <p className="font-mono text-[11px] text-cream/80 leading-snug">{g.reason}</p>
            </summary>
            <div className="border-t border-border p-2 space-y-1.5">
              {g.tokens.map((t) => (
                <TokenRow key={t.symbol} token={t} verdict={verdicts[t.symbol]} showReason={false} />
              ))}
            </div>
          </details>
        ),
      )}
    </div>
  );
}

interface TokenGroup {
  key: string;
  verdict: LiveVerdict;
  reason: string;
  tokens: LiveToken[];
}

const VERDICT_ORDER: LiveVerdict[] = ["HUNT", "REFUSE", "WAIT", "WATCH"];

/** Tokens with the same verdict for the same reason fold into one row. A
 * token with its own problem (thin, mispriced, missing a reading) never
 * folds. So: all alike = one "Index" row; a few differ = they stand alone
 * above the folded rest. */
function groupTokens(tokens: LiveToken[], verdicts: Record<string, TokenVerdict>): TokenGroup[] {
  const groups = new Map<string, TokenGroup>();
  for (const t of tokens) {
    const v = verdicts[t.symbol];
    if (!v) continue;
    const reason = v.shared ?? v.reason;
    const key = v.solo ? `solo|${t.symbol}` : `${v.verdict}|${reason}`;
    const g = groups.get(key) ?? { key, verdict: v.verdict, reason, tokens: [] };
    g.tokens.push(t);
    groups.set(key, g);
  }
  return [...groups.values()].sort(
    (a, b) => VERDICT_ORDER.indexOf(a.verdict) - VERDICT_ORDER.indexOf(b.verdict) || a.tokens.length - b.tokens.length,
  );
}

function Chip({ verdict }: { verdict: LiveVerdict }) {
  const style = VERDICT_STYLE[verdict];
  return (
    <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${style.chip}`}>
      {style.icon} {verdict}
    </span>
  );
}

/** Right-hand end of every row: the verdict badge, then the hint. Both are
 * fixed width, so badges line up in one column whatever the row's label is. */
function RowEnd({ verdict, hint }: { verdict: LiveVerdict; hint: string }) {
  return (
    <span className="ml-auto flex items-center gap-2 shrink-0 pl-2">
      <span className="inline-block w-[84px] text-right">
        <Chip verdict={verdict} />
      </span>
      <span className="hidden sm:inline-block w-[88px] font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{hint}</span>
      <span className="font-mono text-[10px] text-muted-foreground transition-transform group-open/row:rotate-90">▸</span>
    </span>
  );
}

/** One token: its verdict, and on open, every check. Inside a group the shared
 * reason is already stated, so the row shows this token's own numbers instead. */
function TokenRow({ token: t, verdict: v, showReason }: { token: LiveToken; verdict: TokenVerdict; showReason: boolean }) {
  const own = [t.premiumPct != null && `${t.premiumPct > 0 ? "+" : ""}${t.premiumPct.toFixed(2)}% vs real share`, t.phase && `${t.phase} · ${t.bearing ?? "?"}`]
    .filter(Boolean)
    .join(" · ");
  return (
    <details className="group/row rounded-lg border border-border bg-ink">
      <summary className="cursor-pointer list-none p-2.5 space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-display text-sm font-bold text-cream shrink-0">{t.symbol}</span>
          {!showReason && <span className="font-mono text-[10px] text-muted-foreground min-w-0">{own}</span>}
          <RowEnd verdict={v.verdict} hint="tap for checks" />
        </div>
        {showReason && <p className="font-mono text-[11px] text-cream/80 leading-snug">{v.reason}</p>}
      </summary>
      <div className="border-t border-border p-2.5 space-y-1 font-mono text-[10px]">
        {v.checks.map((c) => (
          <div key={c.label} className="flex items-baseline gap-2">
            <span className={`w-3 ${markColor(c.ok)}`}>{mark(c.ok)}</span>
            <span className="text-cream/90 w-32 shrink-0">{c.label}</span>
            <span className="text-muted-foreground">{c.detail}</span>
          </div>
        ))}
        {t.wrapperPrice != null && (
          <p className="text-muted-foreground pt-1">
            {t.realPrice != null ? `Real share $${t.realPrice.toFixed(2)} · token $${t.wrapperPrice.toFixed(2)}` : `Price $${t.wrapperPrice.toFixed(2)}`}
            {t.planUsd != null && ` · Steward plan: ${t.planUsd > 0 ? "buy" : "sell"} $${Math.abs(t.planUsd).toFixed(2)}`}
          </p>
        )}
      </div>
    </details>
  );
}

function Fact({ label, value, sub, more = false }: { label: string; value: string; sub: string; more?: boolean }) {
  return (
    <div className={`rounded-lg border bg-ink p-2 h-full ${more ? "border-acid/40" : "border-border"}`}>
      <div className="flex justify-between uppercase tracking-wider text-muted-foreground text-[9px]">
        <span>{label}</span>
        {more && <span className="text-acid">why ▸</span>}
      </div>
      <div className="text-cream text-xs uppercase">{value}</div>
      {sub && <div className="text-muted-foreground text-[9px] truncate">{sub}</div>}
    </div>
  );
}
