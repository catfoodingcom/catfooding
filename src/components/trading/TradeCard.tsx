import type { Trade } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

const STATUS_LABEL: Record<Trade["status"], string> = {
  OPEN: "Open",
  CLOSED: "Closed",
  STOPPED_OUT: "Stopped Out",
  TOOK_PROFIT: "Took Profit",
};

export function TradeCard({ trade, onClick }: { trade: Trade; onClick?: () => void }) {
  const pnl = trade.pnl ?? 0;
  const positive = pnl >= 0;

  return (
    <button
      onClick={onClick}
      className="w-full text-left chunky-border bg-ink-raised rounded-lg p-3 hover:translate-x-[1px] hover:translate-y-[1px] transition-transform"
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-display font-bold text-sm text-cream">{trade.token}</span>
        <Badge variant="outline" className="font-mono text-[10px] border-border">
          {STATUS_LABEL[trade.status]}
        </Badge>
      </div>
      <div className="flex items-center justify-between font-mono text-xs">
        <span className="text-muted-foreground">
          ${trade.entryPrice.toPrecision(4)} {trade.exitPrice ? `→ $${trade.exitPrice.toPrecision(4)}` : ""}
        </span>
        {trade.status !== "OPEN" && (
          <span className={positive ? "text-acid" : "text-[#ff5d5d]"}>
            {positive ? "+" : ""}
            {(trade.pnlPercent ?? 0).toFixed(1)}%
          </span>
        )}
      </div>
    </button>
  );
}
