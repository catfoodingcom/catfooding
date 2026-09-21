"use client";

import Link from "next/link";
import { toast } from "sonner";
import { useCatFoodStore } from "@/lib/store/useCatFoodStore";
import { useRequireCat } from "@/lib/hooks/useRequireCat";
import { AutonomySelector } from "@/components/settings/AutonomySelector";
import { TrainingPanel } from "@/components/settings/TrainingPanel";
import { Slider } from "@/components/ui/slider";

export default function SettingsPage() {
  const { sim } = useRequireCat();
  const setAutonomyMode = useCatFoodStore((s) => s.setAutonomyMode);
  const updateRiskSettings = useCatFoodStore((s) => s.updateRiskSettings);

  if (!sim) return null;
  const { cat, riskSettings } = sim;

  function apply(patch: Partial<typeof riskSettings>) {
    updateRiskSettings(patch);
    toast(`${cat.name} is learning.`, { description: "Risk parameters updated." });
  }

  return (
    <div className="min-h-screen bg-ink crt-scanlines px-4 py-6 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link href="/room" className="font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-cream">
          ← Back to room
        </Link>

        <div>
          <h1 className="font-display text-2xl font-bold">Training {cat.name}</h1>
          <p className="font-mono text-xs text-muted-foreground mt-1">
            Technical settings, translated into cat-training language. Every button below shows the exact parameter it changes — nothing
            important hides behind vague language.
          </p>
        </div>

        <section className="chunky-border bg-ink-raised rounded-2xl p-4 space-y-3">
          <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Autonomy mode</h2>
          <AutonomySelector value={cat.autonomyMode} onChange={setAutonomyMode} />
        </section>

        <section className="chunky-border bg-ink-raised rounded-2xl p-4 space-y-3">
          <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Training phrases</h2>
          <TrainingPanel settings={riskSettings} onApply={apply} />
        </section>

        <section className="chunky-border bg-ink-raised rounded-2xl p-4 space-y-5">
          <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Hard risk limits</h2>

          <SliderRow
            label="Max trade allocation"
            value={riskSettings.maxTradeAllocationPercent}
            min={0.5}
            max={10}
            step={0.5}
            unit="%"
            onChange={(v) => apply({ maxTradeAllocationPercent: v })}
          />
          <SliderRow
            label="Max open positions"
            value={riskSettings.maxOpenPositions}
            min={1}
            max={10}
            step={1}
            onChange={(v) => apply({ maxOpenPositions: v })}
          />
          <SliderRow
            label="Max daily loss"
            value={riskSettings.maxDailyLossPercent}
            min={1}
            max={20}
            step={0.5}
            unit="%"
            onChange={(v) => apply({ maxDailyLossPercent: v })}
          />
          <SliderRow
            label="Max portfolio drawdown"
            value={riskSettings.maxPortfolioDrawdownPercent}
            min={5}
            max={40}
            step={1}
            unit="%"
            onChange={(v) => apply({ maxPortfolioDrawdownPercent: v })}
          />
          <SliderRow
            label="Minimum liquidity"
            value={riskSettings.minimumLiquidity}
            min={50_000}
            max={2_000_000}
            step={50_000}
            unit=""
            format={(v) => `$${(v / 1000).toFixed(0)}k`}
            onChange={(v) => apply({ minimumLiquidity: v })}
          />
          <SliderRow
            label="Maximum token risk score"
            value={riskSettings.maximumTokenRiskScore}
            min={20}
            max={90}
            step={5}
            onChange={(v) => apply({ maximumTokenRiskScore: v })}
          />
        </section>
      </div>
    </div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  unit = "",
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">
        <span>{label}</span>
        <span className="text-acid normal-case">{format ? format(value) : `${value}${unit}`}</span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : v)}
      />
    </div>
  );
}
