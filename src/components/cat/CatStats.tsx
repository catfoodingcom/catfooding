import type { CatState } from "@/lib/types";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface StatDef {
  key: keyof Pick<CatState, "health" | "energy" | "hunger" | "focus" | "confidence" | "caution">;
  icon: string;
  label: string;
  color: string;
  tooltip: string;
}

const STATS: StatDef[] = [
  { key: "health", icon: "❤️", label: "Health", color: "#ff5d5d", tooltip: "Reflects portfolio drawdown. Recovers as the portfolio recovers." },
  { key: "energy", icon: "⚡", label: "Energy", color: "#ffd23f", tooltip: "Remaining trading activity budget. Regenerates over time; rate-limits overtrading." },
  { key: "hunger", icon: "🍣", label: "Hunger", color: "#ff9f4f", tooltip: "Desire to search for new opportunities. Rises over time, satisfied by feeding or good hunts." },
  { key: "focus", icon: "🎯", label: "Focus", color: "var(--info)", tooltip: "Required signal quality before acting." },
  { key: "confidence", icon: "😼", label: "Confidence", color: "var(--acid)", tooltip: "Position sizing tendency — rises on win streaks, falls on losses." },
  { key: "caution", icon: "🛡", label: "Caution", color: "#ff4fa6", tooltip: "Risk tolerance, inverse of confidence, shaped by fear." },
];

export function CatStats({ cat }: { cat: CatState }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {STATS.map((stat) => {
        const value = cat[stat.key];
        return (
          <Tooltip key={stat.key}>
            <TooltipTrigger render={<div className="flex flex-col gap-1 cursor-help" />}>
              <>
                <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  <span>
                    {stat.icon} {stat.label}
                  </span>
                  <span className="text-cream">{Math.round(value)}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-secondary overflow-hidden border border-border">
                  <div className="h-full transition-all duration-500" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: stat.color }} />
                </div>
              </>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[220px] font-mono text-xs">
              {stat.tooltip}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

export function MoodDisplay({ mood, intelligence }: { mood: number; intelligence: number }) {
  const label = mood > 60 ? "Happy" : mood > 25 ? "Confident" : mood > -10 ? "Curious" : mood > -35 ? "Bored" : mood > -60 ? "Nervous" : "Angry";
  return (
    <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
      <span>😸 Mood: <span className="text-cream normal-case">{label}</span></span>
      <span>🧠 Lv{intelligence}</span>
    </div>
  );
}
