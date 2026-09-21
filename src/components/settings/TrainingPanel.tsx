"use client";

import type { RiskSettings } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { clamp } from "@/lib/market/random";

interface TrainingPreset {
  phrase: string;
  apply: (s: RiskSettings) => Partial<RiskSettings>;
  describe: (s: RiskSettings) => { field: string; from: string; to: string }[];
}

const PRESETS: TrainingPreset[] = [
  {
    phrase: "Be more careful",
    apply: (s) => ({
      maxTradeAllocationPercent: clamp(s.maxTradeAllocationPercent - 1, 0.5, 10),
      signalThresholdBoost: clamp(s.signalThresholdBoost + 6, -20, 30),
    }),
    describe: (s) => [
      { field: "Max allocation", from: `${s.maxTradeAllocationPercent}%`, to: `${clamp(s.maxTradeAllocationPercent - 1, 0.5, 10)}%` },
      { field: "Min opportunity score", from: `+${s.signalThresholdBoost}`, to: `+${clamp(s.signalThresholdBoost + 6, -20, 30)}` },
    ],
  },
  {
    phrase: "Stop chasing pumps",
    apply: (s) => ({ maxChaseExtensionPercent: clamp(s.maxChaseExtensionPercent - 8, 5, 60) }),
    describe: (s) => [
      { field: "Max 1h extension allowed", from: `${s.maxChaseExtensionPercent}%`, to: `${clamp(s.maxChaseExtensionPercent - 8, 5, 60)}%` },
    ],
  },
  {
    phrase: "Be more patient",
    apply: (s) => ({ signalThresholdBoost: clamp(s.signalThresholdBoost + 3, -20, 30) }),
    describe: (s) => [
      { field: "Min opportunity score", from: `+${s.signalThresholdBoost}`, to: `+${clamp(s.signalThresholdBoost + 3, -20, 30)}` },
    ],
  },
  {
    phrase: "Explore more",
    apply: (s) => ({ signalThresholdBoost: clamp(s.signalThresholdBoost - 5, -20, 30) }),
    describe: (s) => [
      { field: "Min opportunity score", from: `+${s.signalThresholdBoost}`, to: `+${clamp(s.signalThresholdBoost - 5, -20, 30)}` },
    ],
  },
];

export function TrainingPanel({ settings, onApply }: { settings: RiskSettings; onApply: (patch: Partial<RiskSettings>) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {PRESETS.map((preset) => {
        const changes = preset.describe(settings);
        return (
          <div key={preset.phrase} className="chunky-border bg-ink-raised rounded-lg p-3 flex flex-col gap-2">
            <p className="font-display font-bold text-sm text-cream">&ldquo;{preset.phrase}&rdquo;</p>
            <div className="font-mono text-[11px] text-muted-foreground space-y-0.5">
              {changes.map((c) => (
                <p key={c.field}>
                  {c.field}: <span className="text-cream">{c.from}</span> → <span className="text-acid">{c.to}</span>
                </p>
              ))}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="mt-auto font-mono text-xs uppercase tracking-wider border-border"
              onClick={() => onApply(preset.apply(settings))}
            >
              Train
            </Button>
          </div>
        );
      })}
    </div>
  );
}
