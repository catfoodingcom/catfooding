import type { Portfolio } from "@/lib/types";

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function PortfolioSummary({ portfolio }: { portfolio: Portfolio }) {
  const totalPnL = portfolio.realisedPnL + portfolio.unrealisedPnL;
  const totalPnLPercent = (totalPnL / portfolio.startingCapital) * 100;
  const positive = totalPnL >= 0;

  return (
    <div className="grid grid-cols-2 gap-3 font-mono">
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Portfolio Value</p>
        <p className="text-lg font-bold text-cream">${fmt(portfolio.portfolioValue)}</p>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total P&amp;L</p>
        <p className={`text-lg font-bold ${positive ? "text-acid" : "text-[#ff5d5d]"}`}>
          {positive ? "+" : ""}
          {fmt(totalPnL)} ({positive ? "+" : ""}
          {totalPnLPercent.toFixed(1)}%)
        </p>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Cash (USDC)</p>
        <p className="text-sm text-cream">${fmt(portfolio.cash)}</p>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Open Positions</p>
        <p className="text-sm text-cream">{portfolio.openPositions.length}</p>
      </div>
    </div>
  );
}
