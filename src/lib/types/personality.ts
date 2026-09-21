export type Archetype = "Hunter" | "Stalker" | "Scholar" | "Degen";

/** Every trait is 0-100. These shape decision weights, position sizing,
 * confirmation requirements, and exit behaviour — never returns. */
export interface PersonalityTraits {
  aggression: number;
  patience: number;
  curiosity: number;
  discipline: number;
  fear: number;
  conviction: number;
  adaptability: number;
}
