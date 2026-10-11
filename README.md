# CATFOODING

**Raise a cat. Let it hunt.**

A cat that is the interface to a rules engine for tokenized stocks. Its pose, vitals, level and verdicts are not decoration: each one is a reading.

Tokenized stocks trade around the clock on several chains, from several issuers, beside look-alike tokens that copy their names. Catfooding shows one verdict per token (**refuse**, **wait**, **watch** or **hunt**) and every check behind it, on **Solana** and **X Layer**.

Live at **https://app.catfooding.com**.

The app has two modes, switched at the top of the cat's room:

- **Live** reads the public [CoAgentic Markets](https://coagentic.markets) feeds and shows what the real engine sees: its verdicts, its book and its fills. The cat places no trades.
- **Demo** runs a simulated market in the browser and lets the cat paper-trade it. No network calls, no API keys.

## Quick start

```bash
npm install
cp .env.example .env
npx prisma db push      # creates prisma/dev.db
npm run dev
```

Open the URL it prints and click **Adopt a cat**, or **Watch the hunt** for an instant demo cat. Then switch the room to **● Live**.

## What is in this repository, and what is not

This repository is the **app**: the interface, the verdict rules it applies, and the server route that reads the engine's public feeds. It runs as it stands against those feeds.

The **engine** behind the feeds (CoAgentic Markets: the collectors, the rules gate, the AI Councils, the wallet and execution) is a separate, private codebase. What it publishes is public and checkable; see [How to verify](#how-to-verify).

## Live mode

The CoAgentic feeds send no CORS header, so the browser cannot read them directly. `src/app/api/engine/route.ts` reads them server-side and returns only the fields the cat needs. It reads fresh on every request (a 30-second shared copy at the CDN), so a verdict is never an old one served as current. Set `COAGENTIC_FEED_BASE` to point it at another origin.

Everything the cat shows is derived in `src/lib/live/engine.ts`, which is pure and has no side effects.

**Chains.** A switch beside the token list shows **X Layer** or **Solana**, one at a time. Both show the same six stocks from the same issuer, judged by the same rules, so a difference between them is the chain. The book, activity, vitals and the cat's pose follow the switch. The calendar, macro view and engine pulse are shared: they are about the stocks and the engine, not a chain.

**Verdicts.** Each tokenized stock gets one verdict from a fixed rule table, checked in this order:

| Condition | Verdict |
|---|---|
| Engine reading stale, token not tradable, price more than 1% from the real share, or a reading missing | REFUSE |
| Real share not trading (the token still trades 24/7, but a fair price cannot be proven) | WAIT |
| Calendar hold active for a market event | WAIT |
| That stock's own earnings window is open | WAIT, for that token only |
| The gate is not approving | WAIT |
| Tradable, fairly priced, gate approves, strong trend | HUNT |
| Otherwise | WATCH |

Every check is shown per token. Tokens sharing a verdict fold into one row. A token with its own problem stands alone, except that two or more tokens refused on price fold into one row giving the range.

**Crypto satellite.** ETH and OKB on X Layer; ETH and SOL on Solana. These are judged by a shorter rule: there is no real share behind them, so the fair-price checks do not apply. ETH on Solana is a bridged token, so it must also hold its price against ETH.

**Vitals.** Health is distance from target weights, energy is the reserve, hunger is the size of the staged buys, focus is data freshness, confidence is the Council's, caution is the macro view plus any calendar hold. A book still being built reads as "initialising" and is judged on the legs it holds.

**Level.** Recounted from the public feeds on every read, starting when the book went live: on-chain fills on either chain, scheduled events waited through, macro views published and resolved. Nothing is stored or self-reported.

**Reasoning.** The Gate tile opens the Council's Bull, Bear and Risk arguments; the Macro view tile opens the published macro hypothesis and its draft successor. The gate decides; the Councils are advisory.

**Book.** The real holdings by sleeve (tokenized stocks, crypto satellite, reserve) against their target weights, per chain, with the staged plan and an index backtest that is labelled as not being the book's own returns.

**Engine pulse.** One heartbeat per product for the scheduled jobs behind every reading. A bar fills as the wait for the next run passes and stops pulsing if a job is late or failed.

**Calendar.** A six-week strip of the days on which new buying is held, for market events and for each stock's earnings.

Not built yet: the cat paying for its feed over x402, and verifying a published hash before eating.

## How to verify

Nothing here asks to be taken on trust.

- **The feeds are public.** Everything Live mode shows comes from `https://tv.coagentic.markets/api/public/…`: `tei` (engine state), `calendar`, `book`, `trades`, `trades-solana`, `lab-venue` (the same stocks across chains), `issuer-check`, `pulse`. Open any of them in a browser.
- **The rules are in this repository.** `verdictFor` in `src/lib/live/engine.ts` is the whole verdict table. Feed it a token and an engine state and it returns the verdict and every check.
- **Whether a token is the issuer's own is read from the chain.** On Solana that is the token's mint authority. For example, for NVDAx:

  ```bash
  curl -s https://api.mainnet-beta.solana.com -H 'content-type: application/json' -d \
    '{"jsonrpc":"2.0","id":1,"method":"getAccountInfo","params":["Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh",{"encoding":"jsonParsed"}]}' \
    | grep -o '"mintAuthority":"[^"]*"'
  ```

  Every genuine xStocks token on Solana returns the same authority. A look-alike with the same name does not.
- **Fills are on-chain.** Each fill in the `trades` and `trades-solana` feeds carries its transaction hash.

## Demo mode

- **Deterministic engines** (`src/lib/engine/`): SignalEngine (personality-weighted opportunity scoring), RiskEngine (hard veto authority; it can only shrink or veto, never propose), DecisionEngine, vitals, XP awards, memory formation, and a template-based narrator.
- **Mock market simulator** (`src/lib/market/`): the six index xStocks (NVDAx, AAPLx, TSLAx, SPCXx, MSTRx, CRCLx) with smoothed random-walk metrics, a regime classifier, and scenario buttons (bull, bear, volatility spike, liquidity collapse, winning and losing setups, trap). Prices here are invented.
- **Game loop** (`src/lib/simulation/simulationEngine.ts`): marks positions to market, checks exits, updates vitals, levels up, and routes decisions through three autonomy modes (Paper Observer, Ask Me, Autonomous Paper).
- **Persistence**: the simulation runs in the browser (Zustand, persisted to localStorage). `/api/cats` syncs to Prisma + SQLite as a best-effort durability layer; on serverless hosting that database does not persist, and the app does not depend on it.

## Tech stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · shadcn/ui on **Base UI** (`render` prop, not `asChild`) · React Three Fiber · Framer Motion · Zustand · Prisma 7 with SQLite · Recharts · Zod.

## Built for

Colosseum Crypto World's Fair (September to October 2026). The repository began on 7 September 2026 as the landing page for a Bangkok meetup; the app itself was built from 21 September onward, inside the event window, and the multi-chain work (Solana readings, the chain switch, earnings holds, the engine pulse) in October.

Nothing here is investment advice.
