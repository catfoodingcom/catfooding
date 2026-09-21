import type { AutonomyMode } from "@/lib/types";

const MODES: { mode: AutonomyMode; label: string; description: string }[] = [
  { mode: "PAPER_OBSERVER", label: "Paper Observer", description: "The cat decides, but never opens a position. Pure observation." },
  { mode: "ASK_ME", label: "Ask Me", description: "The cat proposes a paper trade and waits for your go-ahead." },
  { mode: "AUTONOMOUS_PAPER", label: "Autonomous Paper", description: "The cat executes paper trades on its own, inside the risk limits." },
];

export function AutonomySelector({ value, onChange }: { value: AutonomyMode; onChange: (mode: AutonomyMode) => void }) {
  return (
    <div className="space-y-2">
      {MODES.map(({ mode, label, description }) => (
        <button
          key={mode}
          onClick={() => onChange(mode)}
          className={`w-full text-left rounded-lg border-2 p-3 transition-colors ${
            value === mode ? "border-acid bg-acid/10" : "border-border bg-ink-raised hover:border-muted-foreground"
          }`}
        >
          <p className="font-mono text-xs uppercase tracking-wider text-cream">{label}</p>
          <p className="font-mono text-[11px] text-muted-foreground mt-0.5">{description}</p>
        </button>
      ))}
      <p className="font-mono text-[10px] text-muted-foreground pt-1">
        Every mode still passes through the Risk Engine — this only controls whether you confirm before a paper trade executes.
      </p>
    </div>
  );
}
