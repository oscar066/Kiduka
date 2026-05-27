type OptimizationNutrient = "OC" | "P" | "K";

type NutrientScorePayload = {
  score?: number;
  label?: string;
  method?: "measured" | "estimated";
  continuous_score?: number | null;
};

type PredictionForOptimizationPrefill = {
  soil_ph?: number | null;
  phosphorus?: number | null;
  potassium?: number | null;
  organic_carbon?: number | null;
  nutrients?: Record<string, NutrientScorePayload | undefined> | null;
};

export type OptimizationSoilPrefill = {
  ph: number | null;
  soc_percent: number | null;
  p_olsen_ppm: number | null;
  k_exchangeable_ppm: number | null;
};

const CONCENTRATION_BOUNDS: Record<OptimizationNutrient, readonly [number, number, number, number]> = {
  OC: [0, 1, 2, 3],
  P: [0, 10, 20, 40],
  K: [0, 40, 80, 160],
};

function finiteOrNull(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function interpolate(
  value: number,
  inputMin: number,
  inputMax: number,
  outputMin: number,
  outputMax: number
): number {
  const ratio = (value - inputMin) / (inputMax - inputMin);
  return outputMin + ratio * (outputMax - outputMin);
}

export function mapContinuousScoreToConcentration(
  nutrient: OptimizationNutrient,
  rawScore: number | null | undefined
): number | null {
  const score = finiteOrNull(rawScore);
  if (score === null) return null;

  const s = Math.max(0, score);
  const [minValue, score1Upper, score2Upper, score4Upper] = CONCENTRATION_BOUNDS[nutrient];

  if (s < 1.5) {
    const boundedLowestScore = Math.min(Math.max(s, 0.5), 1.5);
    return interpolate(boundedLowestScore, 0.5, 1.5, minValue, score1Upper);
  }

  if (s < 2.5) {
    return interpolate(s, 1.5, 2.5, score1Upper, score2Upper);
  }

  if (s < 3.5) {
    return interpolate(s, 2.5, 3.5, score2Upper, score4Upper);
  }

  return score4Upper;
}

function resolveNutrientPrefill(
  nutrient: OptimizationNutrient,
  measuredValue: number | null | undefined,
  nutrientPayload: NutrientScorePayload | undefined
): number | null {
  if (nutrientPayload?.method === "measured") {
    return finiteOrNull(measuredValue);
  }

  if (nutrientPayload?.method === "estimated") {
    return mapContinuousScoreToConcentration(nutrient, nutrientPayload.continuous_score);
  }

  return null;
}

export function resolveOptimizationSoilPrefill(
  prediction: PredictionForOptimizationPrefill
): OptimizationSoilPrefill {
  const nutrients = prediction.nutrients ?? {};

  return {
    ph: finiteOrNull(prediction.soil_ph),
    soc_percent: resolveNutrientPrefill("OC", prediction.organic_carbon, nutrients.OC),
    p_olsen_ppm: resolveNutrientPrefill("P", prediction.phosphorus, nutrients.P),
    k_exchangeable_ppm: resolveNutrientPrefill("K", prediction.potassium, nutrients.K),
  };
}
