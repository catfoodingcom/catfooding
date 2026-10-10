"use client";

import { CHAIN_LABEL, MAX_PREMIUM_PCT, referenceLabel, type EngineState, type LiveChain, type LiveToken, type LiveVerdict, type TokenVerdict } from "@/lib/live/engine";
import { EnginePulse } from "./EnginePulse";
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
  /** The engine as seen from the chain being viewed: its tokens and freshness. */
  view: EngineState | null;
  chain: LiveChain;
  onChain: (chain: LiveChain) => void;
  verdicts: Record<string, TokenVerdict>;
  satelliteVerdicts: Record<string, TokenVerdict>;
  error: boolean;
}

/** Live mode: the real engine's read on each token, and why the cat will or
 * won't eat it. Each row opens to show every check. */
export function LivePanel({ engine, view, chain, onChain, verdicts, satelliteVerdicts, error }: LivePanelProps) {
  if (!engine || !view) {
    return (
      <div className="chunky-border bg-ink-raised rounded-2xl p-4 font-mono text-xs text-muted-foreground">
        {error ? "Can't reach the CoAgentic engine. The cat won't guess. Switch to Demo to keep playing." : "Reading the CoAgentic engine…"}
      </div>
    );
  }

  const { gate, session, calendar, sentinel, technical } = engine;
  // legs a new buyer could enter now on the chain being viewed: a verdict of Hunt or Watch means every check passed
  const all = [...Object.values(verdicts), ...Object.values(satelliteVerdicts)];
  const open = all.filter((v) => v.verdict === "HUNT" || v.verdict === "WATCH").length;
  const total = all.length;
  return (
    <div className="chunky-border-acid bg-ink-raised rounded-2xl p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-mono text-xs uppercase tracking-wider text-acid">Live engine · CoAgentic Steward</h2>
        <MacroCalendar calendar={calendar} asOf={engine.fetchedAt} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 font-mono text-[10px]">
        <GateReasoning gate={gate} tile={<Fact label="Gate · our book" value={gate.decision === "hold" ? "on target" : (gate.decision ?? "unknown")} sub={gate.council?.stance ? `Council: ${gate.council.stance}` : ""} more />} />
        <Fact label="Tokens" value="trading 24/7" sub={`${CHAIN_LABEL[chain]}, always open`} />
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

      <div className="grid">
        <EnginePulse pulse={engine.pulse} asOf={engine.fetchedAt} />
      </div>

      {gate.rationale[0] && <p className="font-mono text-[10px] text-muted-foreground leading-relaxed">Gate: {gate.rationale[0]}</p>}
      <p className="font-mono text-[10px] text-muted-foreground leading-relaxed">
        The gate above is about <span className="text-cream">our book</span>. The verdicts below are about <span className="text-cream">each token</span>, for
        anyone who could buy it
        {chain === "xlayer" && engine.entry && (
          <>
            : right now {engine.entry.released} of {engine.entry.total} index legs are open to a new entry
          </>
        )}
        {chain === "solana" && (
          <>
            : on Solana right now {open} of {total} legs are open to a new entry
          </>
        )}
        .
      </p>

      <div className="space-y-1.5 border-t border-border pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-acid">Tokenized stocks</span>
          <div role="group" aria-label="Chain" className="flex rounded-full border border-border p-0.5 font-mono text-[10px] uppercase tracking-wider">
            {(["xlayer", "solana"] as const).map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={chain === c}
                disabled={c === "solana" && !engine.solana}
                title={c === "solana" && !engine.solana ? "No Solana reading right now" : undefined}
                onClick={() => onChain(c)}
                className={`rounded-full px-2.5 py-1 transition-colors disabled:opacity-40 ${chain === c ? "bg-acid text-ink" : "text-muted-foreground hover:text-cream"}`}
              >
                {CHAIN_LABEL[c]}
              </button>
            ))}
          </div>
        </div>
        <p className="font-mono text-[10px] text-muted-foreground leading-relaxed">
          {chain === "xlayer" ? (
            <>The index core on X Layer: each must be tradable and fairly priced against its real share before the calendar and gate are even asked.</>
          ) : (
            <>
              The same six tokens from the same issuer ({engine.solana?.issuer}), read on <span className="text-cream">Solana</span>. Same rules, different
              chain. The Solana book is real but only just started: it holds the crypto satellite so far, and no stock token yet.
            </>
          )}
        </p>
        <TokenGroups tokens={view.tokens} verdicts={verdicts} />
      </div>

      {view.satellite.length > 0 && (
        <div className="space-y-1.5 border-t border-border pt-3">
          <p className="font-mono text-[10px] text-muted-foreground leading-relaxed">
            <span className="uppercase tracking-wider text-acid">Crypto satellite</span> · judged by a shorter rule: no real share behind these, so no
            fair-price check, and no Oracle depth score.
            {chain === "solana" && " On Solana it is ETH and SOL: ETH stays, and the chain's own token takes OKB's place. ETH here is bridged, so it must hold its price against ETH."}
          </p>
          <TokenGroups tokens={view.satellite} verdicts={satelliteVerdicts} />
        </div>
      )}

      <p className="font-mono text-[9px] text-muted-foreground leading-relaxed">
        {chain === "solana" && <>Solana read {view.ageMinutes ?? "?"} min ago{view.stale ? " (stale)" : ""} · </>}
        Engine read {engine.ageMinutes ?? "?"} min ago{engine.stale ? " (stale)" : ""}
        {view.equity != null && ` · ${chain === "solana" ? "Solana book" : "Steward book"} $${view.equity.toFixed(2)}`}
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
                <TokenRow key={t.symbol} token={t} verdict={verdicts[t.symbol]} showReason={!!g.showEach} />
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
  /** The tokens share a kind of problem but each has its own figure, so each row keeps its reason. */
  showEach?: boolean;
}

const VERDICT_ORDER: LiveVerdict[] = ["HUNT", "REFUSE", "WAIT", "WATCH"];

/** Tokens with the same verdict for the same reason fold into one row. A
 * token with its own problem (thin, missing a reading) stands alone. So: all
 * alike = one "Index" row; a few differ = they stand alone above the folded rest.
 * The exception is mispricing: when two or more tokens are refused on price
 * (common overnight, when every token drifts from a frozen reference), they fold
 * into one row that gives the range, and each keeps its own figure inside. */
function groupTokens(tokens: LiveToken[], verdicts: Record<string, TokenVerdict>): TokenGroup[] {
  const groups = new Map<string, TokenGroup>();
  const priced = tokens.filter((t) => verdicts[t.symbol]?.priceRefusal && t.premiumPct != null);
  const signed = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
  const lo = Math.min(...priced.map((t) => t.premiumPct!));
  const hi = Math.max(...priced.map((t) => t.premiumPct!));
  const pricedReason = `Priced more than ${MAX_PREMIUM_PCT}% away from the real share (${signed(lo)} to ${signed(hi)}). Not fair food.`;
  for (const t of tokens) {
    const v = verdicts[t.symbol];
    if (!v) continue;
    const reason = v.shared ?? v.reason;
    const key = v.priceRefusal && priced.length > 1 ? "priced" : v.solo ? `solo|${t.symbol}` : `${v.verdict}|${reason}`;
    const g: TokenGroup = groups.get(key) ?? (key === "priced" ? { key, verdict: v.verdict, reason: pricedReason, tokens: [], showEach: true } : { key, verdict: v.verdict, reason, tokens: [] });
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
