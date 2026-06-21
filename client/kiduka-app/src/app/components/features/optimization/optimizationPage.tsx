"use client";

import React, { useReducer, useEffect } from "react";
import { useSession } from "next-auth/react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import UnifiedSidebar from "../../layout/UnifiedSidebar";
import { Navbar } from "../../layout/navbar";
import { SessionGuard } from "../../shared/SessionGuard";
import { Button } from "@/components/ui/button";
import { Calculator, Loader2, AlertCircle } from "lucide-react";
import { Crop, FertilizerEntry, SUPPORTED_CROPS, DEFAULT_GRAIN_PRICES } from "./components/OptimizationHelpers";
import { AvailableFertilizers } from "./components/AvailableFertilizers";
import { TargetCrops } from "./components/TargetCrops";
import { SoilInputs, SoilData, SoilPrefillInfo } from "./components/SoilInputs";
import { YAttConfig, YAttConfigData, DEFAULT_YATT_CONFIG } from "./components/YAttConfig";
import { BudgetCard } from "./components/BudgetCard";
import { OptimizationResultsPanel } from "./components/OptimizationResultsPanel";
import { apiClient, type OptimizationResult } from "@/lib/api-client";
import { resolveOptimizationSoilPrefill } from "@/lib/soil-score-mapping";

interface OptimizationState {
  isLoading: boolean;
  error: string | null;
  soilPrefillInfo: SoilPrefillInfo | null;
  budget: number;
  crops: Crop[];
  soil: SoilData;
  yAttConfig: YAttConfigData;
  fertilizers: FertilizerEntry[];
  expandedIdx: number | null;
  results: OptimizationResult | null;
  selectedCropForComparison: string;
}

type OptimizationAction =
  | { type: "SET_BUDGET"; payload: number }
  | { type: "ADD_CROP" }
  | { type: "REMOVE_CROP"; payload: number }
  | { type: "UPDATE_CROP"; payload: { index: number; field: keyof Crop; value: any } }
  | { type: "SET_SOIL"; payload: SoilData }
  | { type: "SET_SOIL_PREFILL"; payload: { soil: Partial<SoilData>; info: SoilPrefillInfo; location?: { lat: number; lon: number } } }
  | { type: "TOGGLE_FERTILIZER"; payload: number }
  | { type: "TOGGLE_EXPAND"; payload: number }
  | { type: "ADD_CUSTOM_FERTILIZER" }
  | { type: "REMOVE_FERTILIZER"; payload: number }
  | { type: "UPDATE_FERTILIZER"; payload: { index: number; field: keyof FertilizerEntry; value: any } }
  | { type: "SET_YATT_CONFIG"; payload: YAttConfigData }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_RESULTS"; payload: { results: OptimizationResult; firstCrop: string } }
  | { type: "SET_SELECTED_CROP"; payload: string };

