"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import UnifiedSidebar from "../../layout/UnifiedSidebar";
import { Navbar } from "../../layout/navbar";
import { SessionGuard } from "../../shared/SessionGuard";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calculator,
  Loader2,
  AlertCircle,
  Banknote,
} from "lucide-react";
import { fmt, Crop, FertilizerEntry, SUPPORTED_CROPS, DEFAULT_GRAIN_PRICES } from "./components/OptimizationHelpers";
import { BaselineVsOptimal } from "./components/BaselineVsOptimal";
import { AvailableFertilizers } from "./components/AvailableFertilizers";
import { TargetCrops } from "./components/TargetCrops";
import { ApplicationRates } from "./components/ApplicationRates";
import { SoilInputs, SoilData, SoilPrefillInfo } from "./components/SoilInputs";
import { YAttConfig, YAttConfigData, DEFAULT_YATT_CONFIG } from "./components/YAttConfig";
import { CropYieldTable } from "./components/CropYieldTable";
import { apiClient } from "@/lib/api-client";

// Defaults — fractions (0–1), prices per kg (KES/50kg bag ÷ 50)
const DEFAULT_FERTILIZERS: FertilizerEntry[] = [
  { product: "DAP",                 n_fraction: 0.18,  p2o5_fraction: 0.46,  k2o_fraction: 0,      price_currency_per_kg: 115, enabled: true,  isCustom: false }, // 5750/50
  { product: "Urea",                n_fraction: 0.46,  p2o5_fraction: 0,     k2o_fraction: 0,      price_currency_per_kg: 92,  enabled: true,  isCustom: false }, // 4600/50
  { product: "CAN",                 n_fraction: 0.26,  p2o5_fraction: 0,     k2o_fraction: 0,      price_currency_per_kg: 81,  enabled: true,  isCustom: false }, // 4050/50
  { product: "TSP",                 n_fraction: 0,     p2o5_fraction: 0.46,  k2o_fraction: 0,      price_currency_per_kg: 112, enabled: true,  isCustom: false }, // 5600/50
  { product: "MOP",                 n_fraction: 0,     p2o5_fraction: 0,     k2o_fraction: 0.60,   price_currency_per_kg: 90,  enabled: true,  isCustom: false }, // 4500/50
  { product: "NPK 23:23:23",        n_fraction: 0.23,  p2o5_fraction: 0.23,  k2o_fraction: 0.23,   price_currency_per_kg: 115, enabled: true,  isCustom: false }, // 5750/50
  { product: "NPK 17:17:17",        n_fraction: 0.17,  p2o5_fraction: 0.17,  k2o_fraction: 0.17,   price_currency_per_kg: 124, enabled: false, isCustom: false }, // 6200/50
  { product: "Sulphate of Ammonia", n_fraction: 0.21,  p2o5_fraction: 0,     k2o_fraction: 0,      price_currency_per_kg: 105, enabled: false, isCustom: false }, // 5250/50
  { product: "Organic Manure",      n_fraction: 0.010, p2o5_fraction: 0.006, k2o_fraction: 0.0085, price_currency_per_kg: 40,  enabled: false, isCustom: false }, // 2000/50
  { product: "Super Liquid Foliar", n_fraction: 0.085, p2o5_fraction: 0.075, k2o_fraction: 0.075,  price_currency_per_kg: 360, enabled: false, isCustom: false }, // 18000/50
];

