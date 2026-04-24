// County population data from U.S. Census Bureau Vintage 2024 estimates
// JSON is inlined at build time by esbuild
import countyData from "./county-populations.json";
import { getTerritoryPrice as getCityTerritoryPrice } from "./territory-pricing";

export type CountyRecord = {
  county: string;
  state: string;
  state_name: string;
  population: number;
};

const COUNTIES: CountyRecord[] = (countyData as { counties: CountyRecord[] }).counties;

// Account-level minimum deposit per client across all territories
export const ACCOUNT_MIN_DEPOSIT = 2000;

// Pricing tiers for county-based territories (Census Vintage 2024)
const COUNTY_TIERS = [
  { min: 2_000_000, label: "Mega County (2M+)", price: 12000 },
  { min: 1_000_000, label: "Metro County (1M–2M)", price: 8500 },
  { min: 500_000, label: "Major County (500K–1M)", price: 6000 },
  { min: 200_000, label: "Large County (200K–500K)", price: 4000 },
  { min: 75_000, label: "Mid County (75K–200K)", price: 2500 },
  { min: 25_000, label: "Small County (25K–75K)", price: 1500 },
  { min: 0, label: "Rural County (<25K)", price: 1000 },
];

function normalizeCounty(name: string): string {
  return name.trim().toLowerCase().replace(/\s+county$/, "").replace(/\s+parish$/, "");
}

export function getCountyPopulation(county: string, state: string): number | null {
  const st = state.toUpperCase();
  const target = normalizeCounty(county);
  const match = COUNTIES.find(
    c => c.state.toUpperCase() === st && normalizeCounty(c.county) === target,
  );
  return match?.population ?? null;
}

export function getCountiesByState(state: string): CountyRecord[] {
  const st = state.toUpperCase();
  return COUNTIES
    .filter(c => c.state.toUpperCase() === st)
    .slice()
    .sort((a, b) => a.county.localeCompare(b.county));
}

export function getCountyPrice(county: string, state: string): {
  population: number | null;
  price: number;
  tier: string;
} {
  const pop = getCountyPopulation(county, state);
  if (pop === null) {
    // County not found — default to mid-small tier
    return { population: null, price: 1500, tier: "Default (county not in database)" };
  }
  for (const tier of COUNTY_TIERS) {
    if (pop >= tier.min) {
      return { population: pop, price: tier.price, tier: tier.label };
    }
  }
  return { population: pop, price: 1000, tier: "Rural County (<25K)" };
}

// Statewide pricing — delegates to existing city-pricing module for compat
export function getStatewidePrice(state: string) {
  return getCityTerritoryPrice("Statewide", state);
}

export function getCountyPricingTiers() {
  return COUNTY_TIERS;
}