function optimizationReducer(state: OptimizationState, action: OptimizationAction): OptimizationState {
  switch (action.type) {
    case "SET_BUDGET":
      return { ...state, budget: action.payload };

    case "ADD_CROP":
      return {
        ...state,
        crops: [...state.crops, {
          crop: SUPPORTED_CROPS[0],
          area_ac: 1.0,
          grain_price_currency_per_kg: DEFAULT_GRAIN_PRICES[SUPPORTED_CROPS[0]],
        }],
      };

    case "REMOVE_CROP":
      return { ...state, crops: state.crops.filter((_, i) => i !== action.payload) };

    case "UPDATE_CROP": {
      const { index, field, value } = action.payload;
      const updated = [...state.crops];
      updated[index] = { ...updated[index], [field]: value };
      if (field === "crop" && DEFAULT_GRAIN_PRICES[value as string]) {
        updated[index].grain_price_currency_per_kg = DEFAULT_GRAIN_PRICES[value as string];
      }
      return { ...state, crops: updated };
    }

    case "SET_SOIL":
      return { ...state, soil: action.payload };

    case "SET_SOIL_PREFILL": {
      const { soil, info, location } = action.payload;
      return {
        ...state,
        soil: { ...state.soil, ...soil },
        soilPrefillInfo: info,
        yAttConfig: location
          ? { ...state.yAttConfig, location }
          : state.yAttConfig,
      };
    }

    case "TOGGLE_FERTILIZER": {
      const updated = [...state.fertilizers];
      updated[action.payload] = { ...updated[action.payload], enabled: !updated[action.payload].enabled };
      return { ...state, fertilizers: updated };
    }

    case "TOGGLE_EXPAND":
      return { ...state, expandedIdx: state.expandedIdx === action.payload ? null : action.payload };

    case "ADD_CUSTOM_FERTILIZER": {
      const entry: FertilizerEntry = {
        product: "Custom NPK",
        n_fraction: 0.10,
        p2o5_fraction: 0.10,
        k2o_fraction: 0.10,
        price_currency_per_kg: 60,
        enabled: true,
        isCustom: true,
      };
      const next = [...state.fertilizers, entry];
      return { ...state, fertilizers: next, expandedIdx: next.length - 1 };
    }

    case "REMOVE_FERTILIZER":
      return {
        ...state,
        fertilizers: state.fertilizers.filter((_, i) => i !== action.payload),
        expandedIdx: state.expandedIdx === action.payload ? null : state.expandedIdx,
      };

    case "UPDATE_FERTILIZER": {
      const { index, field, value } = action.payload;
      const updated = [...state.fertilizers];
      updated[index] = { ...updated[index], [field]: value };
      return { ...state, fertilizers: updated };
    }

    case "SET_YATT_CONFIG":
      return { ...state, yAttConfig: action.payload };

    case "SET_LOADING":
      return { ...state, isLoading: action.payload };

    case "SET_ERROR":
      return { ...state, error: action.payload };

    case "SET_RESULTS":
      return { ...state, results: action.payload.results, selectedCropForComparison: action.payload.firstCrop };

    case "SET_SELECTED_CROP":
      return { ...state, selectedCropForComparison: action.payload };

    default:
      return state;
  }
}

const DEFAULT_FERTILIZERS: FertilizerEntry[] = [
  { product: "DAP",                 n_fraction: 0.18,  p2o5_fraction: 0.46,  k2o_fraction: 0,      price_currency_per_kg: 115, enabled: true,  isCustom: false },
  { product: "Urea",                n_fraction: 0.46,  p2o5_fraction: 0,     k2o_fraction: 0,      price_currency_per_kg: 92,  enabled: true,  isCustom: false },
  { product: "CAN",                 n_fraction: 0.26,  p2o5_fraction: 0,     k2o_fraction: 0,      price_currency_per_kg: 81,  enabled: true,  isCustom: false },
  { product: "TSP",                 n_fraction: 0,     p2o5_fraction: 0.46,  k2o_fraction: 0,      price_currency_per_kg: 112, enabled: true,  isCustom: false },
  { product: "MOP",                 n_fraction: 0,     p2o5_fraction: 0,     k2o_fraction: 0.60,   price_currency_per_kg: 90,  enabled: true,  isCustom: false },
  { product: "NPK 23:23:23",        n_fraction: 0.23,  p2o5_fraction: 0.23,  k2o_fraction: 0.23,   price_currency_per_kg: 115, enabled: true,  isCustom: false },
  { product: "NPK 17:17:17",        n_fraction: 0.17,  p2o5_fraction: 0.17,  k2o_fraction: 0.17,   price_currency_per_kg: 124, enabled: false, isCustom: false },
  { product: "Sulphate of Ammonia", n_fraction: 0.21,  p2o5_fraction: 0,     k2o_fraction: 0,      price_currency_per_kg: 105, enabled: false, isCustom: false },
  { product: "Organic Manure",      n_fraction: 0.010, p2o5_fraction: 0.006, k2o_fraction: 0.0085, price_currency_per_kg: 40,  enabled: false, isCustom: false },
  { product: "Super Liquid Foliar", n_fraction: 0.085, p2o5_fraction: 0.075, k2o_fraction: 0.075,  price_currency_per_kg: 360, enabled: false, isCustom: false },
];