export default function OptimizationPage() {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [soilPrefillInfo, setSoilPrefillInfo] = useState<SoilPrefillInfo | null>(null);

  const [budget, setBudget] = useState<number>(50000);
  const [crops, setCrops] = useState<Crop[]>([
    {
      crop: "Maize",
      area_ac: 1.0,
      grain_price_currency_per_kg: DEFAULT_GRAIN_PRICES["Maize"],
    },
  ]);

  const [soil, setSoil] = useState<SoilData>({
    mode: "direct",
    ph: 6.5,
    soc_percent: 2.5,
    p_olsen_ppm: 15,
    k_exchangeable_ppm: 120,
  });

  const [yAttConfig, setYAttConfig] = useState<YAttConfigData>(DEFAULT_YATT_CONFIG);

  const [fertilizers, setFertilizers] =
    useState<FertilizerEntry[]>(DEFAULT_FERTILIZERS);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const [results, setResults] = useState<any | null>(null);

  // Selected crop for the comparison panel
  const [selectedCropForComparison, setSelectedCropForComparison] = useState<string>("");
  
  // Pre-fill soil inputs from the farmer's latest soil analysis
  useEffect(() => {
    if (!session?.accessToken) return;

    apiClient.getPredictionHistory(session.accessToken as string, 1, 1)
      .then((res) => {
        const latest = res.predictions?.[0];
        if (!latest) return;

        const ph          = latest.soil_ph        ?? null;
        const soc_percent = latest.organic_carbon ?? null;
        const p_olsen_ppm = latest.phosphorus     ?? null;

        // K stored in the prediction may be in cmol/kg or an unrealistically low
        // raw reading. Values below 20 ppm cause the RQUEFTS model to return zero
        // yields regardless of fertilizer applied, so we keep the UI default (120)
        // in that case and let the farmer correct it manually.
        const K_VIABLE_MIN_PPM = 20;
        const k_ppm = (latest.potassium != null && latest.potassium >= K_VIABLE_MIN_PPM)
          ? latest.potassium
          : null;

        if (ph === null && soc_percent === null && p_olsen_ppm === null) return;

        setSoil((prev) => ({
          ...prev,
          ...(ph          !== null && { ph }),
          ...(soc_percent !== null && { soc_percent }),
          ...(p_olsen_ppm !== null && { p_olsen_ppm }),
          ...(k_ppm       !== null && { k_exchangeable_ppm: k_ppm }),
        }));

        setSoilPrefillInfo({
          date: new Date(latest.created_at).toLocaleDateString(),
          location: latest.location_name ?? null,
        });

        // Pre-fill WOFOST location with the coordinates from the latest analysis
        if (latest.location_lat != null && latest.location_lng != null) {
          setYAttConfig((prev) => ({
            ...prev,
            location: { lat: latest.location_lat, lon: latest.location_lng },
          }));
        }
      })
      .catch(() => {
        // Silently ignore — pre-fill is best-effort, not blocking
      });
  }, [session?.accessToken]);

  // Crop handlers
  const addCrop = () =>
    setCrops([
      ...crops,
      {
        crop: SUPPORTED_CROPS[0],
        area_ac: 1.0,
        grain_price_currency_per_kg: DEFAULT_GRAIN_PRICES[SUPPORTED_CROPS[0]],
      },
    ]);

  const removeCrop = (i: number) => setCrops(crops.filter((_, idx) => idx !== i));

  const updateCrop = (i: number, field: keyof Crop, value: any) => {
    const nc = [...crops];
    nc[i] = { ...nc[i], [field]: value };
    // Auto-fill grain price when crop type changes
    if (field === "crop" && DEFAULT_GRAIN_PRICES[value as string]) {
      nc[i].grain_price_currency_per_kg = DEFAULT_GRAIN_PRICES[value as string];
    }
    setCrops(nc);
  };

  // Fertilizer handlers
  const toggleEnabled = (i: number) => {
    const nf = [...fertilizers];
    nf[i] = { ...nf[i], enabled: !nf[i].enabled };
    setFertilizers(nf);
  };

  const toggleExpand = (i: number) =>
    setExpandedIdx(expandedIdx === i ? null : i);

  const addCustom = () => {
    const entry: FertilizerEntry = {
      product: "Custom NPK",
      n_fraction: 0.10,    // 10% = 0.10 fraction
      p2o5_fraction: 0.10, // 10% = 0.10 fraction
      k2o_fraction: 0.10,  // 10% = 0.10 fraction
      price_currency_per_kg: 60, // 3000 KES/50kg = 60 KES/kg
      enabled: true,
      isCustom: true,
    };
    const next = [...fertilizers, entry];
    setFertilizers(next);
    setExpandedIdx(next.length - 1);
  };

  const removeFertilizer = (i: number) => {
    setFertilizers(fertilizers.filter((_, idx) => idx !== i));
    if (expandedIdx === i) setExpandedIdx(null);
  };

  const updateFertilizer = (
    i: number,
    field: keyof FertilizerEntry,
    value: any
  ) => {
    const nf = [...fertilizers];
    nf[i] = { ...nf[i], [field]: value };
    setFertilizers(nf);
  };

  // Optimize
  const handleOptimize = async () => {
    if (!session?.accessToken) {
      setError("You must be logged in.");
      return;
    }
    if (crops.length === 0) {
      setError("Please add at least one crop to optimize.");
      return;
    }

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
          kephis_quantile: yAttConfig.kephis_quantile,
          wofost_sowing_date: yAttConfig.wofost_sowing_date,
          wofost_elevation_m: yAttConfig.wofost_elevation_m ?? undefined,
          fallback_to_kephis: yAttConfig.fallback_to_kephis,
        },
      },
      ...(yAttConfig.source === "wofost" && yAttConfig.location
        ? { location: yAttConfig.location }
        : {}),
    };

    setIsLoading(true);
    setError(null);
    setResults(null);

    try {
      const data = await apiClient.optimize(payload, session.accessToken as string);
      setResults(data);
      if (crops.length > 0) setSelectedCropForComparison(crops[0].crop);
    } catch (err: any) {
      console.error("Optimization failed:", err);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const enabledCount = fertilizers.filter((f) => f.enabled).length;

  return (
    <SessionGuard message="You need to be logged in to access Fertilizer Optimization.">
      <SidebarProvider>
        <UnifiedSidebar />
        <SidebarInset>
          <Navbar />

          <main className="flex-1 space-y-6 p-6 bg-gradient-to-br from-green-25 via-amber-25 to-green-25 min-h-screen">
            {/* Page Header */}
            <div className="space-y-1">
              <h1 className="text-3xl font-serif font-bold flex items-center gap-2">
                <Calculator className="h-8 w-8 text-green-600" />
                <span className="bg-gradient-to-r from-green-800 via-emerald-600 to-green-700 bg-clip-text text-transparent">
                  Fertilizer Optimization
                </span>
              </h1>
              <p className="text-green-600 font-serif">
                Maximize crop yields dynamically based on budget and nutrient baselines
              </p>
            </div>

            {/* Error */}
            {error && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-red-800">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">Error: {error}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Two-column layout */}
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-6">

                {/* Budget */}
                <Card className="border-amber-200 bg-white shadow-lg overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-green-50 to-amber-50 border-b border-amber-200 py-4 px-5">
                    <CardTitle className="flex items-center gap-2 text-green-800 text-base font-semibold">
                      <Banknote className="h-4 w-4 text-green-600" />
                      Budget Scenario
                    </CardTitle>
                    <CardDescription className="mt-0.5 text-xs text-gray-500">
                      Maximum total fertilizer spend across all crops and products
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-5">
                    <div className="space-y-1.5">
                      <Label htmlFor="budget" className="text-sm font-medium text-gray-700">
                        Total Available Budget (KES)
                      </Label>
                      <Input
                        id="budget"
                        type="number"
                        value={budget}
                        onChange={(e) => setBudget(Number(e.target.value))}
                        className="h-10 text-base font-semibold border-amber-200 focus-visible:ring-green-400"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Soil Analysis */}
                <SoilInputs soil={soil} onChange={setSoil} prefillInfo={soilPrefillInfo} />

                {/* Fertilizers */}
                <AvailableFertilizers
                  fertilizers={fertilizers}
                  expandedIdx={expandedIdx}
                  onToggleEnabled={toggleEnabled}
                  onToggleExpand={toggleExpand}
                  onAddCustom={addCustom}
                  onRemove={removeFertilizer}
                  onUpdate={updateFertilizer}
                />
              </div>

              {/* RIGHT COLUMN */}
              <div className="space-y-6">

                <TargetCrops
                  crops={crops}
                  onAdd={addCrop}
                  onRemove={removeCrop}
                  onUpdate={updateCrop}
                />

                {/* Advanced Settings (Y_att) */}
                <YAttConfig
                  config={yAttConfig}
                  onChange={setYAttConfig}
                  locationPrefilled={soilPrefillInfo !== null}
                />

                {/* Run Optimizer */}
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

            {/* RESULTS */}
            {results && results.summary_row && (
              <div className="mt-10 space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-500">

                <div className="flex items-center gap-2 border-b border-green-200 pb-2">
                  <h2 className="text-2xl font-serif font-bold bg-gradient-to-r from-green-800 via-emerald-600 to-green-700 bg-clip-text text-transparent">
                    Optimization Results
                  </h2>
                  <Badge
                    variant="secondary"
                    className="bg-green-100 text-green-800 border border-green-200 text-xs font-medium"
                  >
                    Successfully Computed
                  </Badge>
                </div>

                {/* KPI summary strip */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="bg-green-800 text-white shadow-lg border-none">
                    <CardHeader className="pb-2 px-5 pt-5">
                      <CardDescription className="text-green-200 uppercase text-xs tracking-wider font-semibold">
                        Net Economic Returns
                      </CardDescription>
                      <CardTitle className="text-4xl">
                        {fmt(results.summary_row.feasible_net_return_total)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-green-300 px-5 pb-5">
                      Total value after deducting fertilizer costs
                    </CardContent>
                  </Card>

                  <Card className="bg-white border-green-200 shadow-md">
                    <CardHeader className="pb-2 px-5 pt-5">
                      <CardDescription className="text-gray-500 uppercase text-xs tracking-wider font-semibold">
                        Return vs Baseline
                      </CardDescription>
                      <CardTitle className={`text-3xl ${results.summary_row.net_return_improvement >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {results.summary_row.net_return_improvement >= 0 ? "+" : ""}
                        {fmt(results.summary_row.net_return_improvement)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-5 pb-5 text-sm text-gray-500">
                      Net gain over no-fertilizer scenario
                    </CardContent>
                  </Card>

                  <Card className="bg-white border-amber-200 shadow-md">
                    <CardHeader className="pb-2 px-5 pt-5">
                      <CardDescription className="text-gray-500 uppercase text-xs tracking-wider font-semibold">
                        Fertilizer Cost
                      </CardDescription>
                      <CardTitle className="text-3xl text-gray-800">
                        {fmt(results.summary_row.budget_used)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-5 pb-5 space-y-2">
                      <div className="flex justify-between items-center text-sm font-medium text-amber-700 bg-amber-50 border border-amber-100 p-2 rounded-md">
                        <span>Budget Used</span>
                        <span>
                          {(
                            (results.summary_row.budget_used /
                              results.summary_row.budget_currency) *
                            100
                          ).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-gray-500 px-1">
                        <span>Remaining</span>
                        <span className="font-medium text-gray-700">
                          {fmt(results.summary_row.budget_remaining)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Per-crop yield breakdown */}
                <CropYieldTable
                  baselineRows={results.baseline_rows ?? []}
                  feasibleRows={results.feasible_rows ?? []}
                />

                {/* Application Rates + Comparison side by side */}
                <div className="grid lg:grid-cols-2 gap-6">

                  {/* Application Rates */}
                  <ApplicationRates applicationRows={results.application_rows} />

                  {/* Baseline vs Optimal comparison */}
                  {results.baseline_rows && results.feasible_rows && (
                    <BaselineVsOptimal
                      baselineRows={results.baseline_rows}
                      optimalRows={results.feasible_rows}
                      baselineSummary={results.summary_row}
                      optimalSummary={results.summary_row}
                      cropNames={crops.map((c) => c.crop)}
                      selectedCrop={selectedCropForComparison}
                      onSelectCrop={setSelectedCropForComparison}
                    />
                  )}
                </div>
              </div>
            )}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </SessionGuard>
  );
}
