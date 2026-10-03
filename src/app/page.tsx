"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CatAvatar3D as CatAvatar } from "@/components/cat/CatAvatar3D";
import { useCatFoodStore } from "@/lib/store/useCatFoodStore";
import { useEngine } from "@/lib/hooks/useEngine";
import { catRead, satelliteVerdictFor, verdictFor, type TokenVerdict } from "@/lib/live/engine";

const FEATURES = [
  { icon: "🐾", label: "Autonomous hunting", desc: "Scans a live token universe every tick and decides for itself." },
  { icon: "🧬", label: "Real personality", desc: "Four archetypes shape risk appetite, patience, and conviction." },
  { icon: "🧠", label: "Memory", desc: "Bad trades leave scars. Good setups get repeated." },
  { icon: "📈", label: "XP & evolution", desc: "Levels 1-50, six evolution stages — rewarded for discipline, not luck." },
  { icon: "🛡", label: "Risk controls", desc: "A deterministic Risk Engine can veto the agent. Always." },
  { icon: "💬", label: "Explainable", desc: "Every trade shown in cat-language and in cold, hard numbers." },
];

export default function LandingPage() {
  const router = useRouter();
  const sim = useCatFoodStore((s) => s.sim);
  const loadDemo = useCatFoodStore((s) => s.loadDemo);
  const start = useCatFoodStore((s) => s.start);
  const hasSavedCat = !!sim;

  // The preview is genuinely live: the pose is the engine's current verdict, never a rotation.
  const { engine, error } = useEngine(true);
  const read = (() => {
    if (!engine?.ok) return null;
    const verdicts: Record<string, TokenVerdict> = {};
    const satellite: Record<string, TokenVerdict> = {};
    for (const t of engine.tokens) verdicts[t.symbol] = verdictFor(t, engine);
    for (const t of engine.satellite) satellite[t.symbol] = satelliteVerdictFor(t, engine);
    return catRead(engine, verdicts, satellite);
  })();

  function watchTheHunt() {
    loadDemo();
    setTimeout(() => start(), 50);
    router.push("/room");
  }

  return (
    <div className="min-h-screen crt-scanlines relative overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 20% 20%, color-mix(in srgb, var(--acid) 8%, transparent), transparent 45%), radial-gradient(circle at 80% 70%, color-mix(in srgb, var(--pink) 8%, transparent), transparent 45%)",
        }}
      />

      <header className="relative z-10 flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <span className="font-display font-bold text-lg tracking-tight">
          CAT<span className="text-acid">FOODING</span>
        </span>
        <span className="font-mono text-[10px] uppercase tracking-widest text-pink border border-pink/50 rounded-full px-3 py-1">
          Beta · Live + Demo
        </span>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-6 pt-10 pb-24 grid gap-12 lg:grid-cols-2 lg:items-center">
        <div className="space-y-6">
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-5xl sm:text-6xl font-bold leading-[0.95] text-shadow-pixel"
          >
            RAISE A CAT.
            <br />
            LET IT <span className="text-acid">HUNT.</span>
          </motion.h1>

          <p className="font-mono text-sm text-muted-foreground max-w-md leading-relaxed">
            A cat that reads the CoAgentic engine for tokenized stocks on X&nbsp;Layer. In <em className="text-cream not-italic">Live</em> it shows the
            engine&apos;s real verdicts and book, read-only. In <em className="text-cream not-italic">Demo</em> it paper-trades a simulated market. Its mood,
            health, and hunger <em className="text-cream not-italic">are</em> the trading agent&apos;s interface.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              size="lg"
              nativeButton={false}
              className="bg-acid text-ink hover:bg-acid-dim font-mono uppercase tracking-wider"
              render={<Link href={hasSavedCat ? "/room" : "/adopt"} />}
            >
              {hasSavedCat ? "Back to your cat" : "Adopt a cat"}
            </Button>
            <Button onClick={watchTheHunt} size="lg" variant="outline" className="font-mono uppercase tracking-wider border-border">
              Watch the hunt
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-3 pt-8">
            {FEATURES.map((f) => (
              <div key={f.label} className="flex items-start gap-2">
                <span>{f.icon}</span>
                <div>
                  <p className="font-mono text-xs text-cream">{f.label}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="chunky-border-acid bg-ink-raised rounded-2xl px-6 pt-10 pb-6 flex flex-col items-center gap-3 relative">
          <span className="absolute top-3 left-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            <span className="text-acid">●</span> live · the engine&apos;s verdict right now
          </span>
          <CatAvatar state={read?.state ?? "curious"} mood={40} size={260} evolutionStage="Hunter" hunger={0} showSvgWhileLoading={false} />
          <p className="font-mono text-xs text-center text-cream/85 leading-relaxed max-w-md min-h-[2.5rem]">
            {read ? (
              <>
                <span className="text-acid uppercase tracking-wider">{read.headline}</span> · {read.thought}
              </>
            ) : error ? (
              "Can't reach the engine right now. The cat won't guess."
            ) : (
              "Reading the engine…"
            )}
          </p>
        </div>
      </main>
    </div>
  );
}
