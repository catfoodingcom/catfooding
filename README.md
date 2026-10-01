# CATFOOD

**Raise a cat. Let it hunt.**

A cat that is the interface to a trading engine. Its vitals, mood, level and verdicts are not decoration: each one is a reading.

Live at **https://app.catfooding.com**.

The app has two modes, switched at the top of the cat's room:

- **Live** reads the public [CoAgentic Markets](https://coagentic.markets) feeds for Steward, a tokenized-stock portfolio on X Layer, and shows what the real engine currently says. It is read-only: the cat places no trades and holds no wallet or keys.
- **Demo** runs a simulated market in the browser and lets the cat paper-trade it. No network calls, no API keys.

## Quick start

```bash
npm install
cp .env.example .env
npx prisma db push      # creates prisma/dev.db
npm run dev
```

Open the URL it prints and click **Adopt a cat**, or **Watch the hunt** for an instant demo cat. Then switch the room to **● Live**.

## Live mode

The CoAgentic feeds send no CORS header, so the browser cannot read them directly. `src/app/api/engine/route.ts` reads them server-side (Steward, calendar, Sentinel, book, trades), returns only the fields the cat needs, and is refreshed each minute. Set `COAGENTIC_FEED_BASE` to point it somewhere other than `https://tv.coagentic.markets`.

Everything the cat shows is derived in `src/lib/live/engine.ts`, which is pure and has no side effects.

**Verdicts.** Each tokenized stock gets one verdict from a fixed rule table, checked in this order:

| Condition | Verdict |
|---|---|
| Engine reading stale, token not tradable, price more than 1% from the real share, or a reading missing | REFUSE |
| Real share not trading (the token still trades 24/7, but a fair price cannot be proven) | WAIT |
| Calendar hold active, or the gate is not approving | WAIT |
| Tradable, fairly priced, gate approves, strong trend | HUNT |
| Otherwise | WATCH |

Every check is shown per token. Tokens sharing a verdict fold into one row; a token with its own problem always stands alone.

**Crypto satellite.** ETH and OKB are judged by a shorter rule: there is no real share behind them, so the fair-price checks do not apply, and there is no Oracle depth score.

**Vitals.** Health is distance from target weights, energy is the reserve, hunger is the size of the staged buys, focus is data freshness, confidence is the Council's, caution is the macro view plus any calendar hold.

**Level.** Recounted from the public feeds on every read, starting when the book went live: on-chain fills, scheduled events waited through, macro views published and resolved. Nothing is stored or self-reported.

**Reasoning.** The Gate tile opens the Council's Bull, Bear and Risk arguments; the Macro view tile opens Sentinel's published hypothesis and draft successor. The gate decides; the Council and Sentinel are advisory.

**Book.** The real holdings by sleeve (tokenized stocks, crypto satellite, reserve) against their target weights, the staged plan, and an index backtest that is labelled as not being the book's own returns.

Not built yet: the cat paying for its feed over x402, and verifying the published hash before eating.

## Demo mode

- **Deterministic engines** (`src/lib/engine/`): SignalEngine (personality-weighted opportunity scoring), RiskEngine (hard veto authority; it can only shrink or veto, never propose), DecisionEngine, vitals, XP awards, memory formation, and a template-based narrator.
- **Mock market simulator** (`src/lib/market/`): the six Steward xStocks (NVDAx, AAPLx, TSLAx, SPCXx, MSTRx, CRCLx) with smoothed random-walk metrics, a regime classifier, and scenario buttons (bull, bear, volatility spike, liquidity collapse, winning and losing setups, trap). Prices here are invented.
- **Game loop** (`src/lib/simulation/simulationEngine.ts`): marks positions to market, checks exits, updates vitals, levels up, and routes decisions through three autonomy modes (Paper Observer, Ask Me, Autonomous Paper).
- **Persistence**: the simulation runs in the browser (Zustand, persisted to localStorage). `/api/cats` syncs to Prisma + SQLite as a best-effort durability layer; on serverless hosting that database does not persist, and the app does not depend on it.

## Tech stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · shadcn/ui on **Base UI** (`render` prop, not `asChild`) · React Three Fiber · Framer Motion · Zustand · Prisma 7 with SQLite · Recharts · Zod.

Nothing here is investment advice.
