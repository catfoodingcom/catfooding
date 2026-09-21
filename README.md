# CATFOOD

**Raise a cat. Let it hunt.**

An autonomous AI cat that watches a simulated Solana token market, paper-trades, develops personality and memories, gains XP, and evolves. The cat's vitals (health, energy, hunger, mood, focus, confidence, caution) **are** the trading agent's interface, not a mascot bolted onto a dashboard. **Paper trading only** — no wallet, no real funds, no network calls required to run it.

## Quick start

```bash
npm install
cp .env.example .env
npx prisma db push      # creates prisma/dev.db
npm run dev
```

Open the URL it prints (Next.js will pick 3001+ if 3000 is taken by something else on your machine) and click **Adopt a cat**, or **Watch the hunt** on the landing page for an instant demo-seeded cat.

## What's actually implemented

Everything below is real, working code — not stubs:

- **Deterministic engines** (`src/lib/engine/`): SignalEngine (personality-weighted opportunity scoring), RiskEngine (hard veto authority — see below), DecisionEngine (ties them together with memory-adjusted scoring), vitals (health-from-drawdown, energy costs/regen, mood), XP awards, memory formation, and a template-based `CatNarrator` (deterministic today, designed as an interface an LLM could implement later without touching any consumer).
- **Mock market simulator** (`src/lib/market/`): six-token universe (SOL, JUP, BONK, WIF, PYTH, JTO), stateful smoothed-random-walk metrics (momentum, volatility, volume acceleration, liquidity, risk score), a regime classifier (RISK_ON / NEUTRAL / HIGH_VOLATILITY / RISK_OFF), and dev/demo scenario overrides (bull, bear, vol spike, liquidity collapse, winning/losing setups). Zero API keys required, by design.
- **Full game loop** (`src/lib/simulation/simulationEngine.ts`): every tick marks positions to market, checks stop-loss/take-profit exits, updates vitals, checks for a severe-drawdown "lost a life" event (cooldown, never deletion), levels up, and asks the DecisionEngine what to do next — routed through all three autonomy modes (Paper Observer / Ask Me / Autonomous Paper).
- **Real UI, not a mockup**: Cat Room (the main screen — avatar, room-metaphor stat cards, PREY SPOTTED proposal card with dual character+numeric explanation, activity feed, risk panel), Portfolio (equity chart, positions, trade history, memories, trade detail modal), Settings/Training (autonomy mode, natural-language "training" presets that show the exact before/after parameter change, raw risk sliders), and an adoption flow with a small first-run "emerging" beat.
- **Persistence**: Prisma + SQLite, with an `/api/cats` route the client syncs to periodically. The live simulation runs in the browser (Zustand, `persist`-ed to localStorage) for responsiveness; the DB is the durability layer behind it, not the hot path.

## What's simplified or deferred

Being upfront about scope rather than overclaiming completeness:

- **Cat art** is CSS/SVG (a simple animated face, per the spec's "don't block on final art" guidance), not a sprite sheet or the full 6-stage evolution art — `CatAvatar` swaps expressions by `CatBehaviorState` and would be the place to plug in real art later.
- **Nine lives / cooldown** works (a severe drawdown costs a life and pauses trading), but the cooldown window is a short real-time duration tuned for demoing in one sitting, not a full simulated day.
- **Training panel** wires two real risk levers (`signalThresholdBoost`, `maxChaseExtensionPercent`) plus the existing hard limits — enough to make "be more careful" / "explore more" actually change agent behavior, not just cosmetic copy.
- **Solana integration is interfaces only** — see below. No wallet, no Jupiter calls, nothing that could move real funds.
- Trade history/memory lists aren't paginated; fine for a single demo session, would need it for a long-running cat.

## Architecture for future real execution

`SolanaWalletService`, `JupiterSwapService`, and a real `MarketDataProvider` implementation are **not built** — the codebase is arranged so they could be added without touching the engines:

```
market data → SignalEngine → DecisionEngine → RiskEngine → execution request → Jupiter quote → wallet permission → Solana tx
```

- `MarketDataProvider` (`src/lib/market/MarketDataProvider.ts`) is an interface; `MockMarketDataProvider` is the only implementation. A future API-backed provider implements the same shape.
- The RiskEngine has final authority in the current code already (it can only shrink or veto, never propose) — that doesn't change when execution becomes real. Any real-money version would additionally need spending limits, a token allowlist, transaction simulation, slippage limits, and a dedicated low-balance trading wallet, never the user's primary wallet, and never a private key in frontend code.

## Tech stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · shadcn/ui (this generation is built on **Base UI**, not Radix — `render` prop instead of `asChild`, `delay` instead of `delayDuration`, if you're used to the Radix-based version) · Framer Motion · Zustand (+ `persist`) · Prisma 7 (driver-adapter model — SQLite via `@prisma/adapter-better-sqlite3`) · Recharts · Zod · Lucide.
