import type { MarketRegime } from "@/lib/types";

const REGIME_STYLE: Record<MarketRegime, { label: string; color: string; dot: string }> = {
  RISK_ON: { label: "Risk On", color: "text-acid", dot: "bg-acid" },
  NEUTRAL: { label: "Neutral", color: "text-muted-foreground", dot: "bg-muted-foreground" },
  HIGH_VOLATILITY: { label: "High Volatility", color: "text-[#ffd23f]", dot: "bg-[#ffd23f]" },
  RISK_OFF: { label: "Risk Off", color: "text-pink", dot: "bg-pink" },
};

export function MarketRegimeIndicator({ regime }: { regime: MarketRegime }) {
  const style = REGIME_STYLE[regime];
  return (
    <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider">
      <span className={`h-2 w-2 rounded-full ${style.dot} animate-pulse`} />
      <span className={style.color}>{style.label}</span>
    </div>
  );
}
