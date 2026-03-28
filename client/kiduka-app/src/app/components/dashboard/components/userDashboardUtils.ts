export interface Prediction {
  created_at: string;
  soil_fertility_status: string;
  soil_health_index?: number;
}

export interface PredictionsData {
  predictions: Prediction[];
  total: number;
}

export interface UserStats {
  totalPredictions: number;
  thisMonthPredictions: number;
  averageSHI: string;
  averageFertility: string;
}

const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

export interface CacheEntry {
  data: PredictionsData;
  timestamp: number;
}

// Module-level cache so it persists across re-renders but resets on page refresh
export const cache: { current: CacheEntry | null } = { current: null };

export function isCacheValid(): boolean {
  if (!cache.current) return false;
  return Date.now() - cache.current.timestamp < CACHE_TTL_MS;
}

export function deriveStats(data: PredictionsData): UserStats {
  const predictions = data.predictions ?? [];

  // "This month" count — derived from the fetched page
  const now = new Date();
  const thisMonthPredictions = predictions.filter((p) => {
    const d = new Date(p.created_at);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;

  // Average SHI from the fetched page
  const shiValues = predictions
    .map((p) => p.soil_health_index)
    .filter((v): v is number => typeof v === "number");

  const averageSHI =
    shiValues.length > 0
      ? (shiValues.reduce((a, b) => a + b, 0) / shiValues.length).toFixed(2)
      : "--";

  // Most common fertility status
  const fertilityCounts: Record<string, number> = {};
  predictions.forEach((p) => {
    if (p.soil_fertility_status) {
      fertilityCounts[p.soil_fertility_status] =
        (fertilityCounts[p.soil_fertility_status] ?? 0) + 1;
    }
  });
  const averageFertility =
    Object.keys(fertilityCounts).sort(
      (a, b) => fertilityCounts[b] - fertilityCounts[a]
    )[0] ?? "--";

  return {
    totalPredictions: data.total ?? 0,
    thisMonthPredictions,
    averageSHI,
    averageFertility,
  };
}
