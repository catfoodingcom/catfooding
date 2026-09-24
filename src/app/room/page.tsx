"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useCatFoodStore } from "@/lib/store/useCatFoodStore";
import { useRequireCat } from "@/lib/hooks/useRequireCat";
import { CatAvatar3D as CatAvatar } from "@/components/cat/CatAvatar3D";
import { CatThoughtBubble } from "@/components/cat/CatThoughtBubble";
import { CatStats, MoodDisplay } from "@/components/cat/CatStats";
import { XPBar } from "@/components/cat/XPBar";
import { EvolutionProgress } from "@/components/cat/EvolutionProgress";
import { PreyCard } from "@/components/trading/PreyCard";
import { MarketRegimeIndicator } from "@/components/trading/MarketRegimeIndicator";
import { RiskPanel } from "@/components/trading/RiskPanel";
import { PortfolioSummary } from "@/components/trading/PortfolioSummary";
import { ActivityFeed } from "@/components/activity/ActivityFeed";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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

  useEffect(() => {
    if (sim && !isRunning) start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim?.cat.id]);

  if (!sim || !market) return null;
  const { cat, portfolio, riskSettings } = sim;

  const proposalMetrics = sim.pendingProposal?.token ? market.tokens[sim.pendingProposal.token] : null;

  return (
    <div className="min-h-screen bg-ink crt-scanlines px-4 py-6 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* top nav */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="font-display font-bold tracking-tight">
            CAT<span className="text-acid">FOOD</span>
          </Link>
          <div className="flex items-center gap-2">
            <MarketRegimeIndicator regime={market.regime} />
            <Link href="/portfolio">
              <Button variant="outline" size="sm" className="font-mono text-xs uppercase border-border">
                Portfolio
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
                      {cat.evolutionStage}
                    </Badge>
                    {cat.currentState === "injured" && (
                      <Badge variant="outline" className="font-mono text-[10px] border-[#ff5d5d] text-[#ff5d5d]">
                        Cooldown
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-1.5">
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
                </div>
              </div>

              <div className="flex flex-col items-center py-4">
                <CatAvatar state={cat.currentState} mood={cat.mood} size={200} evolutionStage={cat.evolutionStage} hunger={cat.hunger} />
                <div className="mt-3 w-full max-w-sm">
                  <CatThoughtBubble thought={cat.currentThought} />
                </div>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-4">
                <RoomItem icon="🥣" label="Bowl" value={`$${portfolio.cash.toFixed(0)}`} hint="available USDC" />
                <RoomItem icon="💰" label="Treasure" value={`$${portfolio.realisedPnL.toFixed(0)}`} hint="realised P&L" />
                <RoomItem icon="🧸" label="Toy box" value={`${portfolio.openPositions.length}`} hint="open positions" />
                <RoomItem icon="🛏" label="Bed" value={`${((portfolio.cash / portfolio.portfolioValue) * 100).toFixed(0)}%`} hint="idle capital" />
                <RoomItem icon="🩹" label="Medicine" value={`${cat.lives}/9`} hint="lives left" />
              </div>

              <div className="mt-4 space-y-2">
                <XPBar xp={cat.xp} level={cat.level} />
                <MoodDisplay mood={cat.mood} intelligence={cat.level} />
              </div>
            </div>

            {sim.pendingProposal && proposalMetrics && (
              <PreyCard
                decision={sim.pendingProposal}
                metrics={proposalMetrics}
                personality={cat.personality}
                catName={cat.name}
                onApprove={approveProposal}
                onDecline={declineProposal}
              />
            )}

            <div className="chunky-border bg-ink-raised rounded-2xl p-4">
              <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-3">Vitals</h2>
              <CatStats cat={cat} />
            </div>

            <div className="chunky-border bg-ink-raised rounded-2xl p-4">
              <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-3">Evolution</h2>
              <EvolutionProgress current={cat.evolutionStage} />
            </div>

            <div className="chunky-border bg-ink-raised rounded-2xl p-4">
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
            <div className="chunky-border bg-ink-raised rounded-2xl p-4">
              <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-3">Portfolio</h2>
              <PortfolioSummary portfolio={portfolio} />
            </div>

            <div className="chunky-border bg-ink-raised rounded-2xl p-4">
              <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-3">Risk Engine</h2>
              <RiskPanel settings={riskSettings} portfolio={portfolio} />
            </div>

            <div className="chunky-border bg-ink-raised rounded-2xl p-4 h-96 flex flex-col">
              <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-3">Activity</h2>
              <div className="flex-1 min-h-0">
                <ActivityFeed events={sim.activity} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
