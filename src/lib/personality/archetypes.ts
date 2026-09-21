import type { Archetype, PersonalityTraits } from "@/lib/types";

export const ARCHETYPE_TRAITS: Record<Archetype, PersonalityTraits> = {
  Hunter: { aggression: 70, patience: 35, curiosity: 75, discipline: 65, fear: 30, conviction: 70, adaptability: 70 },
  Stalker: { aggression: 35, patience: 85, curiosity: 45, discipline: 80, fear: 45, conviction: 65, adaptability: 60 },
  Scholar: { aggression: 40, patience: 70, curiosity: 65, discipline: 90, fear: 40, conviction: 60, adaptability: 80 },
  Degen: { aggression: 90, patience: 20, curiosity: 95, discipline: 30, fear: 15, conviction: 80, adaptability: 75 },
};

export const ARCHETYPE_INFO: Record<Archetype, { tagline: string; description: string }> = {
  Hunter: {
    tagline: "Momentum trader",
    description: "Fast to spot a mover, fast to strike. Doesn't wait for confirmation twice.",
  },
  Stalker: {
    tagline: "Patient swing trader",
    description: "Mean-reversion instincts. Watches for a long time before committing.",
  },
  Scholar: {
    tagline: "Systematic technician",
    description: "Trusts the signal, not the vibe. Highest discipline of the four.",
  },
  Degen: {
    tagline: "High-volatility experimenter",
    description: "Curious to a fault. Moves fast, forgives easily, learns the hard way.",
  },
};

export const ARCHETYPES: Archetype[] = ["Hunter", "Stalker", "Scholar", "Degen"];
