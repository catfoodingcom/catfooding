"use client";

import { useState } from "react";
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

const eventKey = (e: LiveCalendarEvent) => `${e.date}-${e.event}`;
const DAY_MS = 86_400_000;
const WEEKS = 6;
const dayIso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

interface DayCell {
  iso: string;
  day: number;
  /** Shown on the first cell and on each 1st of a month. */
  monthLabel: string | null;
  past: boolean;
  today: boolean;
  /** A "no new buying" window covers at least part of this day (UTC). */
  hold: boolean;
  events: LiveCalendarEvent[];
}

/** Six weeks of days from the Monday of the current week. `now` comes from the engine state,
 * so this stays a pure function of its inputs. */
function buildDays(events: LiveCalendarEvent[], now: number): DayCell[] {
  const today = Date.parse(dayIso(now));
  const weekday = (new Date(today).getUTCDay() + 6) % 7; // Monday = 0
  const start = today - weekday * DAY_MS;
  return Array.from({ length: WEEKS * 7 }, (_, i) => {
    const t = start + i * DAY_MS;
    const iso = dayIso(t);
    const d = new Date(t);
    return {
      iso,
      day: d.getUTCDate(),
      monthLabel: i === 0 || d.getUTCDate() === 1 ? d.toLocaleString("en-GB", { month: "short", timeZone: "UTC" }) : null,
      past: t < today,
      today: t === today,
      hold: events.some((e) => e.hold && Date.parse(e.hold.from) < t + DAY_MS && Date.parse(e.hold.to) > t),
      events: events.filter((e) => e.date === iso),
    };
  });
}

/** The next six weeks at a glance: a box per day, amber where new buying is on hold, a dot
 * where an event falls. The hold is the point: it covers far more days than the events do. */
function HoldStrip({ events, now, onPick }: { events: LiveCalendarEvent[]; now: number; onPick: (key: string) => void }) {
  const days = buildDays(events, now);
  const ahead = days.filter((d) => !d.past);
  const holdDays = ahead.filter((d) => d.hold).length;
  return (
    <div className="rounded-lg border border-border bg-ink p-2.5">
      <div className="grid grid-cols-7 gap-1 font-mono">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <div key={i} className="text-center text-[9px] text-muted-foreground">
            {d}
          </div>
        ))}
        {days.map((d) => {
          const top = d.events.find((e) => e.impact === "high") ?? d.events[0];
          const label = `${d.iso}${d.hold ? " · no new buying" : ""}${d.events.length ? " · " + d.events.map((e) => e.event).join(", ") : ""}`;
          const box = `relative flex h-9 flex-col items-center justify-center rounded text-[10px] ${
            d.hold ? "bg-[#ffd23f]/20 text-[#ffd23f]" : "bg-ink-raised text-cream/70"
          } ${d.past ? "opacity-30" : ""} ${d.today ? "ring-1 ring-acid" : ""}`;
          const inner = (
            <>
              {d.monthLabel && <span className="absolute left-0.5 top-0 text-[7px] uppercase text-muted-foreground">{d.monthLabel}</span>}
              <span>{d.day}</span>
              {top && <span className={`mt-0.5 h-1.5 w-1.5 rounded-full ${top.impact === "high" ? "bg-[#ff5d5d]" : "bg-info"}`} />}
            </>
          );
          return top && !d.past ? (
            <button key={d.iso} type="button" title={label} aria-label={label} onClick={() => onPick(eventKey(top))} className={`${box} hover:ring-1 hover:ring-cream`}>
              {inner}
            </button>
          ) : (
            <div key={d.iso} title={label} className={box}>
              {inner}
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[9px] text-muted-foreground">
        <span>
          <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-[#ffd23f]/40 align-middle" />
          no new buying
        </span>
        <span>
          <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-[#ff5d5d] align-middle" />
          high-impact event
        </span>
        <span>
          <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-info align-middle" />
          other event
        </span>
        <span className="text-cream/80">
          {holdDays} of the next {ahead.length} days are on hold. Days are UTC.
        </span>
      </div>
    </div>
  );
}

function EventRow({ e, open, onToggle }: { e: LiveCalendarEvent; open: boolean; onToggle: (open: boolean) => void }) {
  const figures = [
    e.previous != null && `previous ${e.previous}${e.unit ?? ""}`,
    e.forecast != null && `forecast ${e.forecast}${e.unit ?? ""}`,
    e.actual != null && `actual ${e.actual}${e.unit ?? ""}`,
  ].filter(Boolean);
  return (
    <details id={`cal-${eventKey(e)}`} open={open} onToggle={(ev) => onToggle(ev.currentTarget.open)} className="scroll-mt-2 rounded-lg border border-border bg-ink">
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

/** The macro calendar the gate reads: a six-week strip of hold windows, then each event,
 * which opens to show what it is and the window in which the engine holds off adding risk. */
export function MacroCalendar({ calendar, asOf }: { calendar: EngineState["calendar"]; asOf: string }) {
  // which event rows are open; the next event starts open
  const [open, setOpen] = useState<Record<string, boolean>>(() => (calendar.upcoming[0] ? { [eventKey(calendar.upcoming[0])]: true } : {}));
  const pick = (key: string) => {
    setOpen((o) => ({ ...o, [key]: true }));
    // after the row has opened, bring it into view inside the scrolling panel
    requestAnimationFrame(() => document.getElementById(`cal-${key}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  const now = Date.parse(asOf);
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
          {calendar.upcoming.length > 0 && Number.isFinite(now) && <HoldStrip events={calendar.upcoming} now={now} onPick={pick} />}
          {calendar.upcoming.map((e) => (
            <EventRow key={eventKey(e)} e={e} open={!!open[eventKey(e)]} onToggle={(v) => setOpen((o) => (!!o[eventKey(e)] === v ? o : { ...o, [eventKey(e)]: v }))} />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
