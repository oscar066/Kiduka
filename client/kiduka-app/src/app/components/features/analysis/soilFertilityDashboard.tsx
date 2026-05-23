"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

// Import components
import UnifiedSidebar from "../../layout/UnifiedSidebar";
import { Navbar } from "../../layout/navbar";
import { LocationDetector } from "../../shared/location-detector";
import { SessionGuard } from "../../shared/SessionGuard";
import { apiClient } from "@/lib/api-client";

// Import shared components
import { NutrientDisplay } from "./components/nutrientDisplay";
import { AgrovetsDisplay } from "./components/agrovetDisplay";
import { StatusSummaryCards } from "./components/statusSummaryCard";
import { SoilInputForm } from "./components/soil-inputForm";

import { Leaf, AlertCircle } from "lucide-react";

// import types
import { SoilInput, PredictionResponse } from "@/types/soil-analysis";

export default function SoilFertilityDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [soilData, setSoilData] = useState<SoilInput>({
    ph: 0,
    latitude: 0,
    longitude: 0,
  });

  const[results, setResults] = useState<PredictionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (
    field: keyof SoilInput,
    value: string | number | undefined
  ) => {
    setSoilData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleLocationDetected = (lat: number, lng: number, name?: string) => {
    setSoilData((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      location_name: name,
    }));
  };

  const handleFormSubmit = async () => {
    if (!session?.accessToken) {
      setError("Authentication token not found. Please sign in again.");
      return;
    }

    // Validate pH is required and within limits
    if (!soilData.ph || soilData.ph <= 0 || soilData.ph > 14) {
      setError("Please enter a valid pH value (must be between 0 and 14).");
      return;
    }

    // Validate location is required
    if (!soilData.latitude || !soilData.longitude) {
      setError("Please enable location detection or enter coordinates.");
      return;
    }

    // Build the payload dynamically to drop missing/zero fields 
    // so the backend triggers the ML prediction mode correctly
    const payload: any = {
      ph: soilData.ph,
      latitude: soilData.latitude,
      longitude: soilData.longitude,
      location_name: soilData.location_name,
    };

    const optionalFields =['n', 'p', 'k', 'organic_carbon', 'ca', 'mg'] as const;
    for (const field of optionalFields) {
      const val = soilData[field];
      if (val !== undefined && val > 0) {
        payload[field] = val;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      const apiResults = await apiClient.makePrediction(
        payload as SoilInput,
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
    <SessionGuard message="You need to be logged in to access the soil analysis dashboard.">
      <SidebarProvider>
        <UnifiedSidebar />
        <SidebarInset>
          <Navbar />

          <main className="flex-1 space-y-6 p-6 bg-gradient-to-br from-green-25 via-amber-25 to-green-25 min-h-screen">
            <div className="space-y-2">
              <h1 className="text-3xl font-serif font-bold bg-gradient-to-r from-green-800 via-emerald-600 to-green-700 bg-clip-text text-transparent">
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
                      results={results}
                      showOptimalRanges={true}
                    />
                    {/* Agrovets */}
                    {results.nearest_agrovets && results.nearest_agrovets.length > 0 && (
                      <AgrovetsDisplay agrovets={results.nearest_agrovets} />
                    )}
                  </>
                ) : (
                  <Card className="border-amber-200 bg-white shadow-lg h-full">
                    <CardContent className="p-6 h-full flex flex-col justify-between">
                      <div className="text-center space-y-3 mb-6">
                        <div className="p-2 bg-green-100 rounded-full w-fit mx-auto">
                          <Leaf className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                          <h3 className="text-xl font-serif font-bold text-gray-900">
                            Ready for Analysis
                          </h3>
                          <p className="text-gray-500 mt-1">
                            Fill in your soil details on the left to get started
                          </p>
                        </div>
                      </div>

                      {/* 3-step guide */}
                      <div className="grid md:grid-cols-3 gap-4">
                        {[
                          {
                            step: "01",
                            icon: <AlertCircle className="h-5 w-5 text-blue-600" />,
                            iconBg: "bg-blue-100",
                            title: "Enter pH & Location",
                            desc: "Provide your soil pH and enable location. Have lab results? Add your nutrient values in the optional tab for a more precise analysis.",
                          },
                          {
                            step: "02",
                            icon: <Leaf className="h-5 w-5 text-green-600" />,
                            iconBg: "bg-green-100",
                            title: "Run Analysis",
                            desc: "Our AI model calculates your Soil Health Index and nutrient breakdown.",
                          },
                          {
                            step: "03",
                            icon: <AlertCircle className="h-5 w-5 text-amber-600" />,
                            iconBg: "bg-amber-100",
                            title: "Get Recommendations",
                            desc: "Receive fertilizer recommendations and find nearby agrovets.",
                          },
                        ].map(({ step, icon, iconBg, title, desc }) => (
                          <div
                            key={step}
                            className="flex flex-col items-center text-center p-4 rounded-xl border border-amber-100 bg-gradient-to-b from-green-50/50 to-white space-y-3"
                          >
                            <div className="relative">
                              <div className={`p-3 ${iconBg} rounded-xl`}>{icon}</div>
                              <span className="absolute -top-2 -right-2 text-[10px] font-bold text-white bg-green-600 rounded-full w-5 h-5 flex items-center justify-center">
                                {step}
                              </span>
                            </div>
                            <h4 className="font-semibold font-serif text-green-900 text-sm">{title}</h4>
                            <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </SessionGuard>
  );
}