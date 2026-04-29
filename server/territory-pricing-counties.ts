// County population data from U.S. Census Bureau Vintage 2024 estimates
// JSON is inlined at build time by esbuild
import countyData from "./county-populations.json";

export type CountyRecord = {
  county: string;
  state: string;
  state_name: string;
  population: number;
};

const COUNTIES: CountyRecord[] = (countyData as { counties: CountyRecord[] }).counties;

// Account-level minimum deposit per client across all territories
export const ACCOUNT_MIN_DEPOSIT = 2000;

// Flat-rate pricing: $2,000 first territory, $1,200 each additional
export const FIRST_TERRITORY_PRICE = 2000;
export const ADDITIONAL_TERRITORY_PRICE = 1200;

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

// Flat-rate county pricing.
// `existingCount` = number of territories the client already owns.
// `offset` = position within a multi-territory batch (0-indexed).
export function getCountyPrice(
  county: string,
  state: string,
  existingCount = 0,
  offset = 0,
): {
  population: number | null;
  price: number;
  tier: string;
} {
  const pop = getCountyPopulation(county, state);
  const isFirst = existingCount + offset === 0;
  const price = isFirst ? FIRST_TERRITORY_PRICE : ADDITIONAL_TERRITORY_PRICE;
  const tier = isFirst ? "First territory" : "Additional territory";
  return { population: pop, price, tier };
}

export function getCountyPricingTiers() {
  return [
    { label: "First territory", price: FIRST_TERRITORY_PRICE, min: 0 },
    { label: "Each additional territory", price: ADDITIONAL_TERRITORY_PRICE, min: 0 },
  ];
}
