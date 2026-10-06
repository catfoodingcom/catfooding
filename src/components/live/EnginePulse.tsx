"use client";

import type { LivePulse, LivePulseJob, PulseStatus } from "@/lib/live/engine";
import { TileDialog } from "./Reasoning";

const TONE: Record<PulseStatus, { fill: string; text: string; word: string }> = {
  ok: { fill: "bg-acid", text: "text-acid", word: "on time" },
  running: { fill: "bg-info", text: "text-info", word: "running now" },
  overdue: { fill: "bg-[#ffd23f]", text: "text-[#ffd23f]", word: "overdue" },
  failed: { fill: "bg-[#ff5d5d]", text: "text-[#ff9d9d]", word: "last run failed" },
  unknown: { fill: "bg-muted-foreground", text: "text-muted-foreground", word: "no schedule read" },
};
// a heartbeat only for a job that is on time or running; anything else holds still
const beats = (s: PulseStatus) => s === "ok" || s === "running";

function span(ms: number) {
  const m = Math.round(Math.abs(ms) / 60000);
  if (m < 1) return "under 1m";
  if (m < 60) return `${m}m`;
  if (m < 1440) return `${Math.floor(m / 60)}h ${m % 60}m`;
  return `${Math.floor(m / 1440)}d ${Math.floor((m % 1440) / 60)}h`;
}
function every(sec: number) {
  if (sec === 604800) return "weekly";
  if (sec === 86400) return "daily";
  return sec % 3600 === 0 ? `every ${sec / 3600}h` : `every ${sec / 60}m`;
}
const due = (j: LivePulseJob, now: number) => (j.nextRun ? (Date.parse(j.nextRun) > now ? `in ${span(Date.parse(j.nextRun) - now)}` : "due now") : "not scheduled");
const progress = (j: LivePulseJob, now: number) => (j.nextRun && j.everySec ? Math.min(1, Math.max(0, 1 - (Date.parse(j.nextRun) - now) / (j.everySec * 1000))) : 0);

function Beat({ status }: { status: PulseStatus }) {
  return (
    <span className="relative inline-flex h-1.5 w-1.5 shrink-0">
      {beats(status) && <span className={`absolute inline-flex h-full w-full rounded-full opacity-60 motion-safe:animate-ping ${TONE[status].fill}`} />}
      <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${TONE[status].fill}`} />
    </span>
  );
}

function Bar({ job, now }: { job: LivePulseJob; now: number }) {
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-border" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress(job, now) * 100)} aria-label={`${job.label}: next run ${due(job, now)}`}>
      <div className={`h-full rounded-full ${TONE[job.status].fill} ${beats(job.status) ? "motion-safe:animate-pulse" : ""}`} style={{ width: `${progress(job, now) * 100}%` }} />
    </div>
  );
}

/** The engine's heartbeat: one beat per product for the scheduled jobs that keep the readings
 * above fresh. Each bar fills as the wait for the next run passes, and pulses only while that
 * job is on time. Opens to every job. `asOf` is when the app last read the engine. */
export function EnginePulse({ pulse, asOf }: { pulse: LivePulse | null; asOf: string }) {
  if (!pulse) return null;
  const now = Date.parse(asOf);
  const all = pulse.groups.flatMap((g) => g.jobs);
  const onTime = all.filter((j) => beats(j.status)).length;
  return (
    <TileDialog
      title="Engine pulse"
      description="Every reading the cat shows comes from a scheduled job. Each bar fills as the wait for the next run passes. A job that is late or failed stops pulsing."
      tile={
        <div className="rounded-lg border border-border bg-ink p-2 font-mono text-[10px]">
          <div className="flex items-center justify-between gap-2">
            <span className="uppercase tracking-wider text-muted-foreground">Engine pulse</span>
            <span className={onTime === all.length ? "text-muted-foreground" : "text-[#ffd23f]"}>
              {onTime} of {all.length} jobs on time · tap for each
            </span>
          </div>
          <div className="mt-2 grid grid-cols-5 gap-2">
            {pulse.groups.map((g) => {
              const lead = g.jobs.find((j) => j.id === g.nextJob) ?? g.jobs[0];
              return (
                <div key={g.id} className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Beat status={g.status} />
                    <span className="truncate text-cream">{g.name}</span>
                  </div>
                  {lead && <div className="mt-1.5"><Bar job={lead} now={now} /></div>}
                  {lead && <p className="mt-1 hidden truncate text-[9px] text-muted-foreground sm:block">{lead.label} {due(lead, now)}</p>}
                </div>
              );
            })}
          </div>
        </div>
      }
    >
      {pulse.groups.map((g) => (
        <div key={g.id} className="rounded-lg border border-border bg-ink p-2.5">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-cream">
            <Beat status={g.status} />
            {g.name}
          </div>
          <ul className="mt-2 space-y-2.5">
            {g.jobs.map((j) => (
              <li key={j.id} className="font-mono text-[10px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-cream/85">
                    {j.label}
                    {j.note && <span className="ml-1.5 text-muted-foreground">({j.note})</span>}
                  </span>
                  <span className="text-muted-foreground">{every(j.everySec)}</span>
                </div>
                <div className="mt-1"><Bar job={j} now={now} /></div>
                <p className="mt-1 text-[9px] text-muted-foreground">
                  <span className={TONE[j.status].text}>{TONE[j.status].word}</span> · next {due(j, now)}
                  {j.lastRun ? ` · last ran ${span(now - Date.parse(j.lastRun))} ago` : " · not run since the last restart"}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </TileDialog>
  );
}
