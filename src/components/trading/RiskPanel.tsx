import type { Portfolio, RiskSettings } from "@/lib/types";

export function RiskPanel({ settings, portfolio }: { settings: RiskSettings; portfolio: Portfolio }) {
  const rows: { label: string; value: string; danger?: boolean }[] = [
    { label: "Max trade size", value: `${settings.maxTradeAllocationPercent}%` },
    { label: "Max open positions", value: `${portfolio.openPositions.length} / ${settings.maxOpenPositions}` },
    { label: "Max daily loss", value: `${settings.maxDailyLossPercent}%` },
    {
      label: "Drawdown",
      value: `${portfolio.drawdown.toFixed(1)}% / ${settings.maxPortfolioDrawdownPercent}%`,
      danger: portfolio.drawdown > settings.maxPortfolioDrawdownPercent * 0.7,
    },
    { label: "Min liquidity", value: `$${(settings.minimumLiquidity / 1000).toFixed(0)}k` },
    { label: "Max token risk", value: `${settings.maximumTokenRiskScore}` },
  ];

  return (
    <div className="space-y-1.5 font-mono text-[11px]">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between">
          <span className="text-muted-foreground">{row.label}</span>
          <span className={row.danger ? "text-[#ff5d5d]" : "text-cream"}>{row.value}</span>
        </div>
      ))}
    </div>
  );
}
