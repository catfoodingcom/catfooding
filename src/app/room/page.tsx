"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useCatFoodStore } from "@/lib/store/useCatFoodStore";
import { useRequireCat } from "@/lib/hooks/useRequireCat";
import { CatThoughtBubble } from "@/components/cat/CatThoughtBubble";
import { POSE_BY_STATE } from "@/components/cat/CatClip";
import { CatStage, SHOWREEL } from "@/components/cat/CatStage";
import { CatStats, MoodDisplay } from "@/components/cat/CatStats";
import { XPBar } from "@/components/cat/XPBar";
import { EvolutionProgress } from "@/components/cat/EvolutionProgress";
import { PreyCard } from "@/components/trading/PreyCard";
import { RefusedCard } from "@/components/trading/RefusedCard";
import { MarketRegimeIndicator } from "@/components/trading/MarketRegimeIndicator";
import { RiskPanel } from "@/components/trading/RiskPanel";
import { PortfolioSummary } from "@/components/trading/PortfolioSummary";
import { ActivityFeed } from "@/components/activity/ActivityFeed";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LivePanel } from "@/components/live/LivePanel";
import { BookSummary } from "@/components/live/BookView";
import { LiveRiskPanel } from "@/components/live/LiveRiskPanel";
import { useEngine } from "@/lib/hooks/useEngine";
import { catRead, liveVitals, satelliteVerdictFor, verdictFor, type TokenVerdict } from "@/lib/live/engine";
import { LiveLevel, LiveVitals, TrackRecord, liveStage } from "@/components/live/LiveVitals";

function RoomItem({ icon, label, value, hint }: { icon: string; label: string; value: string; hint: string }) {
  return (
    <div className="chunky-border bg-ink-raised rounded-lg p-2.5 flex flex-col items-center text-center gap-0.5">
      <span className="text-xl">{icon}</span>
      <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="font-mono text-xs text-cream">{value}</span>
      <span className="font-mono text-[8px] text-muted-foreground">{hint}</span>
    </div>
  );
}

