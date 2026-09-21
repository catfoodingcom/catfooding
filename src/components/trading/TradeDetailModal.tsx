import type { Trade } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SignalBars } from "./SignalBars";

export function TradeDetailModal({ trade, onClose }: { trade: Trade | null; onClose: () => void }) {
  return (
    <Dialog open={!!trade} onOpenChange={(open) => !open && onClose()}>
      {trade && (
        <DialogContent className="chunky-border bg-ink-raised max-w-md font-mono">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <span className="text-2xl">{trade.token}</span>
              <span className="text-xs text-muted-foreground uppercase">{trade.status.replace("_", " ")}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <Row label="Entry" value={`$${trade.entryPrice.toPrecision(4)}`} />
              <Row label="Exit" value={trade.exitPrice ? `$${trade.exitPrice.toPrecision(4)}` : "—"} />
              <Row label="Position size" value={`${trade.positionSizePercent.toFixed(1)}%`} />
              <Row
                label="Duration"
                value={trade.closedAt ? `${Math.round((trade.closedAt - trade.openedAt) / 60000)}m` : "ongoing"}
              />
              <Row label="Market regime" value={trade.marketRegime.replace("_", " ")} />
              <Row
                label="P&L"
                value={trade.pnl != null ? `${trade.pnl >= 0 ? "+" : ""}${trade.pnl.toFixed(2)} (${trade.pnlPercent?.toFixed(1)}%)` : "—"}
                highlight={trade.pnl != null ? (trade.pnl >= 0 ? "good" : "bad") : undefined}
              />
            </div>

            <div>
              <p className="text-muted-foreground uppercase text-[10px] tracking-wider mb-2">Signal scores at entry</p>
              <SignalBars signals={trade.signalScores} />
            </div>

            <div>
              <p className="text-muted-foreground uppercase text-[10px] tracking-wider mb-1">Why this trade</p>
              <p className="text-cream leading-relaxed">{trade.naturalLanguageReason}</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {trade.reasonCodes.map((code) => (
                  <span key={code} className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {code}
                  </span>
                ))}
              </div>
            </div>

            {trade.exitReason && (
              <div>
                <p className="text-muted-foreground uppercase text-[10px] tracking-wider mb-1">Exit reason</p>
                <p className="text-cream leading-relaxed">{trade.exitReason}</p>
              </div>
            )}

            {trade.riskNotes && (
              <div>
                <p className="text-muted-foreground uppercase text-[10px] tracking-wider mb-1">Risk notes</p>
                <p className="text-[#ffd23f] leading-relaxed">{trade.riskNotes}</p>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-border pt-2">
              <span className="text-muted-foreground uppercase text-[10px] tracking-wider">XP earned</span>
              <span className="text-acid">+{trade.xpEarned}</span>
            </div>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: "good" | "bad" }) {
  return (
    <div className="flex flex-col">
      <span className="text-muted-foreground text-[10px] uppercase tracking-wider">{label}</span>
      <span className={highlight === "good" ? "text-acid" : highlight === "bad" ? "text-[#ff5d5d]" : "text-cream"}>{value}</span>
    </div>
  );
}
