import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";

// Single anonymous local profile for the MVP — see spec's "local
// anonymous/local profile mode is acceptable" note. A future multi-user
// version would derive this from an auth session instead.
async function getOrCreateLocalProfile() {
  const existing = await prisma.localProfile.findFirst();
  if (existing) return existing;
  return prisma.localProfile.create({ data: {} });
}

const SnapshotSchema = z.object({
  catId: z.string(),
  name: z.string().min(1).max(20),
  archetype: z.enum(["Hunter", "Stalker", "Scholar", "Degen"]),
  personality: z.record(z.string(), z.number()),
  health: z.number(),
  energy: z.number(),
  hunger: z.number(),
  mood: z.number(),
  focus: z.number(),
  confidence: z.number(),
  caution: z.number(),
  xp: z.number(),
  level: z.number(),
  evolutionStage: z.string(),
  lives: z.number(),
  currentState: z.string(),
  currentThought: z.string(),
  autonomyMode: z.string(),
  portfolio: z.object({
    startingCapital: z.number(),
    cash: z.number(),
    realisedPnL: z.number(),
    dailyPnL: z.number(),
    peakPortfolioValue: z.number(),
  }),
});

/**
 * Persists a snapshot of the live (client-side, Zustand-driven) simulation
 * into SQLite via Prisma. The moment-to-moment game loop runs in the
 * browser for responsiveness; this endpoint is the durability layer behind
 * it, called periodically / on significant events (not proven out on every
 * single tick for this MVP).
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = SnapshotSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;
  const profile = await getOrCreateLocalProfile();

  const cat = await prisma.cat.upsert({
    where: { id: data.catId },
    create: {
      id: data.catId,
      profileId: profile.id,
      name: data.name,
      archetype: data.archetype,
      personality: data.personality,
      health: data.health,
      energy: data.energy,
      hunger: data.hunger,
      mood: data.mood,
      focus: data.focus,
      confidence: data.confidence,
      caution: data.caution,
      xp: data.xp,
      level: data.level,
      evolutionStage: data.evolutionStage,
      lives: data.lives,
      currentState: data.currentState,
      currentThought: data.currentThought,
      autonomyMode: data.autonomyMode,
      portfolio: {
        create: {
          startingCapital: data.portfolio.startingCapital,
          cash: data.portfolio.cash,
          realisedPnL: data.portfolio.realisedPnL,
          dailyPnL: data.portfolio.dailyPnL,
          peakPortfolioValue: data.portfolio.peakPortfolioValue,
        },
      },
    },
    update: {
      health: data.health,
      energy: data.energy,
      hunger: data.hunger,
      mood: data.mood,
      focus: data.focus,
      confidence: data.confidence,
      caution: data.caution,
      xp: data.xp,
      level: data.level,
      evolutionStage: data.evolutionStage,
      lives: data.lives,
      currentState: data.currentState,
      currentThought: data.currentThought,
      autonomyMode: data.autonomyMode,
      portfolio: {
        update: {
          cash: data.portfolio.cash,
          realisedPnL: data.portfolio.realisedPnL,
          dailyPnL: data.portfolio.dailyPnL,
          peakPortfolioValue: data.portfolio.peakPortfolioValue,
        },
      },
    },
  });

  return NextResponse.json({ ok: true, catId: cat.id });
}

export async function GET() {
  const profile = await prisma.localProfile.findFirst({
    include: { cats: { include: { portfolio: true } } },
  });
  return NextResponse.json({ profile });
}
