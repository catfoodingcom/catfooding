import { XP_FOR_LEVEL } from "@/lib/types";

export function XPBar({ xp, level }: { xp: number; level: number }) {
  const currentLevelXp = XP_FOR_LEVEL(level);
  const nextLevelXp = XP_FOR_LEVEL(Math.min(50, level + 1));
  const span = Math.max(1, nextLevelXp - currentLevelXp);
  const progress = level >= 50 ? 100 : Math.min(100, ((xp - currentLevelXp) / span) * 100);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>Lv. {level}</span>
        <span>{level >= 50 ? "MAX" : `${xp - currentLevelXp} / ${span} XP`}</span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-secondary overflow-hidden border border-border">
        <div className="h-full bg-acid transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
