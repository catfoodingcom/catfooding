import type { MarketRegime, MarketSnapshot, TokenMetrics, TokenSymbol } from "@/lib/types";
import { TOKEN_UNIVERSE } from "@/lib/types";
import { MockMarketSimulator, type MarketScenario } from "./MockMarketSimulator";

/**
 * Everything that reads market data goes through this interface. The MVP
 * ships MockMarketDataProvider only — the app MUST work with zero API keys.
 * A future PublicApiMarketDataProvider (e.g. Jupiter price API + a DEX
 * aggregator for liquidity) can implement the same shape and be swapped in
 * via getMarketDataProvider() without touching SignalEngine, DecisionEngine,
 * or any UI component.
 */
export interface MarketDataProvider {
  getTokenUniverse(): TokenSymbol[];
  getTokenPrice(symbol: TokenSymbol): number;
  getTokenMetrics(symbol: TokenSymbol): TokenMetrics;
  getAllMetrics(): Record<TokenSymbol, TokenMetrics>;
  getMarketRegime(): MarketRegime;
  /** Advances simulated time by one tick and returns the new snapshot. */
  step(): MarketSnapshot;
  /** Current snapshot without advancing time. */
  getSnapshot(): MarketSnapshot;
  /** Dev/demo hooks — no-ops on a real provider. */
  applyScenario(scenario: MarketScenario, token?: TokenSymbol): void;
}

export class MockMarketDataProvider implements MarketDataProvider {
  private sim: MockMarketSimulator;
  private latest: MarketSnapshot;

  constructor(seed?: number) {
    this.sim = new MockMarketSimulator(seed);
    this.latest = this.sim.getSnapshot();
  }

  getTokenUniverse() {
    return [...TOKEN_UNIVERSE];
  }

  getTokenPrice(symbol: TokenSymbol) {
    return this.latest.tokens[symbol].price;
  }

  getTokenMetrics(symbol: TokenSymbol) {
    return this.latest.tokens[symbol];
  }

  getAllMetrics() {
    return this.latest.tokens;
  }

  getMarketRegime() {
    return this.latest.regime;
  }

  getSnapshot() {
    return this.latest;
  }

  step() {
    this.latest = this.sim.step();
    return this.latest;
  }

  applyScenario(scenario: MarketScenario, token?: TokenSymbol) {
    this.sim.applyScenario(scenario, token);
  }
}
