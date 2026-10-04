import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AgentDecision, Archetype, AutonomyMode, MarketSnapshot, RiskSettings, TokenSymbol } from "@/lib/types";
import { MockMarketDataProvider } from "@/lib/market/MarketDataProvider";
import type { MarketScenario } from "@/lib/market/MockMarketSimulator";
import { createSimulationState, createDemoSeed } from "@/lib/simulation/factory";
import { runTick, acceptProposal, rejectProposal } from "@/lib/simulation/simulationEngine";
import type { SimulationState } from "@/lib/simulation/types";
import { satiateHunger } from "@/lib/engine/vitalsEngine";

export type SimSpeed = "NORMAL" | "FAST";
/** DEMO = the mock market simulator drives the cat. LIVE = the CoAgentic engine
 * feeds do (see lib/live/engine.ts); the simulator is held, not slept. */
export type RoomMode = "DEMO" | "LIVE";
/** How the cat is drawn: the video clips (default) or the 3D models. */
export type CatStyle = "video" | "3d";
const TICK_INTERVAL_MS: Record<SimSpeed, number> = { NORMAL: 6000, FAST: 1500 };

// The market provider is a stateful engine, not plain data — kept outside
// the store proper (Zustand state should stay serializable-ish for easy
// devtools inspection / future persistence).
const marketProvider = new MockMarketDataProvider();

interface CatFoodStore {
  sim: SimulationState | null;
  market: MarketSnapshot | null;
  isRunning: boolean;
  speed: SimSpeed;
  mode: RoomMode;
  catStyle: CatStyle;
  setCatStyle: (style: CatStyle) => void;
  /** False until zustand/persist has finished reading localStorage. Pages
   * that redirect-if-no-cat must wait for this — otherwise a hard reload
   * or direct URL visit bounces a real, saved cat back to /adopt because
   * `sim` briefly reads null before hydration completes. */
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;

  adoptCat: (input: { name: string; archetype: Archetype; startingCapital: number }) => void;
  loadDemo: () => void;
  resetCat: () => void;

  start: () => void;
  pause: () => void;
  setSpeed: (speed: SimSpeed) => void;
  setMode: (mode: RoomMode) => void;
  tick: () => void;
  syncToServer: () => Promise<void>;

  setAutonomyMode: (mode: AutonomyMode) => void;
  approveProposal: () => void;
  declineProposal: () => void;
  updateRiskSettings: (patch: Partial<RiskSettings>) => void;
  feedCat: () => void;
  applyScenario: (scenario: MarketScenario, token?: TokenSymbol) => void;
}

let intervalHandle: ReturnType<typeof setInterval> | null = null;
let tickCounter = 0;
const SYNC_EVERY_N_TICKS = 5;

