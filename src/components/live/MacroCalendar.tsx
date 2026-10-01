"use client";

import type { EngineState, LiveCalendarEvent } from "@/lib/live/engine";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const IMPACT_COLOR: Record<string, string> = {
  high: "text-[#ff9d9d] border-[#ff5d5d]/50",
  medium: "text-[#ffd23f] border-[#ffd23f]/50",
  low: "text-muted-foreground border-border",
};

const when = (iso: string) => `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;

function countdown(inHours: number | null) {
  if (inHours == null) return "";
  if (inHours < 0) return "now";
  return inHours < 48 ? `in ${Math.round(inHours)}h` : `in ${Math.round(inHours / 24)}d`;
}

function EventRow({ e, open }: { e: LiveCalendarEvent; open: boolean }) {
  const figures = [
    e.previous != null && `previous ${e.previous}${e.unit ?? ""}`,
    e.forecast != null && `forecast ${e.forecast}${e.unit ?? ""}`,
    e.actual != null && `actual ${e.actual}${e.unit ?? ""}`,
  ].filter(Boolean);
  return (
    <details open={open} className="rounded-lg border border-border bg-ink">
      <summary className="cursor-pointer list-none p-2.5 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="font-display text-sm font-bold text-cream">
            {e.event}
            {e.hold?.active && <span className="ml-2 font-mono text-[9px] uppercase text-[#ffd23f]">⏳ holding</span>}
          </span>
          <span className={`rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase ${IMPACT_COLOR[e.impact ?? "low"] ?? IMPACT_COLOR.low}`}>
            {e.impact ?? "n/a"}
          </span>
        </div>
        <div className="font-mono text-[10px] text-muted-foreground">
          {e.date} · {e.timeUtc ? `${e.timeUtc} UTC` : "time not fixed"} · {e.region ?? ""} · {countdown(e.inHours)}
        </div>
      </summary>
      <div className="border-t border-border p-2.5 space-y-1 font-mono text-[10px] text-cream/80 leading-relaxed">
        {e.series && <p>{e.series}</p>}
        {e.note && <p>{e.note}</p>}
        {figures.length > 0 && <p className="text-muted-foreground">{figures.join(" · ")}</p>}
        {e.hold && (
          <p className="text-[#ffd23f]">
            No new buying from {when(e.hold.from)} to {when(e.hold.to)}
            {e.hold.wholeDay ? " (whole day: release time not fixed)" : ""}.
          </p>
        )}
      </div>
    </details>
  );
}

/** The macro calendar the gate reads: each event opens to show what it is and
 * the window in which the engine holds off adding risk. */
export function MacroCalendar({ calendar }: { calendar: EngineState["calendar"] }) {
  return (
    <Dialog>
      <DialogTrigger render={<Button size="sm" variant="outline" className="font-mono text-[10px] uppercase border-border" />}>
        📅 Macro calendar
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto bg-ink-raised">
        <DialogHeader>
          <DialogTitle className="font-display">Macro calendar</DialogTitle>
          <DialogDescription className="font-mono text-[10px] leading-relaxed">
            {calendar.rule ?? "Scheduled events the engine holds for."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          {calendar.upcoming.length === 0 && <p className="font-mono text-xs text-muted-foreground">Calendar unavailable right now.</p>}
          {calendar.upcoming.map((e, i) => (
            <EventRow key={`${e.date}-${e.event}`} e={e} open={i === 0} />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
