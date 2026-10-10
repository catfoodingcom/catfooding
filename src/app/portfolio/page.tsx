"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRequireCat } from "@/lib/hooks/useRequireCat";
import { PortfolioSummary } from "@/components/trading/PortfolioSummary";
import { EquityChart } from "@/components/trading/EquityChart";
import { TradeCard } from "@/components/trading/TradeCard";
import { TradeDetailModal } from "@/components/trading/TradeDetailModal";
import { MemoryCard } from "@/components/memory/MemoryCard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Trade } from "@/lib/types";
import { useCatFoodStore } from "@/lib/store/useCatFoodStore";
import { useEngine } from "@/lib/hooks/useEngine";
import { BacktestChart, BookHoldings, BookPlan, BookSummary } from "@/components/live/BookView";
import { CHAIN_LABEL } from "@/lib/live/engine";

export default function PortfolioPage() {
  const router = useRouter();
  const { sim } = useRequireCat();
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const live = useCatFoodStore((s) => s.mode) === "LIVE";
  const { engine, error } = useEngine(live);
  const wantedChain = useCatFoodStore((s) => s.chain);

  if (!sim) return null;
  const { portfolio, memories } = sim;

  // Live mode: the real Steward book instead of the cat's paper portfolio.
  if (live) {
    // the same chain the room is showing; X Layer if Solana has no book to show
    const chain = wantedChain === "solana" && engine?.ok && engine.solana?.book ? "solana" : "xlayer";
    const book = engine?.ok ? (chain === "solana" ? engine.solana!.book : engine.book) : null;
    return (
      <div className="min-h-screen bg-ink crt-scanlines px-4 py-6 sm:px-6">
        <div className="max-w-4xl mx-auto space-y-4">
          <Link href="/room" className="font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-cream">
            ← Back to room
          </Link>
          {!book || !engine ? (
            <div className="chunky-border bg-ink-raised rounded-2xl p-5 font-mono text-xs text-muted-foreground">
              {error || engine ? "Can't read the book right now." : "Reading the book…"}
            </div>
          ) : (
            <>
              <div className="chunky-border-acid bg-ink-raised rounded-2xl p-5">
                <h1 className="font-display text-2xl font-bold">Book</h1>
                <p className="font-mono text-[10px] text-muted-foreground mb-4">
                  What the Steward wallet actually holds on {CHAIN_LABEL[chain]}{book.observedAt ? `, read ${book.observedAt.slice(0, 16).replace("T", " ")} UTC` : ""}.
                </p>
                <BookSummary book={book} />
              </div>
              <div className="grid gap-4 sm:grid-cols-[1fr_260px]">
                <div className="chunky-border bg-ink-raised rounded-2xl p-4">
                  <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-3">Holdings vs target</h2>
                  <BookHoldings book={book} />
                </div>
                <div className="chunky-border bg-ink-raised rounded-2xl p-4">
                  <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-3">Staged plan</h2>
                  <BookPlan book={book} gate={engine.gate.decision} />
                </div>
              </div>
              {chain === "xlayer" && engine.backtest && (
                <div className="chunky-border bg-ink-raised rounded-2xl p-4">
                  <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-3">Index backtest</h2>
                  <BacktestChart backtest={engine.backtest} />
                </div>
              )}
              <p className="font-mono text-[9px] text-muted-foreground">Read-only view of public CoAgentic feeds. Not investment advice.</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink crt-scanlines px-4 py-6 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Link href="/room" className="font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-cream">
            ← Back to room
          </Link>
          <Button variant="outline" size="sm" className="font-mono text-xs uppercase border-border" onClick={() => router.push("/settings")}>
            Training
          </Button>
        </div>

        <div className="chunky-border-acid bg-ink-raised rounded-2xl p-5">
          <h1 className="font-display text-2xl font-bold mb-4">Portfolio</h1>
          <PortfolioSummary portfolio={portfolio} />
          <div className="mt-4">
            <EquityChart data={sim.equityCurve} />
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3 font-mono text-xs">
          <Stat label="Daily P&L" value={`${portfolio.dailyPnL >= 0 ? "+" : ""}${portfolio.dailyPnL.toFixed(2)}`} />
          <Stat label="Peak value" value={`$${portfolio.peakPortfolioValue.toFixed(2)}`} />
          <Stat label="Drawdown" value={`${portfolio.drawdown.toFixed(1)}%`} danger={portfolio.drawdown > 8} />
        </div>

        <Tabs defaultValue="positions">
          <TabsList className="bg-ink-raised border border-border">
            <TabsTrigger value="positions" className="font-mono text-xs uppercase">
              Open ({portfolio.openPositions.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="font-mono text-xs uppercase">
              History ({portfolio.tradeHistory.length})
            </TabsTrigger>
            <TabsTrigger value="memories" className="font-mono text-xs uppercase">
              Memories ({memories.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="positions" className="space-y-2 mt-3">
            {portfolio.openPositions.length === 0 && <p className="font-mono text-xs text-muted-foreground">No open positions.</p>}
            {portfolio.openPositions.map((p) => (
              <div key={p.id} className="chunky-border bg-ink-raised rounded-lg p-3 font-mono text-xs flex items-center justify-between">
                <div>
                  <p className="font-display font-bold text-sm">{p.token}</p>
                  <p className="text-muted-foreground">
                    ${p.entryPrice.toPrecision(4)} → ${p.currentPrice.toPrecision(4)}
                  </p>
                </div>
                <div className="text-right">
                  <p className={p.currentPrice >= p.entryPrice ? "text-acid" : "text-[#ff5d5d]"}>
                    {(((p.currentPrice - p.entryPrice) / p.entryPrice) * 100).toFixed(1)}%
                  </p>
                  <p className="text-muted-foreground">${p.positionValue.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="history" className="space-y-2 mt-3">
            {portfolio.tradeHistory.length === 0 && <p className="font-mono text-xs text-muted-foreground">No trades yet.</p>}
            {portfolio.tradeHistory
              .filter((t) => t.status !== "OPEN")
              .map((t) => (
                <TradeCard key={t.id} trade={t} onClick={() => setSelectedTrade(t)} />
              ))}
          </TabsContent>

          <TabsContent value="memories" className="space-y-2 mt-3">
            {memories.length === 0 && <p className="font-mono text-xs text-muted-foreground">No memories formed yet.</p>}
            {memories.map((m) => (
              <MemoryCard key={m.id} memory={m} />
            ))}
          </TabsContent>
        </Tabs>
      </div>

      <TradeDetailModal trade={selectedTrade} onClose={() => setSelectedTrade(null)} />
    </div>
  );
}

function Stat({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="chunky-border bg-ink-raised rounded-lg p-3">
      <p className="text-muted-foreground uppercase text-[10px] tracking-wider">{label}</p>
      <p className={danger ? "text-[#ff5d5d]" : "text-cream"}>{value}</p>
    </div>
  );
}
