import test from "node:test";
import assert from "node:assert/strict";

import {
  mapContinuousScoreToConcentration,
  resolveOptimizationSoilPrefill,
} from "./soil-score-mapping.ts";

test("maps lowest score band from 0.5-1.5 to the class-1 concentration interval", () => {
  assert.equal(mapContinuousScoreToConcentration("P", 0.5), 0);
  assert.equal(mapContinuousScoreToConcentration("P", 1.0), 5);
  assert.equal(mapContinuousScoreToConcentration("P", 1.5), 10);
  assert.equal(mapContinuousScoreToConcentration("K", 1.0), 20);
  assert.equal(mapContinuousScoreToConcentration("OC", 1.0), 0.5);
});

test("maps middle and high score bands to bounded concentration estimates", () => {
  assert.equal(mapContinuousScoreToConcentration("P", 2.0), 15);
  assert.equal(mapContinuousScoreToConcentration("P", 3.0), 30);
  assert.equal(mapContinuousScoreToConcentration("P", 4.2), 40);
  assert.equal(mapContinuousScoreToConcentration("K", 3.0), 120);
  assert.equal(mapContinuousScoreToConcentration("OC", 4.2), 3);
});

test("prefill uses measured values first and estimated continuous scores otherwise", () => {
  const prefill = resolveOptimizationSoilPrefill({
    soil_ph: 6.2,
    phosphorus: 12,
    potassium: null,
    organic_carbon: null,
    nutrients: {
      P: { score: 4, label: "Healthy", method: "measured" },
      K: { score: 2, label: "Poor", method: "estimated", continuous_score: 1.0 },
      OC: { score: 2, label: "Poor", method: "estimated", continuous_score: 2.0 },
    },
  });

  assert.equal(prefill.ph, 6.2);
  assert.equal(prefill.p_olsen_ppm, 12);
  assert.equal(prefill.k_exchangeable_ppm, 20);
  assert.equal(prefill.soc_percent, 1.5);
});

test("prefill does not fallback from estimated nutrients to legacy rounded scores", () => {
  const prefill = resolveOptimizationSoilPrefill({
    phosphorus: 3,
    potassium: 2,
    organic_carbon: 2,
    nutrients: {
      P: { score: 3, label: "Moderately Healthy", method: "estimated" },
      K: { score: 2, label: "Poor", method: "estimated" },
      OC: { score: 2, label: "Poor", method: "estimated" },
    },
  });

  assert.equal(prefill.p_olsen_ppm, null);
  assert.equal(prefill.k_exchangeable_ppm, null);
  assert.equal(prefill.soc_percent, null);
});
