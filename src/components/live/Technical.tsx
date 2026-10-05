"use client";

import { useState, type ReactNode } from "react";
import { Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { LiveTechnical } from "@/lib/live/engine";
import { TileDialog, Voice } from "./Reasoning";

const usd = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: n < 1000 ? 2 : 0 })}`;
const BEARING: Record<string, string> = { bull: "text-acid border-acid/50", bear: "text-[#ff9d9d] border-[#ff5d5d]/50" };

/** The price at each daily report, with the range the rule trades inside (shaded) and the
 * level that would change the Council's mind (dashed). Daily points, not candles. */
function TechnicalChart({ t }: { t: LiveTechnical }) {
  if (t.series.length < 2) return null;
  const prices = t.series.map((p) => p.price);
  const marks = [t.flipLevel, t.box?.hi, t.box?.lo].filter((n): n is number => n != null);
  const lo = Math.min(...prices, ...marks);
  const hi = Math.max(...prices, ...marks);
  const pad = (hi - lo) * 0.06;
  return (
    <div>
      <ResponsiveContainer width="100%" height={210}>
        {/* accessibilityLayer off: it made the chart take focus when the panel opened, showing a
            focus ring and a tooltip on the first point. The same facts are in the text below. */}
        <LineChart data={t.series} margin={{ top: 8, right: 8, left: -12, bottom: 0 }} accessibilityLayer={false}>
          <XAxis dataKey="date" tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} tickFormatter={(d: string) => d.slice(5)} axisLine={{ stroke: "var(--border)" }} tickLine={false} minTickGap={36} />
          <YAxis domain={[Math.floor(lo - pad), Math.ceil(hi + pad)]} tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={52} tickFormatter={(n: number) => usd(n)} />
          <Tooltip
            contentStyle={{ background: "var(--ink-raised)", border: "2px solid var(--cream)", borderRadius: 8, fontFamily: "var(--font-mono)", fontSize: 11 }}
            labelStyle={{ color: "var(--muted-foreground)" }}
            formatter={(value, _name, item) => [`${usd(Number(value))} · ${(item?.payload as { signal?: string } | undefined)?.signal ?? "no verdict"}`, t.symbol]}
          />
          {t.box && <ReferenceArea y1={t.box.lo} y2={t.box.hi} fill="var(--info)" fillOpacity={0.07} stroke="none" />}
          {t.flipLevel != null && <ReferenceLine y={t.flipLevel} stroke="#ffd23f" strokeDasharray="5 4" />}
          <Line type="monotone" dataKey="price" stroke="var(--acid)" strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px]">
        <span className="text-acid">━ {t.symbol}, {t.seriesNote}</span>
        {t.flipLevel != null && <span className="text-[#ffd23f]">┄ view changes below {usd(t.flipLevel)}</span>}
        {t.box && (
          <span className="text-info">
            ▒ range {usd(t.box.lo)}–{usd(t.box.hi)}
          </span>
        )}
      </div>
    </div>
  );
}

/** The technical reads behind the tile: for each asset that has one, the chart, the phases by
 * timeframe, and the Council's Bull / Bear / Risk arguments. Advisory, like every Council output. */
export function TechnicalReasoning({ technical, tile }: { technical: LiveTechnical[]; tile: ReactNode }) {
  if (!technical.length) return <>{tile}</>;
  return (
    <TileDialog
      tile={tile}
      title="Technical view"
      description="A Bull / Bear / Risk deliberation over the price chart, for the assets that have one: ETH daily and SPCXx weekly. The other stock tokens get a trend phase only. Advisory: it does not gate any trade."
    >
      <TechnicalBody technical={technical} />
    </TileDialog>
  );
}

function TechnicalBody({ technical }: { technical: LiveTechnical[] }) {
  const [selected, setSelected] = useState(0);
  const t = technical[Math.min(selected, technical.length - 1)];
  const pct = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;
  return (
    <>
      {technical.length > 1 && (
        <div className="flex gap-1.5">
          {technical.map((x, i) => (
            <button
              key={x.symbol}
              type="button"
              onClick={() => setSelected(i)}
              aria-pressed={i === selected}
              className={`rounded-md border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider ${i === selected ? "border-acid bg-acid/10 text-acid" : "border-border text-muted-foreground hover:text-cream"}`}
            >
              {x.symbol} · {x.signal ?? "?"}
            </button>
          ))}
        </div>
      )}

      <TechnicalChart t={t} />

      {t.timeframes.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {t.timeframes.map((f) => (
            <span key={f.name} className={`rounded-full border px-2 py-0.5 font-mono text-[10px] ${BEARING[f.bearing ?? ""] ?? "text-muted-foreground border-border"}`}>
              {f.name} · {f.phase ?? "?"} · {f.bearing ?? "?"}
            </span>
          ))}
        </div>
      )}

      {t.oneLevel && (
        <p className="rounded-lg border border-[#ffd23f]/40 bg-[#ffd23f]/5 p-2.5 font-mono text-[11px] text-cream/90 leading-relaxed">
          <span className="text-[#ffd23f] uppercase text-[10px] tracking-wider">Changes its mind at · </span>
          {t.oneLevel}
        </p>
      )}

      <p className="font-mono text-[10px] text-muted-foreground">
        Council ({t.cadence}): <span className="text-cream">{t.signal ?? "unknown"}</span> · confidence <span className="text-cream">{t.confidence ?? "unknown"}</span>
        {t.regime && (
          <>
            {" "}
            · trend <span className="text-cream">{t.regime}</span>
          </>
        )}
        {t.asof && ` · deliberated ${t.asof.slice(0, 10)}`}
      </p>
      {t.track && (
        <p className="font-mono text-[10px] text-muted-foreground leading-relaxed">
          Paper track{t.track.since ? ` since ${t.track.since}` : ""}: following this signal <span className="text-cream">{pct(t.track.signalPct)}</span>, simply holding{" "}
          <span className="text-cream">{pct(t.track.holdPct)}</span>. Shown as measured, whichever way it reads.
        </p>
      )}
      <Voice key={`${t.symbol}-s`} label="⚖ Synthesis" color="text-cream" text={t.synthesis} open />
      <Voice key={`${t.symbol}-b`} label="🐂 Bull" color="text-acid" text={t.bull} />
      <Voice key={`${t.symbol}-r`} label="🐻 Bear" color="text-[#ff9d9d]" text={t.bear} />
      <Voice key={`${t.symbol}-k`} label="🛡 Risk" color="text-[#ffd23f]" text={t.risk} />
      <p className="font-mono text-[9px] text-muted-foreground">Analysis of price data, not investment advice.</p>
    </>
  );
}