const INITIAL_STATE: OptimizationState = {
  isLoading: false,
  error: null,
  soilPrefillInfo: null,
  budget: 50000,
  crops: [{ crop: "Maize", area_ac: 1.0, grain_price_currency_per_kg: DEFAULT_GRAIN_PRICES["Maize"] }],
  soil: { mode: "direct", ph: 6.5, soc_percent: 2.5, p_olsen_ppm: 15, k_exchangeable_ppm: 120 },
  yAttConfig: DEFAULT_YATT_CONFIG,
  fertilizers: DEFAULT_FERTILIZERS,
  expandedIdx: null,
  results: null,
  selectedCropForComparison: "",
};

export default function OptimizationPage() {
  const { data: session } = useSession();
  const [state, dispatch] = useReducer(optimizationReducer, INITIAL_STATE);
  const { isLoading, error, soilPrefillInfo, budget, crops, soil, yAttConfig, fertilizers, expandedIdx, results, selectedCropForComparison } = state;

  useEffect(() => {
    if (!session?.accessToken) return;

    apiClient.getPredictionHistory(session.accessToken as string, 1, 1)
      .then((res) => {
        const latest = res.predictions?.[0];
        if (!latest) return;

        const { ph, soc_percent, p_olsen_ppm, k_exchangeable_ppm } =
          resolveOptimizationSoilPrefill(latest);

        if (ph === null && soc_percent === null && p_olsen_ppm === null && k_exchangeable_ppm === null) return;

        dispatch({
          type: "SET_SOIL_PREFILL",
          payload: {
            soil: {
              ...(ph !== null && { ph }),
              ...(soc_percent !== null && { soc_percent }),
              ...(p_olsen_ppm !== null && { p_olsen_ppm }),
              ...(k_exchangeable_ppm !== null && { k_exchangeable_ppm }),
            },
            info: {
              date: new Date(latest.created_at).toLocaleDateString(),
              location: latest.location_name ?? null,
            },
            ...(latest.location_lat != null && latest.location_lng != null
              ? { location: { lat: latest.location_lat, lon: latest.location_lng } }
              : {}),
          },
        });
      })
      .catch(() => {});
  }, [session?.accessToken]);

  const handleOptimize = async () => {
    if (!session?.accessToken) { dispatch({ type: "SET_ERROR", payload: "You must be logged in." }); return; }
    if (crops.length === 0) { dispatch({ type: "SET_ERROR", payload: "Please add at least one crop to optimize." }); return; }

    const enabled = fertilizers.filter((f) => f.enabled);
    const payloadFerts = enabled.length > 0 ? enabled : DEFAULT_FERTILIZERS;

    const payload = {
      soil: {
        mode: soil.mode,
        ph: soil.ph,
        soc_percent: soil.soc_percent,
        p_olsen_ppm: soil.p_olsen_ppm,
        k_exchangeable_ppm: soil.k_exchangeable_ppm,
      },
      crops: crops.map((c) => ({
        crop: c.crop,
        area_ac: c.area_ac,
        grain_price_currency_per_kg: c.grain_price_currency_per_kg,
      })),
      fertilizers: payloadFerts.map((f) => ({
        product: f.product,
        n_fraction: f.n_fraction,
        p2o5_fraction: f.p2o5_fraction,
        k2o_fraction: f.k2o_fraction,
        price_currency_per_kg: f.price_currency_per_kg,
      })),
      scenario: {
        budget_currency: budget,
        y_att: {
          source: yAttConfig.source,
          wofost_sowing_date: yAttConfig.wofost_sowing_date,
          wofost_elevation_m: yAttConfig.wofost_elevation_m ?? undefined,
          fallback_to_kephis: yAttConfig.fallback_to_kephis,
        },
      },
      ...(yAttConfig.source === "wofost" && yAttConfig.location
        ? { location: yAttConfig.location }
        : {}),
    };

    dispatch({ type: "SET_LOADING", payload: true });
    dispatch({ type: "SET_ERROR", payload: null });

    try {
      const data = await apiClient.optimize(payload, session.accessToken as string);
      dispatch({ type: "SET_RESULTS", payload: { results: data, firstCrop: crops[0]?.crop ?? "" } });
    } catch (err: any) {
      console.error("Optimization failed:", err);
      dispatch({ type: "SET_ERROR", payload: err.message || "An unexpected error occurred." });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  return (
    <SessionGuard message="You need to be logged in to access Fertilizer Optimization.">
      <SidebarProvider>
        <UnifiedSidebar />
        <SidebarInset>
          <Navbar />

          <main className="flex-1 space-y-6 p-6 bg-gradient-to-br from-green-25 via-amber-25 to-green-25 min-h-screen">

            {/* Page Header */}
            <div className="space-y-1">
              <h1 className="text-2xl font-serif font-bold flex items-center gap-2">
                <Calculator className="h-6 w-6 text-green-600" />
                <span className="bg-gradient-to-r from-green-800 via-emerald-600 to-green-700 bg-clip-text text-transparent">
                  Fertilizer Optimization
                </span>
              </h1>
              <p className="text-sm text-green-600 font-serif mt-0.5">
                Maximize crop yields dynamically based on budget and nutrient baselines
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-red-800">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span className="text-sm font-medium">{error}</span>
              </div>
            )}

            {/* Two-column input layout */}
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-6">
                <BudgetCard budget={budget} onChange={(v) => dispatch({ type: "SET_BUDGET", payload: v })} />
                <SoilInputs soil={soil} onChange={(v) => dispatch({ type: "SET_SOIL", payload: v })} prefillInfo={soilPrefillInfo} />
                <AvailableFertilizers
                  fertilizers={fertilizers}
                  expandedIdx={expandedIdx}
                  onToggleEnabled={(i) => dispatch({ type: "TOGGLE_FERTILIZER", payload: i })}
                  onToggleExpand={(i) => dispatch({ type: "TOGGLE_EXPAND", payload: i })}
                  onAddCustom={() => dispatch({ type: "ADD_CUSTOM_FERTILIZER" })}
                  onRemove={(i) => dispatch({ type: "REMOVE_FERTILIZER", payload: i })}
                  onUpdate={(i, field, value) => dispatch({ type: "UPDATE_FERTILIZER", payload: { index: i, field, value } })}
                />
              </div>

              <div className="space-y-6">
                <TargetCrops
                  crops={crops}
                  onAdd={() => dispatch({ type: "ADD_CROP" })}
                  onRemove={(i) => dispatch({ type: "REMOVE_CROP", payload: i })}
                  onUpdate={(i, field, value) => dispatch({ type: "UPDATE_CROP", payload: { index: i, field, value } })}
                />
                <YAttConfig
                  config={yAttConfig}
                  onChange={(v) => dispatch({ type: "SET_YATT_CONFIG", payload: v })}
                  locationPrefilled={soilPrefillInfo !== null}
                />
                <Button
                  onClick={handleOptimize}
                  disabled={isLoading || crops.length === 0}
                  className="w-full h-14 text-base shadow-lg bg-green-600 hover:bg-green-700 text-white transition-all font-serif disabled:opacity-60"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Optimizing Rates…
                    </>
                  ) : (
                    <>
                      <Calculator className="h-5 w-5 mr-2" />
                      Run Optimizer
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Results */}
            {results && (
              <OptimizationResultsPanel
                results={results}
                cropNames={crops.map((c) => c.crop)}
                selectedCrop={selectedCropForComparison}
                onSelectCrop={(v) => dispatch({ type: "SET_SELECTED_CROP", payload: v })}
              />
            )}

          </main>
        </SidebarInset>
      </SidebarProvider>
    </SessionGuard>
  );
}
