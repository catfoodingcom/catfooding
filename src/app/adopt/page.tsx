"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import type { Archetype } from "@/lib/types";
import { ARCHETYPES, ARCHETYPE_INFO, ARCHETYPE_TRAITS } from "@/lib/personality/archetypes";
import { useCatFoodStore } from "@/lib/store/useCatFoodStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CatAvatar } from "@/components/cat/CatAvatar";

const BALANCES = [500, 1000, 2500, 5000];

const TRAIT_LABELS: Record<keyof (typeof ARCHETYPE_TRAITS)["Hunter"], string> = {
  aggression: "Aggression",
  patience: "Patience",
  curiosity: "Curiosity",
  discipline: "Discipline",
  fear: "Fear",
  conviction: "Conviction",
  adaptability: "Adaptability",
};

export default function AdoptPage() {
  const router = useRouter();
  const adoptCat = useCatFoodStore((s) => s.adoptCat);

  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [name, setName] = useState("");
  const [archetype, setArchetype] = useState<Archetype | null>(null);
  const [balance, setBalance] = useState(1000);
  const [emerging, setEmerging] = useState(false);

  function confirm() {
    if (!name || !archetype) return;
    setEmerging(true);
    adoptCat({ name, archetype, startingCapital: balance });
    setTimeout(() => router.push("/room"), 1800);
  }

  if (emerging) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-ink crt-scanlines">
        <CatAvatar state="curious" mood={30} size={200} />
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="chunky-border bg-ink-raised rounded-full px-5 py-2 font-mono text-sm text-acid"
        >
          &ldquo;Smells like fresh tape.&rdquo;
        </motion.p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink crt-scanlines px-6 py-10">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          <span className={step >= 0 ? "text-acid" : ""}>1. Name</span>
          <span>—</span>
          <span className={step >= 1 ? "text-acid" : ""}>2. Archetype</span>
          <span>—</span>
          <span className={step >= 2 ? "text-acid" : ""}>3. Capital</span>
        </div>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="name" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <h1 className="font-display text-3xl font-bold">Name your cat</h1>
              <Input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Mochi"
                maxLength={20}
                className="chunky-border bg-ink-raised font-mono text-lg h-14"
                onKeyDown={(e) => e.key === "Enter" && name && setStep(1)}
              />
              <Button disabled={!name} onClick={() => setStep(1)} className="bg-acid text-ink hover:bg-acid-dim font-mono uppercase tracking-wider">
                Next
              </Button>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="archetype" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <h1 className="font-display text-3xl font-bold">Choose an archetype</h1>
              <p className="font-mono text-xs text-muted-foreground">
                Archetypes shape <em className="text-cream not-italic">behaviour</em> — aggression, patience, risk appetite. Not guaranteed returns.
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {ARCHETYPES.map((a) => (
                  <button
                    key={a}
                    onClick={() => setArchetype(a)}
                    className={`text-left rounded-lg border-2 p-4 transition-colors ${
                      archetype === a ? "border-acid bg-acid/10" : "border-border bg-ink-raised hover:border-muted-foreground"
                    }`}
                  >
                    <p className="font-display font-bold text-lg">{a}</p>
                    <p className="font-mono text-[11px] text-muted-foreground mb-2">{ARCHETYPE_INFO[a].description}</p>
                    <div className="space-y-1">
                      {(Object.keys(ARCHETYPE_TRAITS[a]) as (keyof typeof TRAIT_LABELS)[]).map((trait) => (
                        <div key={trait} className="flex items-center gap-2">
                          <span className="w-20 font-mono text-[9px] uppercase text-muted-foreground">{TRAIT_LABELS[trait]}</span>
                          <div className="h-1 flex-1 bg-secondary rounded-full overflow-hidden">
                            <div className="h-full bg-acid" style={{ width: `${ARCHETYPE_TRAITS[a][trait]}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(0)} className="font-mono uppercase tracking-wider border-border">
                  Back
                </Button>
                <Button disabled={!archetype} onClick={() => setStep(2)} className="bg-acid text-ink hover:bg-acid-dim font-mono uppercase tracking-wider">
                  Next
                </Button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="capital" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <h1 className="font-display text-3xl font-bold">Starting capital</h1>
              <p className="font-mono text-xs text-muted-foreground">Virtual USDC. No wallet, no real funds — paper trading only.</p>
              <div className="grid grid-cols-4 gap-2">
                {BALANCES.map((b) => (
                  <button
                    key={b}
                    onClick={() => setBalance(b)}
                    className={`rounded-lg border-2 py-3 font-mono text-sm transition-colors ${
                      balance === b ? "border-acid bg-acid/10 text-acid" : "border-border bg-ink-raised text-cream"
                    }`}
                  >
                    ${b.toLocaleString()}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)} className="font-mono uppercase tracking-wider border-border">
                  Back
                </Button>
                <Button onClick={confirm} className="bg-pink text-ink hover:bg-pink-dim font-mono uppercase tracking-wider">
                  Adopt {name || "cat"}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