export const useCatFoodStore = create<CatFoodStore>()(
  persist(
    (set, get) => ({
  sim: null,
  market: marketProvider.getSnapshot(),
  isRunning: false,
  speed: "NORMAL",
  mode: "DEMO",
  catStyle: "video",
  setCatStyle: (catStyle) => set({ catStyle }),
  hasHydrated: false,
  setHasHydrated: (value) => set({ hasHydrated: value }),

  adoptCat: (input) => {
    get().pause();
    set({ sim: createSimulationState(input), market: marketProvider.getSnapshot() });
  },

  loadDemo: () => {
    get().pause();
    set({ sim: createDemoSeed(), market: marketProvider.getSnapshot() });
  },

  resetCat: () => {
    get().pause();
    set({ sim: null });
  },

  start: () => {
    // LIVE mode holds the simulator: the engine drives the cat, not mock ticks
    if (intervalHandle || !get().sim || get().mode === "LIVE") return;
    const sim = get().sim!;
    // wake the cat if it dozed off while paused
    set({ isRunning: true, sim: sim.cat.currentState === "sleeping" ? { ...sim, cat: { ...sim.cat, currentState: "idle" } } : sim });
    intervalHandle = setInterval(() => get().tick(), TICK_INTERVAL_MS[get().speed]);
  },

  pause: () => {
    if (intervalHandle) {
      clearInterval(intervalHandle);
      intervalHandle = null;
    }
    const sim = get().sim;
    // pause = the cat dozes off → the sleepy model (ticks are stopped, so it holds)
    set(sim ? { isRunning: false, sim: { ...sim, cat: { ...sim.cat, currentState: "sleeping" } } } : { isRunning: false });
  },

  setSpeed: (speed) => {
    set({ speed });
    if (get().isRunning) {
      get().pause();
      get().start();
    }
  },

  setMode: (mode) => {
    if (mode === get().mode) return;
    if (mode === "LIVE") {
      // hold the simulator without the pause() doze — the engine drives the cat now
      if (intervalHandle) {
        clearInterval(intervalHandle);
        intervalHandle = null;
      }
      set({ mode, isRunning: false });
    } else {
      set({ mode });
      get().start();
    }
  },

  tick: () => {
    const { sim } = get();
    if (!sim) return;
    const market = marketProvider.step();
    const result = runTick(sim, market);
    set({ sim: result.state, market });

    tickCounter += 1;
    if (tickCounter % SYNC_EVERY_N_TICKS === 0) get().syncToServer();
  },

  syncToServer: async () => {
    const { sim } = get();
    if (!sim) return;
    try {
      await fetch("/api/cats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          catId: sim.cat.id,
          name: sim.cat.name,
          archetype: sim.cat.archetype,
          personality: sim.cat.personality,
          health: sim.cat.health,
          energy: sim.cat.energy,
          hunger: sim.cat.hunger,
          mood: sim.cat.mood,
          focus: sim.cat.focus,
          confidence: sim.cat.confidence,
          caution: sim.cat.caution,
          xp: sim.cat.xp,
          level: sim.cat.level,
          evolutionStage: sim.cat.evolutionStage,
          lives: sim.cat.lives,
          currentState: sim.cat.currentState,
          currentThought: sim.cat.currentThought,
          autonomyMode: sim.cat.autonomyMode,
          portfolio: {
            startingCapital: sim.portfolio.startingCapital,
            cash: sim.portfolio.cash,
            realisedPnL: sim.portfolio.realisedPnL,
            dailyPnL: sim.portfolio.dailyPnL,
            peakPortfolioValue: sim.portfolio.peakPortfolioValue,
          },
        }),
      });
    } catch {
      // Best-effort durability layer — the live experience runs entirely
      // client-side regardless of whether this sync succeeds.
    }
  },

  setAutonomyMode: (mode) => {
    const { sim } = get();
    if (!sim) return;
    set({ sim: { ...sim, cat: { ...sim.cat, autonomyMode: mode } } });
  },

  approveProposal: () => {
    const { sim, market } = get();
    if (!sim || !market) return;
    set({ sim: acceptProposal(sim, market) });
  },

  declineProposal: () => {
    const { sim } = get();
    if (!sim) return;
    set({ sim: rejectProposal(sim) });
  },

  updateRiskSettings: (patch) => {
    const { sim } = get();
    if (!sim) return;
    set({ sim: { ...sim, riskSettings: { ...sim.riskSettings, ...patch } } });
  },

  feedCat: () => {
    const { sim } = get();
    if (!sim) return;
    set({
      sim: {
        ...sim,
        // feeding is a positive beat: clears any refusal, resets to a calm idle (not
        // the celebrating state, whose strong green glow was washing the cat green),
        // lifts mood, logs a green activity line.
        cat: { ...sim.cat, hunger: satiateHunger(sim.cat.hunger, 35), mood: Math.min(100, sim.cat.mood + 8), currentState: "idle" },
        lastRefusal: null,
        activity: [
          { id: `feed_${Date.now()}`, timestamp: Date.now(), icon: "😻", message: `You fed ${sim.cat.name}. Mood up, back on the hunt.`, category: "TRADE" as const },
          ...sim.activity,
        ].slice(0, 200),
      },
    });
  },

      applyScenario: (scenario, token) => {
        marketProvider.applyScenario(scenario, token);
        // TRAP is a DEMO control: rather than wait for the 6s organic loop to maybe
        // pick the trap leg (and be lost among ambient vetoes), inject a distinctive,
        // attributable CRCLx refusal on the spot — REFUSED card + nervous cat + 🙅 line,
        // unmistakably from the click. The market override still applies underneath.
        if (scenario === "TRAP") {
          const sim = get().sim;
          if (!sim) return;
          const sym = (token ?? "CRCLx") as TokenSymbol;
          const refusal: AgentDecision = {
            action: "WATCH",
            token: sym,
            confidence: 0,
            positionSizePercent: 0,
            reasonCodes: ["LIQUIDITY_BELOW_MINIMUM"],
            naturalLanguageReason: `${sim.cat.name} spotted ${sym} running hot — then saw its liquidity collapse below the tradable floor. Trap. Passing.`,
            riskNotes: "LIQUIDITY_BELOW_MINIMUM",
            vetoedByRisk: true,
          };
          set({
            sim: {
              ...sim,
              cat: { ...sim.cat, currentState: "nervous" },
              pendingProposal: null, // clear any PREY-SPOTTED card so the REFUSED card takes the slot
              lastRefusal: refusal,
              activity: [
                { id: `trap_${Date.now()}`, timestamp: Date.now(), icon: "🙅", message: refusal.naturalLanguageReason, category: "RISK" as const },
                ...sim.activity,
              ].slice(0, 200),
            },
          });
        }
        // WINNING_SETUP is the positive counterpart to TRAP: inject a strong PREY-SPOTTED
        // proposal on the spot (the market override below makes its signal bars read strong),
        // so clicking it immediately shows the cat hunting good food — the hunt beat.
        if (scenario === "WINNING_SETUP") {
          const sim = get().sim;
          if (!sim) return;
          const sym = (token ?? "NVDAx") as TokenSymbol;
          const proposal: AgentDecision = {
            action: "BUY",
            token: sym,
            confidence: 84,
            positionSizePercent: 3,
            reasonCodes: ["HIGH_MOMENTUM", "VOLUME_ACCELERATION", "STRONG_LIQUIDITY"],
            naturalLanguageReason: `${sim.cat.name} spotted ${sym} breaking out — strong momentum, volume surging, and deep liquidity to trade it clean.`,
            riskNotes: null,
            vetoedByRisk: false,
          };
          set({
            sim: {
              ...sim,
              cat: { ...sim.cat, currentState: "stalking" },
              lastRefusal: null,
              pendingProposal: proposal,
              activity: [
                { id: `win_${Date.now()}`, timestamp: Date.now(), icon: "🐦", message: `PREY SPOTTED: ${sym}. Awaiting your call.`, category: "TRADE" as const },
                ...sim.activity,
              ].slice(0, 200),
            },
          });
        }
      },
    }),
    {
      name: "catfood-sim",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ sim: state.sim, speed: state.speed, mode: state.mode, catStyle: state.catStyle }),
      onRehydrateStorage: () => (state, error) => {
        if (error) console.error("Failed to rehydrate CATFOOD state:", error);
        // lastRefusal is a transient demo beat — don't carry a stale REFUSED card
        // across a page refresh.
        if (state?.sim) state.sim = { ...state.sim, lastRefusal: null };
        state?.setHasHydrated(true);
      },
    }
  )
);
