import type { ActivityEvent } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";

const CATEGORY_TINT: Record<ActivityEvent["category"], string> = {
  SYSTEM: "text-cream",
  TRADE: "text-acid",
  RISK: "text-[#ff5d5d]",
  MOOD: "text-pink",
  MEMORY: "text-info",
  LEVEL: "text-[#ffd23f]",
};

function timeAgo(ts: number) {
  const seconds = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  return (
    <ScrollArea className="h-full pr-3">
      <div className="space-y-2">
        {events.length === 0 && <p className="font-mono text-xs text-muted-foreground">Nothing yet. The room is quiet.</p>}
        {events.map((event) => (
          <div key={event.id} className="flex items-start gap-2 font-mono text-xs">
            <span>{event.icon}</span>
            <div className="flex-1">
              <p className={CATEGORY_TINT[event.category]}>
                {event.message}
                {typeof event.xpChange === "number" && <span className="text-acid"> +{event.xpChange} XP</span>}
              </p>
              <p className="text-[10px] text-muted-foreground">{timeAgo(event.timestamp)}</p>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
