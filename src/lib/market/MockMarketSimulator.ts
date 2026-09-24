import type { MarketRegime, MarketSnapshot, TokenMetrics, TokenSymbol } from "@/lib/types";
import { TOKEN_UNIVERSE } from "@/lib/types";
import { TOKEN_PROFILES } from "./tokenProfiles";
import { clamp, gaussian, mulberry32 } from "./random";

interface TokenLiveState extends TokenMetrics {
  /** internal smoothing state, not exposed */
  regimeBiasApplied: number;
}

export type MarketScenario = "BULL" | "BEAR" | "VOLATILITY_SPIKE" | "LIQUIDITY_COLLAPSE" | "WINNING_SETUP" | "LOSING_SETUP" | "TRAP";

/**
 * A self-contained, dependency-free market simulator. Produces plausible,
 * continuously-evolving metrics for the fixed token universe with no
 * external API — the app must work with zero keys and zero network calls.
 *
 * Not a tick-by-tick order book: each token carries smoothed, stateful
 * metrics (momentum, volatility, volume acceleration, liquidity) that walk
 * randomly each tick, biased by a slow-moving "regime drift" shared across
 * the whole market. This is intentionally simple — realistic *shape*, not a
 * faithful backtest engine.
 */
const BENCH = TOKEN_UNIVERSE[0]; // depth benchmark for relative strength / regime (was SOL, now NVDAx)

export class MockMarketSimulator {
  private rand: () => number;
  private tick = 0;
  private tokens: Record<TokenSymbol, TokenLiveState>;
  private regimeDrift = 0; // -1 (bearish) .. 1 (bullish), slow random walk
  private volatilityFloor = 0; // scenario override, decays over time
  private scenarioOverrides: Partial<Record<TokenSymbol, { liquidityMult: number; momentumBias: number; ticksRemaining: number }>> = {};

  constructor(seed: number = Date.now()) {
    this.rand = mulberry32(seed);
    this.tokens = Object.fromEntries(
      TOKEN_UNIVERSE.map((symbol) => {
        const profile = TOKEN_PROFILES[symbol];
        return [
          symbol,
          {
            symbol,
            name: profile.name,
            price: profile.basePrice,
            priceChange1h: 0,
            priceChange24h: 0,
            volume24h: profile.baseLiquidity * 1.8,
            volumeAcceleration: 0,
            liquidity: profile.baseLiquidity,
            volatility: 20 * profile.volMultiplier,
            momentum: 0,
            relativeStrength: 0,
            trend: 0,
            riskScore: profile.baseRiskScore,
            regimeBiasApplied: 0,
          },
        ];
      })
    ) as Record<TokenSymbol, TokenLiveState>;
  }

  getSnapshot(): MarketSnapshot {
    const tokens = Object.fromEntries(
      TOKEN_UNIVERSE.map((s) => {
        const { regimeBiasApplied: _unused, ...metrics } = this.tokens[s];
        void _unused;
        return [s, metrics];
      })
    ) as Record<TokenSymbol, TokenMetrics>;

    return {
      regime: this.computeRegime(),
      tokens,
      tick: this.tick,
      timestamp: Date.now(),
    };
  }

  step(): MarketSnapshot {
    this.tick += 1;

    // Regime drift: slow mean-reverting walk, occasionally nudged harder.
    this.regimeDrift = clamp(this.regimeDrift * 0.97 + gaussian(this.rand) * 0.05, -1, 1);
    this.volatilityFloor = Math.max(0, this.volatilityFloor - 1.5);

    const bench = this.tokens[BENCH];

    for (const symbol of TOKEN_UNIVERSE) {
      const t = this.tokens[symbol];
      const profile = TOKEN_PROFILES[symbol];
      const override = this.scenarioOverrides[symbol];

      const momentumBias = this.regimeDrift * 30 + (override?.momentumBias ?? 0);
      t.momentum = clamp(t.momentum * 0.85 + momentumBias * 0.15 + gaussian(this.rand) * 6 * profile.volMultiplier, -100, 100);
      t.trend = clamp(t.trend * 0.95 + t.momentum * 0.05, -100, 100);

      const volTarget = (18 + Math.abs(this.regimeDrift) * 40) * profile.volMultiplier + this.volatilityFloor;
      t.volatility = clamp(t.volatility * 0.8 + volTarget * 0.2 + Math.abs(gaussian(this.rand)) * 4, 5, 100);

      t.volumeAcceleration = clamp(
        t.volumeAcceleration * 0.7 + (Math.abs(t.momentum) / 100) * 40 * (0.5 + this.rand()) + gaussian(this.rand) * 8,
        -100,
        100
      );
      t.volume24h = Math.max(profile.baseLiquidity * 0.3, t.volume24h * (1 + t.volumeAcceleration / 400) * (0.98 + this.rand() * 0.04));

      const liquidityMult = override?.liquidityMult ?? 1;
      const liquidityTarget = profile.baseLiquidity * liquidityMult;
      t.liquidity = t.liquidity * 0.9 + liquidityTarget * 0.1;

      const priceStep = (t.momentum / 100) * 0.008 * profile.volMultiplier + gaussian(this.rand) * 0.004 * profile.volMultiplier;
      t.price = Math.max(profile.basePrice * 0.05, t.price * (1 + priceStep));

      t.priceChange1h = clamp(t.priceChange1h * 0.5 + priceStep * 100 * 6, -60, 80);
      t.priceChange24h = clamp(t.priceChange24h * 0.9 + priceStep * 100 * 2.2, -80, 200);

      const liquidityRisk = clamp(40 - Math.log10(Math.max(1, t.liquidity)) * 4, 0, 40);
      const volRisk = clamp(t.volatility * 0.3, 0, 40);
      t.riskScore = clamp(profile.baseRiskScore * 0.4 + liquidityRisk + volRisk * 0.5, 5, 99);

      if (override) {
        override.ticksRemaining -= 1;
        if (override.ticksRemaining <= 0) delete this.scenarioOverrides[symbol];
      }
    }

    // relative strength vs SOL benchmark, computed after everyone updates
    for (const symbol of TOKEN_UNIVERSE) {
      const t = this.tokens[symbol];
      t.relativeStrength = clamp(t.momentum - (symbol === BENCH ? 0 : bench.momentum) * 0.6, -100, 100);
    }

    return this.getSnapshot();
  }

