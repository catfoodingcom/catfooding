"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { EquityPoint } from "@/lib/simulation/types";

export function EquityChart({ data }: { data: EquityPoint[] }) {
  const chartData = data.map((p) => ({ time: new Date(p.timestamp).toLocaleTimeString(), value: Math.round(p.value * 100) / 100 }));

  // Recharts needs >= 2 points to draw a valid area path — a fresh cat
  // only has its starting-balance point until the first tick lands.
  if (chartData.length < 2) {
    return (
      <div className="h-[220px] flex items-center justify-center font-mono text-xs text-muted-foreground">
        Collecting data — check back after the first tick.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--acid)" stopOpacity={0.4} />
            <stop offset="95%" stopColor="var(--acid)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="time" tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} axisLine={{ stroke: "var(--border)" }} tickLine={false} minTickGap={40} />
        <YAxis tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} domain={["auto", "auto"]} width={56} />
        <Tooltip
          contentStyle={{ background: "var(--ink-raised)", border: "2px solid var(--cream)", borderRadius: 8, fontFamily: "var(--font-mono)", fontSize: 11 }}
          labelStyle={{ color: "var(--muted-foreground)" }}
          itemStyle={{ color: "var(--acid)" }}
        />
        <Area type="monotone" dataKey="value" stroke="var(--acid)" strokeWidth={2} fill="url(#equityFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
