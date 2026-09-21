import type { Memory } from "@/lib/types";

const OUTCOME_COLOR: Record<Memory["outcome"], string> = {
  POSITIVE: "text-acid border-acid/40",
  NEGATIVE: "text-[#ff5d5d] border-[#ff5d5d]/40",
  NEUTRAL: "text-muted-foreground border-border",
};

export function MemoryCard({ memory }: { memory: Memory }) {
  return (
    <div className={`chunky-border bg-ink-raised rounded-lg p-3 border-l-4 ${OUTCOME_COLOR[memory.outcome]}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="font-display font-bold text-sm text-cream">{memory.token}</span>
        <span className="font-mono text-[10px] text-muted-foreground">importance {Math.round(memory.importance)}</span>
      </div>
      <p className="font-mono text-xs text-cream/90 mb-1.5">{memory.description}</p>
      <p className="font-mono text-[11px] text-muted-foreground italic">Lesson: {memory.lesson}</p>
    </div>
  );
}
