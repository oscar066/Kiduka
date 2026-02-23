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
import UnifiedSidebar from "../../layout/UnifiedSidebar";
import { Navbar } from "../../layout/navbar";
import { LocationDetector } from "../../shared/location-detector";
import { apiClient } from "@/lib/api-client";

// Import shared components
import { ComprehensiveAnalysis } from "./soil-analysis/comprehensiveAnalysis";
import { ActionPlanRecommendations } from "./soil-analysis/actionPlanRecommendation";
import { NutrientDisplay } from "./soil-analysis/nutrientDisplay";
import { AgrovetsDisplay } from "./soil-analysis/agrovetDisplay";
import { StatusSummaryCards } from "./soil-analysis/statusSummaryCard";
import { SoilInputForm } from "./soil-analysis/soil-inputForm";

import { Leaf, AlertCircle, Loader2, Lock } from "lucide-react";

// import types
import { SoilInput, PredictionResponse } from "@/types/soil-analysis";

export default function SoilFertilityDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [soilData, setSoilData] = useState<SoilInput>({
    ph: 0,
    n: 0,
    p: 0,
    k: 0,
    organic_carbon: 0,
    ca: 0,
    mg: 0,
    latitude: 0,
    longitude: 0,
  });

  const [results, setResults] = useState<PredictionResponse | null>(null);
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

    // Validate numeric fields are greater than 0
    const numericFields = ['ph', 'n', 'p', 'k', 'organic_carbon', 'ca', 'mg'] as const;
    for (const field of numericFields) {
      if (soilData[field] <= 0) {
        setError(`Please enter a valid ${field.toUpperCase()} value (must be greater than 0).`);
        return;
      }
    }

    // Validate pH range
    if (soilData.ph > 14) {
      setError("pH must be between 0 and 14.");
      return;
    }

    // Validate location
    if (!soilData.latitude || !soilData.longitude) {
      setError("Please enable location detection or enter coordinates.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const apiResults = await apiClient.makePrediction(
        soilData,
        session.accessToken
      );
      const resultsWithTimestamp: PredictionResponse = {
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

  const showLocationWarning = !soilData.latitude || !soilData.longitude;

  return (
    <SidebarProvider>
      <UnifiedSidebar />
      <SidebarInset>
        <Navbar />

        <main className="flex-1 space-y-6 p-6 bg-gradient-to-br from-green-25 via-amber-25 to-green-25 min-h-screen">
          <div className="space-y-2">
            <h1 className="text-3xl font-serif font-bold text-green-800">
              Soil Fertility Analysis
            </h1>
            <p className="text-green-600 font-serif">
              Comprehensive soil health assessment and recommendations
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
              {results ? (
                <>
                  {/* Status Cards */}
                  <StatusSummaryCards results={results} soilInput={soilData} />

                  {/* Nutrient Analysis */}
                  <NutrientDisplay
                    soilInput={soilData}
                    showOptimalRanges={true}
                  />

                  {/* Classification Details */}
                  <ComprehensiveAnalysis
                    results={results}
                    soilInput={soilData}
                  />

                  {/* Action Plan & Recommendations */}
                  {results.recommendations.length > 0 && (
                    <ActionPlanRecommendations
                      recommendations={results.recommendations}
                    />
                  )}

                  {/* Agrovets */}
                  {results.nearest_agrovets && results.nearest_agrovets.length > 0 && (
                    <AgrovetsDisplay agrovets={results.nearest_agrovets} />
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
