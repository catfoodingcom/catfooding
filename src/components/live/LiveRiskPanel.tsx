"use client";

import { useState } from "react";
import { Settings } from "lucide-react";
import { MAX_PREMIUM_PCT, STALE_AFTER_MIN, type LiveRisk } from "@/lib/live/engine";

const pctOf = (n: number | null) => (n == null ? "n/a" : `${n}%`);

interface Row {
  label: string;
  value: string;
  danger?: boolean;
}

function Rows({ rows }: { rows: Row[] }) {
  return (
    <>
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">{row.label}</span>
          <span className={row.danger ? "text-[#ff5d5d]" : "text-cream"}>{row.value}</span>
        </div>
      ))}
    </>
  );
}

/** The gate's measurements on the staged plan, beside the limits they are held
 * to. How execution is set up sits behind the gear: it is a setting, not a reading. */
export function LiveRiskPanel({ risk, gate }: { risk: LiveRisk; gate: string | null }) {
  const [showSetup, setShowSetup] = useState(false);
  const overCeiling = risk.stagedBuyPct != null && risk.deployCeilingPct != null && risk.stagedBuyPct > risk.deployCeilingPct;
  // The book is live, but the unattended executor is not: fills so far were human-authorized.
  const unattended = risk.executorMode != null && risk.executorMode !== "dry";

  const readings: Row[] = [
    { label: "Gate", value: gate ?? "unknown" },
    {
      label: "Staged buys",
      value:
        risk.stagedBuyUsd == null
          ? "n/a"
          : `$${risk.stagedBuyUsd.toFixed(2)} · ${pctOf(risk.stagedBuyPct)}${risk.deployCeilingPct != null ? ` / ${risk.deployCeilingPct}%` : ""}`,
      danger: overCeiling,
    },
    { label: "Largest staged leg", value: `${pctOf(risk.largestLegPct)} of book` },
    { label: "Into thin tokens", value: pctOf(risk.thinDeployPct), danger: (risk.thinDeployPct ?? 0) > 0 },
    { label: "Worst price impact", value: pctOf(risk.worstImpactPct) },
    { label: "Legs passing checks", value: `${risk.legsPassing} / ${risk.legsTotal}`, danger: risk.legsPassing < risk.legsTotal },
    { label: "Fair-price limit", value: `±${MAX_PREMIUM_PCT}%` },
    { label: "Reading goes stale", value: `${STALE_AFTER_MIN} min` },
  ];
  const setup: Row[] = [
    {
      label: "Unattended trading",
      value: risk.executorMode === "dry" ? "off (executor in dry-run)" : risk.executorMode ? `on (${risk.executorMode})` : "unknown",
      danger: unattended,
    },
    { label: "How trades happen", value: "human-authorized, agent-operated" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Risk Engine · live gate</h2>
        <button
          type="button"
          onClick={() => setShowSetup((v) => !v)}
          aria-expanded={showSetup}
          aria-label="Execution settings"
          title="Execution settings"
          // An armed executor must never hide behind a closed gear.
          className={`rounded p-1 transition-colors ${unattended ? "text-[#ff5d5d]" : showSetup ? "text-acid" : "text-muted-foreground/60 hover:text-cream"}`}
        >
          <Settings className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="space-y-1.5 font-mono text-[11px]">
        {(showSetup || unattended) && (
          <div className="space-y-1.5 rounded-lg border border-border bg-ink p-2 mb-2">
            <Rows rows={setup} />
            <p className="text-[9px] text-muted-foreground leading-relaxed pt-0.5">
              The book is real; the unattended executor is off, so nothing trades without an approve verdict and a human go-ahead.
            </p>
          </div>
        )}
        <Rows rows={readings} />
        {risk.flags.map((f) => (
          <p key={f} className="text-[10px] text-[#ffd23f]">
            ⚠ {f}
          </p>
        ))}
        <p className="text-[9px] text-muted-foreground pt-1 leading-relaxed">Measured by the gate on the staged plan.</p>
      </div>
    </div>
  );
}