  computeRegime(): MarketRegime {
    const values = TOKEN_UNIVERSE.map((s) => this.tokens[s]);
    const avgVol = values.reduce((sum, t) => sum + t.volatility, 0) / values.length;
    const avgMomentum = values.reduce((sum, t) => sum + t.momentum, 0) / values.length;
    const breadth = values.filter((t) => t.momentum > 10).length / values.length;

    if (avgVol > 55) return "HIGH_VOLATILITY";
    if (this.tokens[BENCH].momentum > 15 && avgMomentum > 5 && breadth > 0.5) return "RISK_ON";
    if (this.tokens[BENCH].momentum < -15 && avgMomentum < -5) return "RISK_OFF";
    return "NEUTRAL";
  }

  /** Dev/demo controls — see spec's "SIMULATION LOOP" dev controls. */
  applyScenario(scenario: MarketScenario, token?: TokenSymbol) {
    switch (scenario) {
      case "BULL":
        this.regimeDrift = 0.85;
        break;
      case "BEAR":
        this.regimeDrift = -0.85;
        break;
      case "VOLATILITY_SPIKE":
        this.volatilityFloor = 55;
        break;
      case "LIQUIDITY_COLLAPSE": {
        const sym = token ?? TOKEN_UNIVERSE[TOKEN_UNIVERSE.length - 1];
        this.scenarioOverrides[sym] = { liquidityMult: 0.08, momentumBias: -20, ticksRemaining: 12 };
        break;
      }
      case "WINNING_SETUP": {
        // Strong, tradable leg — set the signal immediately (don't wait for the ramp)
        // so the injected PREY-SPOTTED card's bars read strong on click.
        const sym = token ?? TOKEN_UNIVERSE[0];
        const t = this.tokens[sym];
        t.momentum = 82; t.trend = 66; t.volumeAcceleration = 76;
        this.scenarioOverrides[sym] = { liquidityMult: 1.4, momentumBias: 60, ticksRemaining: 24 };
        break;
      }
      case "LOSING_SETUP": {
        const sym = token ?? TOKEN_UNIVERSE[4];
        this.scenarioOverrides[sym] = { liquidityMult: 0.5, momentumBias: -45, ticksRemaining: 20 };
        break;
      }
      case "TRAP": {
        // The "refuse is the proof" beat: a leg that looks STRONG (high momentum →
        // the cat spots it as the best opportunity and proposes it) but whose
        // liquidity sits just BELOW the $250k tradable floor → the Risk Engine vetoes
        // it (LIQUIDITY_BELOW_MINIMUM) → 🙅 in the activity feed, cat turns nervous.
        // Defaults to CRCLx (thinnest). The CoAgentic trap-wrapper, made visible.
        // Set both state variables IMMEDIATELY (don't wait for the smoothed ramp) so
        // it fires on the very next decision tick — and keep an override to hold it.
        const sym = token ?? TOKEN_UNIVERSE[TOKEN_UNIVERSE.length - 1];
        const t = this.tokens[sym];
        t.momentum = 88;              // clearly the best opportunity → proposed
        t.trend = 60;
        t.volumeAcceleration = 72;
        t.liquidity = 199_000;        // below the 250k risk floor → vetoed on proposal
        this.scenarioOverrides[sym] = { liquidityMult: 0.35, momentumBias: 90, ticksRemaining: 30 };
        break;
      }
    }
  }
}
