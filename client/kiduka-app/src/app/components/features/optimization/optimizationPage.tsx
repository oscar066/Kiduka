"use client";

import React, { useState } from "react";
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
import { fmt, Crop, FertilizerEntry, SUPPORTED_CROPS } from "./components/OptimizationHelpers";
import { BaselineVsOptimal } from "./components/BaselineVsOptimal";
import { AvailableFertilizers } from "./components/AvailableFertilizers";
import { TargetCrops } from "./components/TargetCrops";
import { ApplicationRates } from "./components/ApplicationRates";
import { apiClient } from "@/lib/api-client";

// Defaults
const DEFAULT_FERTILIZERS: FertilizerEntry[] = [
  { product: "Organic Manure",      n_pct: 1.0,  p2o5_pct: 0.6,  k2o_pct: 0.85, price_currency_per_50kg: 2000, enabled: true, isCustom: false },
  { product: "NPK 23:23:23",        n_pct: 23.0, p2o5_pct: 23.0, k2o_pct: 23.0, price_currency_per_50kg: 5750, enabled: true, isCustom: false },
  { product: "NPK 17:17:17",        n_pct: 17.0, p2o5_pct: 17.0, k2o_pct: 17.0, price_currency_per_50kg: 6200, enabled: true, isCustom: false },
  { product: "Urea",                n_pct: 46.0, p2o5_pct: 0,    k2o_pct: 0,    price_currency_per_50kg: 4600, enabled: true, isCustom: false },
  { product: "CAN",                 n_pct: 26.0, p2o5_pct: 0,    k2o_pct: 0,    price_currency_per_50kg: 4050, enabled: true, isCustom: false },
  { product: "TSP",                 n_pct: 0.0,  p2o5_pct: 46.0, k2o_pct: 0.0,  price_currency_per_50kg: 5600, enabled: true, isCustom: false },
  { product: "Sulphate of Ammonia", n_pct: 21.0, p2o5_pct: 0.0,  k2o_pct: 0.0,  price_currency_per_50kg: 5250, enabled: true, isCustom: false },
];

export default function OptimizationPage() {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [budget, setBudget] = useState<number>(50000);
  const [crops, setCrops] = useState<Crop[]>([
    {
      crop: "Maize HP >3t",
      area_ac: 1.0,
      grain_value_currency_per_kg: 25.0,
      initial_n_kg_per_ha: 0,
      initial_p_kg_per_ha: 0,
      initial_k_kg_per_ha: 0,
    },
  ]);

  const [fertilizers, setFertilizers] =
    useState<FertilizerEntry[]>(DEFAULT_FERTILIZERS);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const [results, setResults] = useState<any | null>(null);

  // Selected crop for the comparison panel
  const [selectedCropForComparison, setSelectedCropForComparison] = useState<string>("");
  
  // Crop handlers
  const addCrop = () =>
    setCrops([
      ...crops,
      {
        crop: SUPPORTED_CROPS[0],
        area_ac: 1.0,
        grain_value_currency_per_kg: 20.0,
        initial_n_kg_per_ha: 0,
        initial_p_kg_per_ha: 0,
        initial_k_kg_per_ha: 0,
      },
    ]);

  const removeCrop = (i: number) => setCrops(crops.filter((_, idx) => idx !== i));

  const updateCrop = (i: number, field: keyof Crop, value: any) => {
    const nc = [...crops];
    nc[i] = { ...nc[i], [field]: value };
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
      n_pct: 10,
      p2o5_pct: 10,
      k2o_pct: 10,
      price_currency_per_50kg: 3000,
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
      crops,
      fertilizers: payloadFerts.map((f) => ({
        product: f.product,
        n_pct: f.n_pct,
        p2o5_pct: f.p2o5_pct,
        k2o_pct: f.k2o_pct,
        price_currency_per_50kg: f.price_currency_per_50kg,
      })),
      scenario: { budget_currency: budget },
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
              <h1 className="text-3xl font-serif font-bold text-green-800 flex items-center gap-2">
                <Calculator className="h-8 w-8 text-green-600" />
                Fertilizer Optimization
              </h1>
              <p className="text-green-600 font-serif">
                Maximize crop yields dynamically based on budget and nutrient baselines
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span className="text-sm font-medium">{error}</span>
              </div>
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
                  <h2 className="text-2xl font-serif font-bold text-green-800">
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
                        {fmt(results.summary_row.total_net_returns_currency)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-green-300 px-5 pb-5">
                      Total value after deducting fertilizer costs
                    </CardContent>
                  </Card>

                  <Card className="bg-white border-green-200 shadow-md">
                    <CardHeader className="pb-2 px-5 pt-5">
                      <CardDescription className="text-gray-500 uppercase text-xs tracking-wider font-semibold">
                        Expected Yield Value
                      </CardDescription>
                      <CardTitle className="text-3xl text-gray-800">
                        {fmt(results.summary_row.total_incremental_value_currency)}
                      </CardTitle>
                    </CardHeader>
                  </Card>

                  <Card className="bg-white border-amber-200 shadow-md">
                    <CardHeader className="pb-2 px-5 pt-5">
                      <CardDescription className="text-gray-500 uppercase text-xs tracking-wider font-semibold">
                        Total Fertilizer Cost
                      </CardDescription>
                      <CardTitle className="text-3xl text-gray-800">
                        {fmt(results.summary_row.total_fertilizer_cost_currency)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-5 pb-5">
                      <div className="flex justify-between items-center text-sm font-medium text-amber-700 bg-amber-50 border border-amber-100 p-2 rounded-md">
                        <span>Budget Used</span>
                        <span>
                          {(
                            (results.summary_row.total_fertilizer_cost_currency /
                              results.summary_row.budget_currency) *
                            100
                          ).toFixed(1)}
                          %
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Application Rates + Comparison side by side */}
                <div className="grid lg:grid-cols-2 gap-6">

                  {/* Application Rates */}
                  <ApplicationRates applicationRows={results.application_rows} />

                  {/* Baseline vs Optimal comparison */}
                  {results.baseline_rows && results.optimal_rows && (
                    <BaselineVsOptimal
                      baselineRows={results.baseline_rows}
                      optimalRows={results.optimal_rows}
                      baselineSummary={results.baseline_summary_row}
                      optimalSummary={results.optimal_summary_row}
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
