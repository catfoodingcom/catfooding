import type { EvolutionStage } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

const STAGES: { stage: EvolutionStage; range: string }[] = [
  { stage: "Kitten", range: "1-4" },
  { stage: "Street Cat", range: "5-9" },
  { stage: "Hunter", range: "10-19" },
  { stage: "Cyber Cat", range: "20-34" },
  { stage: "Apex Cat", range: "35-49" },
  { stage: "Legendary", range: "50" },
];

export function EvolutionProgress({ current }: { current: EvolutionStage }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {STAGES.map(({ stage, range }) => (
        <Badge
          key={stage}
          variant="outline"
          className={
            stage === current
              ? "border-acid text-acid bg-acid/10 font-mono text-[10px]"
              : "border-border text-muted-foreground font-mono text-[10px] opacity-60"
          }
        >
          {stage} <span className="ml-1 opacity-60">Lv{range}</span>
        </Badge>
      ))}
    </div>
  );
}
