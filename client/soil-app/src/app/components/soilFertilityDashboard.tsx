// components/SoilFertilityDashboard.tsx
"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { Navbar } from "./navbar";
import { SoilHealthCard } from "./soil-health-card";
import { FertilizerRecommendation } from "./fertilizer-recommendation";
import { NutrientGauge } from "./nutrient-gauge";
import { LocationDetector } from "./location-detector";
import { AgrovetsSection } from "./agrovets/agrovets-section";

// Import shared components
import { ComprehensiveAnalysis } from "./soil-analysis/comprehensiveAnalysis";
import { ActionPlanRecommendations } from "./soil-analysis/actionPlanRecommendation";
import { NutrientDisplay } from "./soil-analysis/nutrientDisplay";
import { AgrovetsDisplay } from "./soil-analysis/agrovetDisplay";
import { StatusSummaryCards } from "./soil-analysis/statusSummaryCard";

import {
  Beaker,
  Leaf,
  TrendingUp,
  AlertCircle,
  Loader2,
  Lock,
  FileText,
} from "lucide-react";

import { SoilData, StructuredResponse } from "@/types/soil-analysis";

interface SoilInput {
  simplified_texture: string;
  ph: number;
  n: number;
  p: number;
  k: number;
  o: number;
  ca: number;
  mg: number;
  cu: number;
  fe: number;
  zn: number;
  latitude: number;
  longitude: number;
}

interface SoilOutput {
  soil_fertility_status: string;
  soil_fertility_confidence: number;
  fertilizer_recommendation: string;
  fertilizer_confidence: number;
  explanation?: string;
  recommendations?: string[];
  structured_response?: StructuredResponse;
  timestamp: string;
  nearest_agrovets: any[];
}

