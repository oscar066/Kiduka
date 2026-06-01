"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import UnifiedSidebar from "../../layout/UnifiedSidebar";
import { Navbar } from "../../layout/navbar";
import { SessionGuard } from "../../shared/SessionGuard";
import { Card, CardContent } from "@/components/ui/card";
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

export default function OptimizationPage() {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [soilPrefillInfo, setSoilPrefillInfo] = useState<SoilPrefillInfo | null>(null);

  const [budget, setBudget] = useState<number>(50000);
  const [crops, setCrops] = useState<Crop[]>([
    { crop: "Maize", area_ac: 1.0, grain_price_currency_per_kg: DEFAULT_GRAIN_PRICES["Maize"] },
  ]);
  const [soil, setSoil] = useState<SoilData>({
    mode: "direct",
    ph: 6.5,
    soc_percent: 2.5,
    p_olsen_ppm: 15,
    k_exchangeable_ppm: 120,
  });
  const [yAttConfig, setYAttConfig] = useState<YAttConfigData>(DEFAULT_YATT_CONFIG);
  const [fertilizers, setFertilizers] = useState<FertilizerEntry[]>(DEFAULT_FERTILIZERS);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [results, setResults] = useState<OptimizationResult | null>(null);
  const [selectedCropForComparison, setSelectedCropForComparison] = useState<string>("");

  useEffect(() => {
    if (!session?.accessToken) return;

    apiClient.getPredictionHistory(session.accessToken as string, 1, 1)
      .then((res) => {
        const latest = res.predictions?.[0];
        if (!latest) return;

        const { ph, soc_percent, p_olsen_ppm, k_exchangeable_ppm } =
          resolveOptimizationSoilPrefill(latest);

        if (ph === null && soc_percent === null && p_olsen_ppm === null && k_exchangeable_ppm === null) return;

        setSoil((prev) => ({
          ...prev,
          ...(ph               !== null && { ph }),
          ...(soc_percent      !== null && { soc_percent }),
          ...(p_olsen_ppm      !== null && { p_olsen_ppm }),
          ...(k_exchangeable_ppm !== null && { k_exchangeable_ppm }),
        }));

        setSoilPrefillInfo({
          date: new Date(latest.created_at).toLocaleDateString(),
          location: latest.location_name ?? null,
        });

        if (latest.location_lat != null && latest.location_lng != null) {
          setYAttConfig((prev) => ({
            ...prev,
            location: { lat: latest.location_lat, lon: latest.location_lng },
          }));
        }
      })
      .catch(() => {});
  }, [session?.accessToken]);

  // Crop handlers
  const addCrop = () =>
    setCrops([...crops, {
      crop: SUPPORTED_CROPS[0],
      area_ac: 1.0,
      grain_price_currency_per_kg: DEFAULT_GRAIN_PRICES[SUPPORTED_CROPS[0]],
    }]);

  const removeCrop = (i: number) => setCrops(crops.filter((_, idx) => idx !== i));

  const updateCrop = (i: number, field: keyof Crop, value: any) => {
    const nc = [...crops];
    nc[i] = { ...nc[i], [field]: value };
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

  const toggleExpand = (i: number) => setExpandedIdx(expandedIdx === i ? null : i);

  const addCustom = () => {
    const entry: FertilizerEntry = {
      product: "Custom NPK",
      n_fraction: 0.10,
      p2o5_fraction: 0.10,
      k2o_fraction: 0.10,
      price_currency_per_kg: 60,
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

  const updateFertilizer = (i: number, field: keyof FertilizerEntry, value: any) => {
    const nf = [...fertilizers];
    nf[i] = { ...nf[i], [field]: value };
    setFertilizers(nf);
  };

  const handleOptimize = async () => {
    if (!session?.accessToken) { setError("You must be logged in."); return; }
    if (crops.length === 0) { setError("Please add at least one crop to optimize."); return; }

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

            {/* Two-column input layout */}
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-6">
                <BudgetCard budget={budget} onChange={setBudget} />
                <SoilInputs soil={soil} onChange={setSoil} prefillInfo={soilPrefillInfo} />
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

              <div className="space-y-6">
                <TargetCrops
                  crops={crops}
                  onAdd={addCrop}
                  onRemove={removeCrop}
                  onUpdate={updateCrop}
                />
                <YAttConfig
                  config={yAttConfig}
                  onChange={setYAttConfig}
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
                onSelectCrop={setSelectedCropForComparison}
              />
            )}

          </main>
        </SidebarInset>
      </SidebarProvider>
    </SessionGuard>
  );
}
