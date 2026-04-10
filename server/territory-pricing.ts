// City population data from U.S. Census Bureau 2024 estimates
// JSON is inlined at build time by esbuild
import populationData from "./city-populations.json";

// Pricing tiers based on population
const PRICING_TIERS = [
  { min: 1_000_000, label: "Major Metro (1M+)", price: 5000 },
  { min: 500_000, label: "Large City (500K–1M)", price: 4000 },
  { min: 250_000, label: "Mid-Large City (250K–500K)", price: 3000 },
  { min: 100_000, label: "Mid City (100K–250K)", price: 2500 },
  { min: 50_000, label: "Small City (50K–100K)", price: 2000 },
  { min: 25_000, label: "Large Town (25K–50K)", price: 1500 },
  { min: 10_000, label: "Small Town (10K–25K)", price: 1000 },
  { min: 0, label: "Rural (<10K)", price: 750 },
];

export function getCityPopulation(city: string, state: string): number | null {
  const stateData = populationData.cities[state.toUpperCase()];
  if (!stateData) return null;
  return stateData[city.toLowerCase()] ?? null;
}

export function getStatePopulation(state: string): number | null {
  return populationData.states[state.toUpperCase()] ?? null;
}

export function getTerritoryPrice(city: string, state: string): {
  population: number | null;
  price: number;
  tier: string;
} {
  // For statewide territories, use total state population
  if (city === "Statewide") {
    const pop = getStatePopulation(state);
    // Statewide is always top tier
    return { population: pop, price: 5000, tier: "Statewide Territory" };
  }

  const pop = getCityPopulation(city, state);
  if (pop === null) {
    // City not found in Census data — default to mid-tier
    return { population: null, price: 2000, tier: "Default (city not in database)" };
  }

  for (const tier of PRICING_TIERS) {
    if (pop >= tier.min) {
      return { population: pop, price: tier.price, tier: tier.label };
    }
  }

  return { population: pop, price: 750, tier: "Rural (<10K)" };
}

export function getPricingTiers() {
  return PRICING_TIERS;
}
