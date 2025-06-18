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
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { Navbar } from "./navbar";
import { LocationDetector } from "./location-detector";

// Import shared components
import { ComprehensiveAnalysis } from "./soil-analysis/comprehensiveAnalysis";
import { ActionPlanRecommendations } from "./soil-analysis/actionPlanRecommendation";
import { NutrientDisplay } from "./soil-analysis/nutrientDisplay";
import { AgrovetsDisplay } from "./soil-analysis/agrovetDisplay";
import { StatusSummaryCards } from "./soil-analysis/statusSummaryCard";
import { SoilInputForm} from "./soil-analysis/soil-inputForm";

import { Leaf, AlertCircle, Loader2, Lock } from "lucide-react";

// import types
import { SoilData, SoilInput, SoilOutput } from "@/types/soil-analysis";

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

  // Authentication logic
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

  const handleFormSubmit = async () => {
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

  const showLocationWarning = !soilData.latitude || !soilData.longitude;

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
            {/* Input Section - Using modular form component */}
            <div className="lg:col-span-1">
              <SoilInputForm
                soilData={soilData}
                onInputChange={handleInputChange}
                onSubmit={handleFormSubmit}
                isLoading={isLoading}
                showLocationWarning={showLocationWarning}
              />
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