export default function CatRoomPage() {
  const { sim } = useRequireCat();
  const market = useCatFoodStore((s) => s.market);
  const isRunning = useCatFoodStore((s) => s.isRunning);
  const speed = useCatFoodStore((s) => s.speed);
  const start = useCatFoodStore((s) => s.start);
  const pause = useCatFoodStore((s) => s.pause);
  const setSpeed = useCatFoodStore((s) => s.setSpeed);
  const approveProposal = useCatFoodStore((s) => s.approveProposal);
  const declineProposal = useCatFoodStore((s) => s.declineProposal);
  const feedCat = useCatFoodStore((s) => s.feedCat);
  const applyScenario = useCatFoodStore((s) => s.applyScenario);
  const mode = useCatFoodStore((s) => s.mode);
  const setMode = useCatFoodStore((s) => s.setMode);
  const live = mode === "LIVE";
  // Showreel: a visitor-triggered preview of every expression. While it runs the cat is
  // NOT showing the engine's verdict, and the caption says so.
  const [reel, setReel] = useState<number | null>(null);
  const nextInReel = useCallback(() => setReel((i) => (i == null || i + 1 >= SHOWREEL.length ? null : i + 1)), []);
  const { engine, error: engineError } = useEngine(live);

  // Live mode: the engine's verdicts drive the cat instead of the simulator.
  const verdicts = useMemo(() => {
    const out: Record<string, TokenVerdict> = {};
    if (engine?.ok) for (const t of engine.tokens) out[t.symbol] = verdictFor(t, engine);
    return out;
  }, [engine]);
  const satelliteVerdicts = useMemo(() => {
    const out: Record<string, TokenVerdict> = {};
    if (engine?.ok) for (const t of engine.satellite) out[t.symbol] = satelliteVerdictFor(t, engine);
    return out;
  }, [engine]);
  const read = useMemo(() => (live && engine ? catRead(engine, verdicts, satelliteVerdicts) : null), [live, engine, verdicts, satelliteVerdicts]);

  useEffect(() => {
    if (sim && !isRunning && !live) start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim?.cat.id]);

  if (!sim || !market) return null;
  const { cat, portfolio, riskSettings } = sim;
  // Live mode shows the real book; Demo shows the cat's paper portfolio.
  const book = live && engine?.ok ? engine.book : null;
  const record = live && engine?.ok ? engine.record : null;
  const vitals = live && engine?.ok ? liveVitals(engine) : null;

  const proposalMetrics = sim.pendingProposal?.token ? market.tokens[sim.pendingProposal.token] : null;

  return (
    <div className="min-h-screen bg-ink crt-scanlines px-4 py-6 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* top nav */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="font-display font-bold tracking-tight">
            CAT<span className="text-acid">FOODING</span>
          </Link>
          <div className="flex items-center gap-2">
            {!live && <MarketRegimeIndicator regime={market.regime} />}
            <Link href="/portfolio">
              <Button variant="outline" size="sm" className="font-mono text-xs uppercase border-border">
                {live ? "Book" : "Portfolio"}
              </Button>
            </Link>
            <Link href="/settings">
              <Button variant="outline" size="sm" className="font-mono text-xs uppercase border-border">
                Training
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          {/* main room */}
          <div className="space-y-4">
            <div className="chunky-border-acid bg-ink-raised rounded-2xl p-5">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h1 className="font-display text-2xl font-bold">{cat.name}</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className="bg-acid text-ink font-mono text-[10px]">{cat.archetype}</Badge>
                    <Badge variant="outline" className="font-mono text-[10px] border-border">
                      {live ? liveStage(record) : cat.evolutionStage}
                    </Badge>
                    {cat.currentState === "injured" && (
                      <Badge variant="outline" className="font-mono text-[10px] border-[#ff5d5d] text-[#ff5d5d]">
                        Cooldown
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <div className="flex rounded-md border border-border overflow-hidden">
                    {(["LIVE", "DEMO"] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setMode(m)}
                        aria-pressed={mode === m}
                        className={`px-2.5 h-8 font-mono text-[10px] uppercase tracking-wider ${mode === m ? "bg-acid text-ink" : "text-muted-foreground hover:text-cream"}`}
                      >
                        {m === "LIVE" ? "● Live" : "Demo"}
                      </button>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    title={reel == null ? "Preview every expression" : "Stop the preview"}
                    aria-pressed={reel != null}
                    className={`font-mono text-[10px] uppercase border-border h-8 ${reel != null ? "text-acid border-acid" : ""}`}
                    onClick={() => setReel((i) => (i == null ? 0 : null))}
                  >
                    {reel == null ? "▶ Poses" : "■ Stop"}
                  </Button>
                  {!live && (
                    <>
                      <Button size="icon" variant="outline" className="border-border h-8 w-8" onClick={() => (isRunning ? pause() : start())}>
                        {isRunning ? "⏸" : "▶"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="font-mono text-[10px] border-border"
                        onClick={() => setSpeed(speed === "NORMAL" ? "FAST" : "NORMAL")}
                      >
                        {speed}
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-center py-4">
                {reel != null ? (
                  <CatStage pose={SHOWREEL[reel].pose} onDone={nextInReel} />
                ) : (
                  <CatStage pose={live ? (read?.pose ?? "watch") : POSE_BY_STATE[cat.currentState]} />
                )}
                <div className="mt-3 w-full max-w-sm">
                  <CatThoughtBubble
                    thought={
                      reel != null
                        ? `Preview ${reel + 1} of ${SHOWREEL.length} · ${SHOWREEL[reel].label}`
                        : live
                          ? (read?.thought ?? (engineError ? "Can't reach the engine. Not guessing." : "Sniffing the engine…"))
                          : cat.currentThought
                    }
                  />
                </div>
              </div>

              {live ? (
                <div className="grid grid-cols-3 gap-2 mt-4">
                  <RoomItem icon="🥣" label="Bowl" value={book ? `$${book.reserveUsd.toFixed(0)}` : "…"} hint="reserve in the book" />
                  <RoomItem icon="🧸" label="Toy box" value={book ? `${book.holdings.filter((h) => h.sleeve !== "reserve").length}` : "…"} hint="holdings" />
                  <RoomItem icon="🛏" label="Bed" value={book ? `${book.reservePct.toFixed(0)}%` : "…"} hint="idle capital" />
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-4">
                  <RoomItem icon="🥣" label="Bowl" value={`$${portfolio.cash.toFixed(0)}`} hint="available USDC" />
                  <RoomItem icon="💰" label="Treasure" value={`$${portfolio.realisedPnL.toFixed(0)}`} hint="realised P&L" />
                  <RoomItem icon="🧸" label="Toy box" value={`${portfolio.openPositions.length}`} hint="open positions" />
                  <RoomItem icon="🛏" label="Bed" value={`${((portfolio.cash / portfolio.portfolioValue) * 100).toFixed(0)}%`} hint="idle capital" />
                  <RoomItem icon="🩹" label="Medicine" value={`${cat.lives}/9`} hint="lives left" />
                </div>
              )}

              {live ? (
                <div className="mt-4">
                  <LiveLevel record={record} headline={read?.headline ?? null} />
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  <XPBar xp={cat.xp} level={cat.level} />
                  <MoodDisplay mood={cat.mood} intelligence={cat.level} />
                </div>
              )}
            </div>

            {live && <LivePanel engine={engine?.ok ? engine : null} verdicts={verdicts} satelliteVerdicts={satelliteVerdicts} error={engineError} />}

            {!live && sim.pendingProposal && proposalMetrics && (
              <PreyCard
                decision={sim.pendingProposal}
                metrics={proposalMetrics}
                personality={cat.personality}
                catName={cat.name}
                onApprove={approveProposal}
                onDecline={declineProposal}
              />
            )}

            {!live && !sim.pendingProposal && sim.lastRefusal && (
              <RefusedCard decision={sim.lastRefusal} catName={cat.name} />
            )}

            <div className="chunky-border bg-ink-raised rounded-2xl p-4">
              <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-3">Vitals{live ? " · live engine" : ""}</h2>
              {live ? vitals ? <LiveVitals vitals={vitals} /> : <p className="font-mono text-xs text-muted-foreground">Reading the engine…</p> : <CatStats cat={cat} />}
            </div>

            <div className="chunky-border bg-ink-raised rounded-2xl p-4">
              <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-3">Evolution{live ? " · real track record" : ""}</h2>
              <EvolutionProgress current={live ? liveStage(record) : cat.evolutionStage} />
              {live && record && (
                <div className="mt-3 border-t border-border pt-3">
                  <TrackRecord record={record} />
                </div>
              )}
            </div>

            <div className={`chunky-border bg-ink-raised rounded-2xl p-4 ${live ? "hidden" : ""}`}>
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Dev / Demo Controls</h2>
                <Button size="sm" variant="ghost" onClick={feedCat} className="font-mono text-[10px] text-pink hover:text-pink">
                  🐟 Feed cat
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(["BULL", "BEAR", "VOLATILITY_SPIKE", "LIQUIDITY_COLLAPSE", "WINNING_SETUP", "LOSING_SETUP", "TRAP"] as const).map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant="outline"
                    className="font-mono text-[9px] uppercase border-border"
                    onClick={() => applyScenario(s)}
                  >
                    {s.replace("_", " ")}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* sidebar */}
          <div className="space-y-4">
            {live ? (
              <div className="chunky-border bg-ink-raised rounded-2xl p-4">
                <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-3">Book · Steward, live</h2>
                {book ? <BookSummary book={book} /> : <p className="font-mono text-xs text-muted-foreground">Reading the book…</p>}
                <Link href="/portfolio" className="mt-3 inline-block font-mono text-[10px] uppercase tracking-wider text-acid hover:underline">
                  Holdings and targets →
                </Link>
              </div>
            ) : null}
            {live && engine?.ok && engine.risk ? (
              <div className="chunky-border bg-ink-raised rounded-2xl p-4">
                <LiveRiskPanel risk={engine.risk} gate={engine.gate.decision} />
              </div>
            ) : null}
            {live ? null : (
              <>
                <div className="chunky-border bg-ink-raised rounded-2xl p-4">
                  <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-3">Portfolio</h2>
                  <PortfolioSummary portfolio={portfolio} />
                </div>

                <div className="chunky-border bg-ink-raised rounded-2xl p-4">
                  <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-3">Risk Engine</h2>
                  <RiskPanel settings={riskSettings} portfolio={portfolio} />
                </div>
              </>
            )}

            <div className="chunky-border bg-ink-raised rounded-2xl p-4 h-96 flex flex-col">
              <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-3">Activity{live ? " · real events" : ""}</h2>
              <div className="flex-1 min-h-0">
                <ActivityFeed events={live ? (engine?.ok ? engine.activity : []) : sim.activity} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
