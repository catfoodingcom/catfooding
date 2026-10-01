"use client";

import { evolutionStageForLevel, levelForXP } from "@/lib/types";
import { liveMood, type LiveRecord, type LiveVerdict, type LiveVital } from "@/lib/live/engine";
import { XPBar } from "@/components/cat/XPBar";

/** Live vitals: same six bars as the paper cat, but each is a real engine
 * reading and says what it measures. */
export function LiveVitals({ vitals }: { vitals: LiveVital[] }) {
  return (
    <div className="grid sm:grid-cols-2 gap-x-4 gap-y-3">
      {vitals.map((v) => (
        <div key={v.key} className="flex flex-col gap-1">
          <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <span>
              {v.icon} {v.label}
            </span>
            <span className="text-cream">{v.value}</span>
          </div>
          <div className="h-2 w-full rounded-full bg-secondary overflow-hidden border border-border">
            <div className="h-full transition-all duration-500" style={{ width: `${v.value}%`, background: v.color }} />
          </div>
          <p className="font-mono text-[9px] text-muted-foreground leading-snug">{v.caption}</p>
        </div>
      ))}
    </div>
  );
}

export const liveLevel = (record: LiveRecord | null) => levelForXP(record?.xp ?? 0);
export const liveStage = (record: LiveRecord | null) => evolutionStageForLevel(liveLevel(record));

/** Level bar + mood under the cat, from the real track record and live verdict. */
export function LiveLevel({ record, headline }: { record: LiveRecord | null; headline: LiveVerdict | null }) {
  return (
    <div className="space-y-2">
      <XPBar xp={record?.xp ?? 0} level={liveLevel(record)} />
      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>
          😸 Mood: <span className="text-cream normal-case">{headline ? liveMood(headline) : "…"}</span>
        </span>
        <span>Level from the real track record</span>
      </div>
    </div>
  );
}

/** How the level was earned: every line is countable from the public feeds. */
export function TrackRecord({ record }: { record: LiveRecord }) {
  return (
    <div className="space-y-1.5 font-mono text-[11px]">
      {record.items.map((i) => (
        <div key={i.label} className="flex items-baseline justify-between gap-2">
          <span className="text-cream/90">
            {i.label} <span className="text-muted-foreground">× {i.count}</span>
          </span>
          <span className="text-muted-foreground shrink-0">
            {i.xpEach} XP each · <span className="text-acid">{i.count * i.xpEach} XP</span>
          </span>
        </div>
      ))}
      <p className="text-[9px] text-muted-foreground leading-relaxed pt-1">
        Counted from the public feeds{record.since ? ` since the book went live on ${record.since.slice(0, 10)}` : ""}. Nothing is self-reported, so the
        level only rises as real events accrue. Refusals are not recorded yet and earn nothing.
      </p>
    </div>
  );
}