export default function SoilFertilityDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [soilData, setSoilData] = useState<SoilInput>({
    simplified_texture: "",
    ph: 0,
    n: 0,
    p: 0,
    k: 0,
    o: 0,
    ca: 0,
    mg: 0,
    cu: 0,
    fe: 0,
    zn: 0,
    latitude: 0,
    longitude: 0,
  });

  const [results, setResults] = useState<SoilOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Authentication logic (same as before)
  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  // Loading screen
  if (status === "loading") {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-green-25 via-amber-25 to-green-25">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          <div className="text-center">
            <h3 className="text-lg font-medium text-green-800">Loading...</h3>
            <p className="text-green-600">Checking authentication status</p>
          </div>
        </div>
      </div>
    );
  }

  // Access denied screen
  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-green-25 via-amber-25 to-green-25">
        <Card className="w-full max-w-md border-red-200 bg-white shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-red-800">Access Denied</CardTitle>
            <CardDescription className="text-red-600">
              You need to be logged in to access the soil analysis dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={() => router.push("/auth/login")}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              Sign In
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/")}
              className="w-full border-green-200 text-green-700 hover:bg-green-50"
            >
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleInputChange = (
    field: keyof SoilInput,
    value: string | number
  ) => {
    setSoilData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleLocationDetected = (lat: number, lng: number) => {
    setSoilData((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lng,
    }));
  };

  const handlePredict = async () => {
    if (!session?.accessToken) {
      setError("Authentication token not found. Please sign in again.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("http://127.0.0.1:8000/predict", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify(soilData),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Authentication failed. Please sign in again.");
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const apiResults = await response.json();
      const resultsWithTimestamp: SoilOutput = {
        ...apiResults,
        timestamp: apiResults.timestamp || new Date().toISOString(),
      };

      setResults(resultsWithTimestamp);
    } catch (err) {
      console.error("Error calling API:", err);
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred while analyzing soil data"
      );

      if (err instanceof Error && err.message.includes("Authentication")) {
        setTimeout(() => {
          signOut({ callbackUrl: "/auth/login" });
        }, 2000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Convert results to SoilData format for shared components
  const soilAnalysisData: SoilData | null = results
    ? {
        simplified_texture: soilData.simplified_texture,
        soil_ph: soilData.ph,
        nitrogen: soilData.n,
        phosphorus: soilData.p,
        potassium: soilData.k,
        organic_matter: soilData.o,
        calcium: soilData.ca,
        magnesium: soilData.mg,
        copper: soilData.cu,
        iron: soilData.fe,
        zinc: soilData.zn,
        fertility_prediction: results.soil_fertility_status,
        fertility_confidence: results.soil_fertility_confidence,
        fertilizer_recommendation: results.fertilizer_recommendation,
        fertilizer_confidence: results.fertilizer_confidence,
        structured_response: results.structured_response,
        agrovets: results.nearest_agrovets,
      }
    : null;

  const nutrientData = results
    ? [
        {
          name: "Nitrogen",
          value: soilData.n,
          unit: "mg/kg",
          optimal: { min: 40, max: 60 },
          icon: <Leaf className="h-4 w-4 text-green-600" />,
        },
        {
          name: "Phosphorus",
          value: soilData.p,
          unit: "mg/kg",
          optimal: { min: 30, max: 50 },
          icon: <TrendingUp className="h-4 w-4 text-yellow-600" />,
        },
        // Add other nutrients as needed
      ]
    : [];

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Navbar />

        <main className="flex-1 space-y-6 p-6 bg-gradient-to-br from-green-25 via-amber-25 to-green-25 min-h-screen">
          <div className="space-y-2">
            <h1 className="text-3xl font-serif font-bold text-green-800">
              Soil Fertility Analysis
            </h1>
            <p className="text-green-600 font-serif">
              Comprehensive soil health assessment and fertilizer
              recommendations
            </p>
          </div>

          <div className="space-y-2">
            <LocationDetector onLocationDetected={handleLocationDetected} />
          </div>

          {/* Error Display */}
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

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Input Section - Keep original form */}
            <div className="lg:col-span-1">
              <Card className="border-amber-200 bg-white shadow-lg">
                <CardHeader className="bg-gradient-to-r from-green-50 to-amber-50 border-b border-amber-200">
                  <CardTitle className="flex items-center gap-2 text-green-800">
                    <Beaker className="h-5 w-5" />
                    Soil Analysis Input
                  </CardTitle>
                  <CardDescription className="text-green-600">
                    Enter your soil test results for comprehensive analysis
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <Tabs defaultValue="basic" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 bg-green-50">
                      <TabsTrigger
                        value="basic"
                        className="data-[state=active]:bg-green-600 data-[state=active]:text-white"
                      >
                        Basic
                      </TabsTrigger>
                      <TabsTrigger
                        value="nutrients"
                        className="data-[state=active]:bg-green-600 data-[state=active]:text-white"
                      >
                        Macro
                      </TabsTrigger>
                      <TabsTrigger
                        value="micronutrients"
                        className="data-[state=active]:bg-green-600 data-[state=active]:text-white"
                      >
                        Micro
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="basic" className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label
                          htmlFor="texture"
                          className="text-green-700 font-medium"
                        >
                          Soil Texture
                        </Label>
                        <Select
                          onValueChange={(value) =>
                            handleInputChange("simplified_texture", value)
                          }
                        >
                          <SelectTrigger className="border-amber-200 focus:border-green-500">
                            <SelectValue placeholder="Select soil texture" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Sandy">Sandy</SelectItem>
                            <SelectItem value="Loamy">Loamy</SelectItem>
                            <SelectItem value="Clay">Clay</SelectItem>
                            <SelectItem value="Silty">Silty</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="ph"
                          className="text-green-700 font-medium"
                        >
                          pH Level
                        </Label>
                        <Input
                          id="ph"
                          type="number"
                          step="0.1"
                          placeholder="6.8"
                          className="border-amber-200 focus:border-green-500"
                          onChange={(e) =>
                            handleInputChange(
                              "ph",
                              Number.parseFloat(e.target.value) || 0
                            )
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="organic"
                          className="text-green-700 font-medium"
                        >
                          Organic Content (%)
                        </Label>
                        <Input
                          id="organic"
                          type="number"
                          step="0.1"
                          placeholder="2.5"
                          className="border-amber-200 focus:border-green-500"
                          onChange={(e) =>
                            handleInputChange(
                              "o",
                              Number.parseFloat(e.target.value) || 0
                            )
                          }
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="nutrients" className="space-y-4 mt-4">
                      <div className="grid grid-cols-1 gap-4">
                        {[
                          {
                            key: "n",
                            label: "Nitrogen (N)",
                            placeholder: "45.5",
                          },
                          {
                            key: "p",
                            label: "Phosphorus (P)",
                            placeholder: "35.2",
                          },
                          {
                            key: "k",
                            label: "Potassium (K)",
                            placeholder: "180.0",
                          },
                        ].map((nutrient) => (
                          <div key={nutrient.key} className="space-y-2">
                            <Label className="text-green-700 font-medium">
                              {nutrient.label} (mg/kg)
                            </Label>
                            <Input
                              type="number"
                              step="0.1"
                              placeholder={nutrient.placeholder}
                              className="border-amber-200 focus:border-green-500"
                              onChange={(e) =>
                                handleInputChange(
                                  nutrient.key as keyof SoilInput,
                                  Number.parseFloat(e.target.value) || 0
                                )
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent
                      value="micronutrients"
                      className="space-y-4 mt-4"
                    >
                      <div className="grid grid-cols-1 gap-4">
                        {[
                          {
                            key: "ca",
                            label: "Calcium (Ca)",
                            placeholder: "1250",
                          },
                          {
                            key: "mg",
                            label: "Magnesium (Mg)",
                            placeholder: "220",
                          },
                          {
                            key: "cu",
                            label: "Copper (Cu)",
                            placeholder: "1.8",
                          },
                          {
                            key: "fe",
                            label: "Iron (Fe)",
                            placeholder: "45.0",
                          },
                          { key: "zn", label: "Zinc (Zn)", placeholder: "2.2" },
                        ].map((micronutrient) => (
                          <div key={micronutrient.key} className="space-y-2">
                            <Label className="text-green-700 font-medium">
                              {micronutrient.label} (mg/kg)
                            </Label>
                            <Input
                              type="number"
                              step="0.1"
                              placeholder={micronutrient.placeholder}
                              className="border-amber-200 focus:border-green-500"
                              onChange={(e) =>
                                handleInputChange(
                                  micronutrient.key as keyof SoilInput,
                                  Number.parseFloat(e.target.value) || 0
                                )
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                  </Tabs>

                  <Button
                    onClick={handlePredict}
                    className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white"
                    disabled={
                      isLoading ||
                      !soilData.simplified_texture ||
                      !soilData.latitude ||
                      !soilData.longitude
                    }
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing Soil...
                      </>
                    ) : (
                      "Analyze Soil Health"
                    )}
                  </Button>
                  {(!soilData.latitude || !soilData.longitude) && (
                    <div className="mt-2 text-xs text-amber-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      <span>Location detection required for analysis</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Results Section - Using shared components */}
            <div className="lg:col-span-2 space-y-6">
              {soilAnalysisData ? (
                <>
                  {/* Status Cards - Using shared component */}
                  <StatusSummaryCards soilData={soilAnalysisData} />

                  {/* Nutrient Analysis - Using shared component */}
                  <NutrientDisplay
                    soilData={soilAnalysisData}
                    showOptimalRanges={true}
                  />

                  {/* Comprehensive Analysis - Using shared component */}
                  {soilAnalysisData.structured_response && (
                    <ComprehensiveAnalysis
                      structuredResponse={soilAnalysisData.structured_response}
                    />
                  )}

                  {/* Action Plan & Recommendations - Using shared component */}
                  {soilAnalysisData.structured_response && (
                    <ActionPlanRecommendations
                      structuredResponse={soilAnalysisData.structured_response}
                    />
                  )}

                  {/* Legacy fallback for old format */}
                  {!soilAnalysisData.structured_response &&
                    results?.explanation && (
                      <Card className="border-amber-200 bg-white shadow-lg">
                        <CardHeader className="bg-gradient-to-r from-green-50 to-amber-50 border-b border-amber-200">
                          <CardTitle className="flex items-center gap-2 text-green-800">
                            <FileText className="h-5 w-5" />
                            Detailed Analysis & Recommendations (Legacy)
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                          <div className="bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-lg border border-blue-200">
                            <h4 className="text-blue-900 font-semibold mb-2 flex items-center gap-2">
                              <Beaker className="h-4 w-4" />
                              Soil Analysis Summary
                            </h4>
                            <p className="text-blue-800 text-sm leading-relaxed">
                              {results.explanation}
                            </p>
                          </div>

                          {results.recommendations && (
                            <div className="space-y-4">
                              <h4 className="font-semibold text-green-800 text-lg">
                                Action Items:
                              </h4>
                              <div className="grid gap-3">
                                {results.recommendations.map((rec, index) => (
                                  <div
                                    key={index}
                                    className="bg-gradient-to-r from-amber-50 to-green-50 p-4 rounded-lg border border-amber-200 shadow-sm"
                                  >
                                    <p className="text-sm text-gray-700 leading-relaxed">
                                      {rec
                                        .replace(/\*\*(.*?)\*\*/g, "$1")
                                        .replace(/^\d+\.\s*/, "")}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}

                  {/* Agrovets - Using shared component */}
                  {soilAnalysisData.agrovets && (
                    <AgrovetsDisplay agrovets={soilAnalysisData.agrovets} />
                  )}
                </>
              ) : (
                <Card className="border-amber-200 bg-white shadow-lg">
                  <CardContent className="flex items-center justify-center h-64">
                    <div className="text-center space-y-4">
                      <Leaf className="h-12 w-12 text-green-400 mx-auto" />
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          Ready for Analysis
                        </h3>
                        <p className="text-gray-500">
                          Enter your soil parameters to get started
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
