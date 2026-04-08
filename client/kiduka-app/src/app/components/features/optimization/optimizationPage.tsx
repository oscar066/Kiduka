"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import UnifiedSidebar from "../../layout/UnifiedSidebar";
import { Navbar } from "../../layout/navbar";
import { SessionGuard } from "../../shared/SessionGuard";
import { 
  Sprout, 
  FlaskConical, 
  Banknote,
  Plus,
  Trash2,
  Calculator,
  Loader2,
  AlertCircle
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const SUPPORTED_CROPS = [
  "Maize HP >3t",
  "Maize LP <3t",
  "Sorghum",
  "Finger millet",
  "Bean",
  "Groundnuts, unshelled"
];

interface Crop {
  crop: string;
  area_ac: number;
  grain_value_currency_per_kg: number;
  initial_n_kg_per_ha: number;
  initial_p_kg_per_ha: number;
  initial_k_kg_per_ha: number;
}

interface Fertilizer {
  product: string;
  n_pct: number;
  p2o5_pct: number;
  k2o_pct: number;
  price_currency_per_50kg: number;
}

const DEFAULT_FERTILIZERS: Fertilizer[] = [
  { product: "Urea", n_pct: 46.0, p2o5_pct: 0, k2o_pct: 0, price_currency_per_50kg: 2850.0 },
  { product: "Diammonium phosphate, DAP", n_pct: 18.0, p2o5_pct: 46.0, k2o_pct: 0, price_currency_per_50kg: 3600.0 }
];

export default function OptimizationPage() {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [budget, setBudget] = useState<number>(50000);
  const [crops, setCrops] = useState<Crop[]>([
    { crop: "Maize HP >3t", area_ac: 1.0, grain_value_currency_per_kg: 25.0, initial_n_kg_per_ha: 0, initial_p_kg_per_ha: 0, initial_k_kg_per_ha: 0 }
  ]);
  const [fertilizers, setFertilizers] = useState<Fertilizer[]>(DEFAULT_FERTILIZERS);
  
  const [results, setResults] = useState<any | null>(null);

  const handleAddCrop = () => {
    setCrops([
      ...crops, 
      { crop: SUPPORTED_CROPS[0], area_ac: 1.0, grain_value_currency_per_kg: 20.0, initial_n_kg_per_ha: 0, initial_p_kg_per_ha: 0, initial_k_kg_per_ha: 0 }
    ]);
  };

  const handleRemoveCrop = (index: number) => {
    setCrops(crops.filter((_, i) => i !== index));
  };

  const handleUpdateCrop = (index: number, field: keyof Crop, value: string | number) => {
    const newCrops = [...crops];
    newCrops[index] = { ...newCrops[index], [field]: value };
    setCrops(newCrops);
  };

  const handleAddFertilizer = () => {
    setFertilizers([
      ...fertilizers,
      { product: "Custom NPK", n_pct: 10, p2o5_pct: 10, k2o_pct: 10, price_currency_per_50kg: 3000 }
    ]);
  };

  const handleRemoveFertilizer = (index: number) => {
    setFertilizers(fertilizers.filter((_, i) => i !== index));
  };

  const handleUpdateFertilizer = (index: number, field: keyof Fertilizer, value: string | number) => {
    const newFert = [...fertilizers];
    newFert[index] = { ...newFert[index], [field]: value };
    setFertilizers(newFert);
  };

  const handleOptimize = async () => {
    if (!session?.accessToken) {
      setError("You must be logged in.");
      return;
    }
    if (crops.length === 0) {
      setError("Please add at least one crop to optimize.");
      return;
    }

    const payloadFertilizers = fertilizers.length > 0 ? fertilizers : DEFAULT_FERTILIZERS;

    const payload = {
      crops: crops,
      fertilizers: payloadFertilizers.map(f => ({
        product: f.product,
        n_pct: f.n_pct,
        p2o5_pct: f.p2o5_pct,
        k2o_pct: f.k2o_pct,
        price_currency_per_50kg: f.price_currency_per_50kg
      })),
      scenario: {
        budget_currency: budget
      }
    };

    setIsLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/optimization/optimize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Failed to optimize");
      }

      const data = await response.json();
      setResults(data);
    } catch (err: any) {
      console.error("Optimization failed:", err);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <SessionGuard message="You need to be logged in to access Fertilizer Optimization.">
      <SidebarProvider>
        <UnifiedSidebar />
        <SidebarInset>
          <Navbar />

          <main className="flex-1 space-y-6 p-6 bg-gradient-to-br from-green-25 via-amber-25 to-green-25 min-h-screen">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-serif font-bold text-green-800 flex items-center gap-2">
                  <Calculator className="h-8 w-8 text-green-600" />
                  Fertilizer Optimization
                </h1>
                <p className="text-green-600 font-serif mt-1">
                  Maximize your crop yields dynamically based on budget and nutrient baselines
                </p>
              </div>
            </div>

            {error && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-4 flex items-center gap-2 text-red-800">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-medium">{error}</span>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-6">
                
                {/* BUDGET SETTINGS */}
                <Card className="shadow-md border-amber-200">
                  <CardHeader className="bg-gradient-to-r from-green-50 to-amber-50 border-b border-amber-200">
                    <CardTitle className="flex items-center gap-2 text-green-800">
                      <Banknote className="h-5 w-5 text-green-600" /> Budget Scenario
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-2">
                      <Label htmlFor="budget" className="font-medium text-gray-700">Total Available Budget (KES)</Label>
                      <Input 
                        id="budget" 
                        type="number" 
                        value={budget} 
                        onChange={(e) => setBudget(Number(e.target.value))} 
                        className="focus-visible:ring-green-500 text-lg font-semibold"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* FERTILIZERS */}
                <Card className="shadow-md border-amber-200">
                  <CardHeader className="bg-gradient-to-r from-green-50 to-amber-50 border-b border-amber-200 flex flex-row items-center justify-between py-4">
                    <CardTitle className="flex items-center gap-2 text-green-800">
                      <FlaskConical className="h-5 w-5 text-green-600" /> Available Fertilizers
                    </CardTitle>
                    <Button variant="outline" size="sm" onClick={handleAddFertilizer} className="bg-white text-green-700 border-green-200 hover:bg-green-50">
                      <Plus className="h-4 w-4 mr-1" /> Add Custom
                    </Button>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    {fertilizers.map((fert, idx) => (
                      <div key={idx} className="relative p-4 border border-gray-200 rounded-lg bg-gray-50/50 space-y-3">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleRemoveFertilizer(idx)}
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-100 text-red-600 hover:bg-red-200"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="col-span-2">
                            <Label className="text-xs text-gray-500">Product Name</Label>
                            <Input value={fert.product} onChange={(e) => handleUpdateFertilizer(idx, "product", e.target.value)} />
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500">Price / 50kg Bag</Label>
                            <Input type="number" value={fert.price_currency_per_50kg} onChange={(e) => handleUpdateFertilizer(idx, "price_currency_per_50kg", Number(e.target.value))} />
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500">Nitrogen N (%)</Label>
                            <Input type="number" value={fert.n_pct} onChange={(e) => handleUpdateFertilizer(idx, "n_pct", Number(e.target.value))} />
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500">P2O5 (%)</Label>
                            <Input type="number" value={fert.p2o5_pct} onChange={(e) => handleUpdateFertilizer(idx, "p2o5_pct", Number(e.target.value))} />
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500">K2O (%)</Label>
                            <Input type="number" value={fert.k2o_pct} onChange={(e) => handleUpdateFertilizer(idx, "k2o_pct", Number(e.target.value))} />
                          </div>
                        </div>
                      </div>
                    ))}
                    {fertilizers.length === 0 && <p className="text-sm text-gray-500 italic text-center py-2">Defaults will be applied if empty.</p>}
                  </CardContent>
                </Card>

              </div>

              <div className="space-y-6">
                {/* CROPS */}
                <Card className="shadow-md border-amber-200">
                  <CardHeader className="bg-gradient-to-r from-green-50 to-amber-50 border-b border-amber-200 flex flex-row items-center justify-between py-4">
                    <CardTitle className="flex items-center gap-2 text-green-800">
                      <Sprout className="h-5 w-5 text-green-600" /> Target Crops
                    </CardTitle>
                    <Button variant="outline" size="sm" onClick={handleAddCrop} className="bg-white text-green-700 border-green-200 hover:bg-green-50">
                      <Plus className="h-4 w-4 mr-1" /> Add Crop
                    </Button>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4 max-h-[600px] overflow-y-auto">
                    {crops.map((crop, idx) => (
                      <div key={idx} className="relative p-4 border border-gray-200 rounded-lg bg-gray-50/50 space-y-3 shadow-sm">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleRemoveCrop(idx)}
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-100 text-red-600 hover:bg-red-200"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="col-span-2">
                            <Label className="text-xs text-gray-500">Crop Type</Label>
                            <Select 
                              value={crop.crop} 
                              onValueChange={(val) => handleUpdateCrop(idx, "crop", val)}
                            >
                              <SelectTrigger className="w-full bg-white">
                                <SelectValue placeholder="Select a crop" />
                              </SelectTrigger>
                              <SelectContent>
                                {SUPPORTED_CROPS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label className="text-xs text-gray-500">Area (Acres)</Label>
                            <Input type="number" step="0.1" value={crop.area_ac} onChange={(e) => handleUpdateCrop(idx, "area_ac", Number(e.target.value))} />
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500">Market Price / Kg</Label>
                            <Input type="number" value={crop.grain_value_currency_per_kg} onChange={(e) => handleUpdateCrop(idx, "grain_value_currency_per_kg", Number(e.target.value))} />
                          </div>

                          {/* Initial Baselines */}
                          <div className="col-span-2 border-t mt-1 pt-2 grid grid-cols-3 gap-2">
                            <div>
                              <Label className="text-[10px] uppercase text-gray-500">Baseline N (kg/ha)</Label>
                              <Input type="number" value={crop.initial_n_kg_per_ha} onChange={(e) => handleUpdateCrop(idx, "initial_n_kg_per_ha", Number(e.target.value))} className="h-8 text-xs" />
                            </div>
                            <div>
                              <Label className="text-[10px] uppercase text-gray-500">Baseline P (kg/ha)</Label>
                              <Input type="number" value={crop.initial_p_kg_per_ha} onChange={(e) => handleUpdateCrop(idx, "initial_p_kg_per_ha", Number(e.target.value))} className="h-8 text-xs" />
                            </div>
                            <div>
                              <Label className="text-[10px] uppercase text-gray-500">Baseline K (kg/ha)</Label>
                              <Input type="number" value={crop.initial_k_kg_per_ha} onChange={(e) => handleUpdateCrop(idx, "initial_k_kg_per_ha", Number(e.target.value))} className="h-8 text-xs" />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {crops.length === 0 && <p className="text-sm text-gray-500 italic text-center py-4">Add the crops you plan to plant.</p>}
                  </CardContent>
                </Card>

                <Button 
                  onClick={handleOptimize} 
                  disabled={isLoading || crops.length === 0}
                  className="w-full h-14 text-lg shadow-lg bg-green-600 hover:bg-green-700 transition-all font-serif"
                >
                  {isLoading ? (
                    <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Optimizing Rates...</>
                  ) : (
                    <><Calculator className="h-5 w-5 mr-2" /> Run Optimizer</>
                  )}
                </Button>
              </div>
            </div>

            {/* RESULTS SECTION */}
            {results && results.summary_row && (
              <div className="mt-12 space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-500">
                <div className="flex items-center gap-2 border-b pb-2 border-green-200">
                  <h2 className="text-2xl font-serif font-bold text-green-800">Optimization Results</h2>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">Successfully Computed</Badge>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="bg-green-600 text-white shadow-lg border-none">
                    <CardHeader className="pb-2">
                      <CardDescription className="text-green-100 uppercase text-xs tracking-wider font-semibold">Net Economic Returns</CardDescription>
                      <CardTitle className="text-4xl">{formatCurrency(results.summary_row.total_net_returns_currency)}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-green-200">
                      Total generated value after deducting fertilizer costs
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-white border-green-200 shadow-md">
                    <CardHeader className="pb-2">
                      <CardDescription className="text-gray-500 uppercase text-xs tracking-wider font-semibold">Expected Yield Value</CardDescription>
                      <CardTitle className="text-3xl text-gray-800">{formatCurrency(results.summary_row.total_incremental_value_currency)}</CardTitle>
                    </CardHeader>
                  </Card>
                  
                  <Card className="bg-white border-amber-200 shadow-md">
                    <CardHeader className="pb-2">
                      <CardDescription className="text-gray-500 uppercase text-xs tracking-wider font-semibold">Total Fertilizer Cost</CardDescription>
                      <CardTitle className="text-3xl text-gray-800">{formatCurrency(results.summary_row.total_fertilizer_cost_currency)}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center text-sm font-medium text-amber-700 bg-amber-50 p-2 rounded-md mt-1">
                        <span>Budget Used:</span>
                        <span>{((results.summary_row.total_fertilizer_cost_currency / results.summary_row.budget_currency) * 100).toFixed(1)}%</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid lg:grid-cols-2 gap-6">
                  <Card className="shadow-md border-gray-200">
                    <CardHeader className="bg-gray-50 border-b pb-3">
                      <CardTitle className="text-lg text-gray-800">Application Rates</CardTitle>
                      <CardDescription>Recommended kilos of product per acre for each crop</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y">
                        {results.application_rows.filter((r: any) => r.kg_per_ac > 0.01).map((row: any, i: number) => (
                          <div key={i} className="flex justify-between items-center p-4 hover:bg-gray-50 transition-colors">
                            <div>
                              <p className="font-semibold text-gray-800">{row.crop}</p>
                              <p className="text-sm text-gray-500">Apply {row.product}</p>
                            </div>
                            <div className="text-right">
                              <Badge variant="outline" className="text-green-700 bg-green-50 border-green-200 text-sm py-1 px-3">
                                {row.kg_per_ac.toFixed(2)} kg / acre
                              </Badge>
                              <p className="text-xs text-gray-400 mt-1">Total needed: {row.kg_total.toFixed(2)} kg</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="shadow-md border-gray-200">
                    <CardHeader className="bg-gray-50 border-b pb-3">
                      <CardTitle className="text-lg text-gray-800">Expected Effects</CardTitle>
                      <CardDescription>Yield increments &amp; revenue generated per crop</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y">
                        {results.effect_rows.filter((r: any) => r.incremental_yield_kg_per_ac > 0.01).map((row: any, i: number) => (
                          <div key={i} className="flex justify-between items-center p-4 hover:bg-gray-50 transition-colors">
                            <div>
                              <p className="font-semibold text-gray-800">{row.crop}</p>
                              <p className="text-xs text-gray-500 mt-1">Cost: {formatCurrency(row.fertilizer_cost_currency)}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-green-700">+{row.incremental_yield_kg_per_ac.toFixed(1)} kg/ac</p>
                              <p className="text-xs font-medium text-gray-500 mt-1 bg-gray-100 inline-block px-2 py-0.5 rounded">
                                Value: {formatCurrency(row.incremental_value_currency)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

              </div>
            )}

          </main>
        </SidebarInset>
      </SidebarProvider>
    </SessionGuard>
  );
}
