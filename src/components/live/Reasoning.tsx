"use client";

import type { ReactNode } from "react";
import type { LiveGate, LiveHypothesis, LiveSentinel } from "@/lib/live/engine";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const day = (iso: string | null) => (iso ? `${iso.slice(0, 10)}${iso.length > 10 ? ` ${iso.slice(11, 16)} UTC` : ""}` : "unknown");
const shortHash = (h: string | null) => (h ? `${h.slice(0, 10)}…${h.slice(-6)}` : null);

/** A fact tile that opens the reasoning behind it. */
function TileDialog({ tile, title, description, children }: { tile: ReactNode; title: string; description: string; children: ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger render={<button type="button" className="text-left rounded-lg hover:ring-1 hover:ring-acid/50 focus-visible:ring-1 focus-visible:ring-acid outline-none" />}>
        {tile}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto bg-ink-raised">
        <DialogHeader>
          <DialogTitle className="font-display">{title}</DialogTitle>
          <DialogDescription className="font-mono text-[10px] leading-relaxed">{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">{children}</div>
      </DialogContent>
    </Dialog>
  );
}

function Voice({ label, color, text, open = false }: { label: string; color: string; text: string | null; open?: boolean }) {
  if (!text) return null;
  return (
    <details open={open} className="rounded-lg border border-border bg-ink">
      <summary className={`cursor-pointer list-none p-2.5 font-mono text-[10px] uppercase tracking-wider ${color}`}>{label}</summary>
      <p className="border-t border-border p-2.5 font-mono text-[11px] text-cream/85 leading-relaxed">{text}</p>
    </details>
  );
}

/** Why the gate says what it says: the rule's own reason first, then the
 * Council's Bull, Bear and Risk arguments. The Council advises; the gate decides. */
export function GateReasoning({ gate, tile }: { gate: LiveGate; tile: ReactNode }) {
  const c = gate.council;
  return (
    <TileDialog tile={tile} title={`Gate: ${gate.decision ?? "unknown"}`} description="The deterministic gate decides. The Council argues the case and is advisory only.">
      {gate.rationale.map((r) => (
        <p key={r} className="rounded-lg border border-[#ffd23f]/40 bg-[#ffd23f]/5 p-2.5 font-mono text-[11px] text-cream/90 leading-relaxed">
          <span className="text-[#ffd23f] uppercase text-[10px] tracking-wider">Rule · </span>
          {r}
        </p>
      ))}
      {!c ? (
        <p className="font-mono text-xs text-muted-foreground">No Council deliberation available.</p>
      ) : (
        <>
          <p className="font-mono text-[10px] text-muted-foreground pt-1">
            Council stance: <span className="text-cream">{c.stance ?? "unknown"}</span> · confidence <span className="text-cream">{c.confidence ?? "unknown"}</span> ·
            deliberated {day(c.asof)}
          </p>
          <Voice label="⚖ Synthesis" color="text-cream" text={c.synthesis} open />
          <Voice label="🐂 Bull" color="text-acid" text={c.bull} />
          <Voice label="🐻 Bear" color="text-[#ff9d9d]" text={c.bear} />
          <Voice label="🛡 Risk" color="text-[#ffd23f]" text={c.risk} />
          {c.keyRisks.length > 0 && (
            <details className="rounded-lg border border-border bg-ink">
              <summary className="cursor-pointer list-none p-2.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Key risks · {c.keyRisks.length}
              </summary>
              <ul className="border-t border-border p-2.5 space-y-1.5 font-mono text-[11px] text-cream/85 leading-relaxed list-disc pl-6">
                {c.keyRisks.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
      <p className="font-mono text-[9px] text-muted-foreground">Advisory multi-agent commentary. Not investment advice.</p>
    </TileDialog>
  );
}

function View({ h }: { h: LiveHypothesis }) {
  return (
    <div className="space-y-2 font-mono text-[11px] text-cream/85 leading-relaxed">
      {h.expects && (
        <p>
          <span className="text-acid uppercase text-[10px] tracking-wider">Expects · </span>
          {h.expects}
        </p>
      )}
      {h.falsifier && (
        <p>
          <span className="text-[#ff9d9d] uppercase text-[10px] tracking-wider">Wrong if · </span>
          {h.falsifier}
        </p>
      )}
      {h.watching.length > 0 && (
        <div>
          <span className="text-[#5fd0ff] uppercase text-[10px] tracking-wider">Watching</span>
          <ul className="list-disc pl-5 space-y-1 mt-1">
            {h.watching.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Sentinel's macro view: what it expects, what would prove it wrong, the
 * draft successor, and how past views resolved. */
export function MacroReasoning({ sentinel, tile }: { sentinel: LiveSentinel | null; tile: ReactNode }) {
  if (!sentinel) return <>{tile}</>;
  const c = sentinel.candidate;
  return (
    <TileDialog
      tile={tile}
      title={`Macro view: ${sentinel.posture ?? "unknown"}`}
      description="Sentinel publishes a falsifiable macro view with an expiry. It is context for the Council, not a trading control."
    >
      <details open className="rounded-lg border border-border bg-ink">
        <summary className="cursor-pointer list-none p-2.5 font-mono text-[10px] uppercase tracking-wider text-cream">
          Published view · {sentinel.posture} · {sentinel.confidence} confidence
          {sentinel.expired && <span className="ml-2 text-[#ffd23f]">window closed</span>}
        </summary>
        <div className="border-t border-border p-2.5 space-y-2">
          <View h={sentinel} />
          <p className="font-mono text-[9px] text-muted-foreground">
            Published {day(sentinel.published)} · evaluated until {day(sentinel.expires)}
            {sentinel.hash && ` · hash ${shortHash(sentinel.hash)}`}
          </p>
        </div>
      </details>

      {c && (
        <details className="rounded-lg border border-dashed border-[#ffd23f]/50 bg-ink">
          <summary className="cursor-pointer list-none p-2.5 font-mono text-[10px] uppercase tracking-wider text-[#ffd23f]">
            Council draft successor · {c.posture} · no authority until a human promotes it
          </summary>
          <div className="border-t border-border p-2.5 space-y-2">
            {c.assessment && (
              <p className="font-mono text-[11px] text-cream/85 leading-relaxed">
                <span className="uppercase text-[10px] tracking-wider text-muted-foreground">
                  Published view&apos;s kill condition: {c.falsifierTripped == null ? "unknown" : c.falsifierTripped ? "tripped" : "not tripped"} ·{" "}
                </span>
                {c.assessment}
              </p>
            )}
            <View h={c} />
            <p className="font-mono text-[9px] text-muted-foreground">
              Drafted {day(c.asof)}
              {c.hash && ` · hash ${shortHash(c.hash)}`}
            </p>
          </div>
        </details>
      )}

      {sentinel.record.length > 0 && (
        <details className="rounded-lg border border-border bg-ink">
          <summary className="cursor-pointer list-none p-2.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Past views · {sentinel.record.length}
          </summary>
          <div className="border-t border-border p-2.5 space-y-1 font-mono text-[11px]">
            {sentinel.record.map((r) => (
              <div key={`${r.published}-${r.posture}`} className="flex justify-between gap-2">
                <span className="text-cream/85">
                  {r.posture} · {r.published?.slice(0, 10)} to {r.expires?.slice(0, 10)}
                </span>
                <span className={r.outcome === "confirmed" ? "text-acid" : r.outcome === "invalidated" ? "text-[#ff9d9d]" : "text-muted-foreground"}>
                  {r.outcome ?? "open"}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}
      <p className="font-mono text-[9px] text-muted-foreground">Durable macro state, not investment advice.</p>
    </TileDialog>
  );
}
