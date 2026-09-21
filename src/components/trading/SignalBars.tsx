import type { SignalScores } from "@/lib/types";

const ROWS: { key: keyof SignalScores; label: string }[] = [
  { key: "momentum", label: "Momentum" },
  { key: "volume", label: "Volume" },
  { key: "liquidity", label: "Liquidity" },
  { key: "trend", label: "Trend" },
  { key: "relativeStrength", label: "Rel. Strength" },
  { key: "risk", label: "Risk" },
];

export function SignalBars({ signals }: { signals: SignalScores }) {
  return (
    <div className="space-y-1.5">
      {ROWS.map(({ key, label }) => {
        const value = signals[key];
        const isRisk = key === "risk";
        return (
          <div key={key} className="grid grid-cols-[90px_1fr_28px] items-center gap-2 font-mono text-[11px]">
            <span className="text-muted-foreground uppercase tracking-wide">{label}</span>
            <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full"
                style={{
                  width: `${value}%`,
                  background: isRisk ? (value > 60 ? "#ff5d5d" : "#ffd23f") : "#baff29",
                }}
              />
            </div>
            <span className="text-right text-cream">{Math.round(value)}</span>
          </div>
        );
      })}
    </div>
  );
}
