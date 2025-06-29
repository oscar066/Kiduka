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
import {
  Beaker,
  Leaf,
  Zap,
  Droplets,
  Mountain,
  Atom,
  Sparkles,
  FileText,
  TrendingUp,
  AlertCircle,
  Loader2,
  Lock,
  Clock,
  Target,
  Activity,
  CheckCircle,
  AlertTriangle,
  Info,
} from "lucide-react";
import { LocationDetector } from "./location-detector";
import { AgrovetsSection } from "./agrovets/agrovets-section";

interface Agrovet {
  name: string;
  latitude: number;
  longitude: number;
  products: string[];
  prices: number[];
  distance_km: number;
}

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

interface Recommendation {
  category: string;
  priority: string;
  action: string;
  reasoning: string;
  timeframe: string;
}

interface StructuredResponse {
  explanation: {
    summary: string;
    fertility_analysis: string;
    nutrient_analysis: string;
    ph_analysis: string;
    soil_texture_analysis: string;
    overall_assessment: string;
  };
  recommendations: Recommendation[];
  fertilizer_justification: string;
  confidence_assessment: string;
  long_term_strategy: string;
}

interface SoilOutput {
  soil_fertility_status: string;
  soil_fertility_confidence: number;
  fertilizer_recommendation: string;
  fertilizer_confidence: number;
  explanation?: string; // Legacy field
  recommendations?: string[]; // Legacy field
  structured_response?: StructuredResponse;
  timestamp: string;
  nearest_agrovets: Agrovet[];
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

  // Redirect unauthenticated users
  useEffect(() => {
    if (status === "loading") return; // Still loading session

    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  // Show loading screen while checking authentication
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

  // Show access denied for unauthenticated users (fallback)
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
          // Include auth token if your FastAPI backend requires it
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

      // Add timestamp if not provided by API
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

      // If authentication error, redirect to login
      if (err instanceof Error && err.message.includes("Authentication")) {
        setTimeout(() => {
          signOut({ callbackUrl: "/auth/login" });
        }, 2000);
      }
    } finally {
      setIsLoading(false);
    }
  };

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
          icon: <Zap className="h-4 w-4 text-yellow-600" />,
        },
        {
          name: "Potassium",
          value: soilData.k,
          unit: "mg/kg",
          optimal: { min: 150, max: 200 },
          icon: <Mountain className="h-4 w-4 text-purple-600" />,
        },
        {
          name: "Calcium",
          value: soilData.ca,
          unit: "mg/kg",
          optimal: { min: 1000, max: 1500 },
          icon: <Droplets className="h-4 w-4 text-blue-600" />,
        },
        {
          name: "Magnesium",
          value: soilData.mg,
          unit: "mg/kg",
          optimal: { min: 200, max: 300 },
          icon: <Sparkles className="h-4 w-4 text-pink-600" />,
        },
        {
          name: "Organic Content",
          value: soilData.o,
          unit: "%",
          optimal: { min: 3, max: 5 },
          icon: <Atom className="h-4 w-4 text-amber-600" />,
        },
      ]
    : [];

  // Helper function to get priority color and icon
  const getPriorityStyle = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "high":
        return {
          color: "text-red-700",
          bg: "bg-red-50",
          border: "border-red-200",
          icon: <AlertTriangle className="h-4 w-4 text-red-600" />,
        };
      case "medium":
        return {
          color: "text-yellow-700",
          bg: "bg-yellow-50",
          border: "border-yellow-200",
          icon: <AlertCircle className="h-4 w-4 text-yellow-600" />,
        };
      case "low":
        return {
          color: "text-blue-700",
          bg: "bg-blue-50",
          border: "border-blue-200",
          icon: <Info className="h-4 w-4 text-blue-600" />,
        };
      default:
        return {
          color: "text-gray-700",
          bg: "bg-gray-50",
          border: "border-gray-200",
          icon: <Info className="h-4 w-4 text-gray-600" />,
        };
    }
  };

  // Helper function to get timeframe style
  const getTimeframeStyle = (timeframe: string) => {
    switch (timeframe.toLowerCase()) {
      case "immediate":
        return {
          color: "text-red-600",
          icon: <Target className="h-3 w-3" />,
        };
      case "within_week":
        return {
          color: "text-orange-600",
          icon: <Clock className="h-3 w-3" />,
        };
      case "seasonal":
        return {
          color: "text-yellow-600",
          icon: <Activity className="h-3 w-3" />,
        };
      case "ongoing":
        return {
          color: "text-blue-600",
          icon: <CheckCircle className="h-3 w-3" />,
        };
      default:
        return {
          color: "text-gray-600",
          icon: <Clock className="h-3 w-3" />,
        };
    }
  };

  // Only render the dashboard if user is authenticated
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
            {/* Input Section */}
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

            {/* Results Section */}
            <div className="lg:col-span-2 space-y-6">
              {results ? (
                <>
                  {/* Status Cards */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <SoilHealthCard
                      status={results.soil_fertility_status}
                      confidence={results.soil_fertility_confidence}
                      texture={soilData.simplified_texture}
                      ph={soilData.ph}
                    />
                    <FertilizerRecommendation
                      fertilizer={results.fertilizer_recommendation}
                      confidence={results.fertilizer_confidence}
                      timestamp={results.timestamp}
                    />
                  </div>

                  {/* Nutrient Analysis */}
                  <Card className="border-amber-200 bg-white shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-green-50 to-amber-50 border-b border-amber-200">
                      <CardTitle className="flex items-center gap-2 text-green-800">
                        <TrendingUp className="h-5 w-5" />
                        Nutrient Analysis
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {nutrientData.map((nutrient) => (
                          <NutrientGauge key={nutrient.name} {...nutrient} />
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Comprehensive Analysis */}
                  {results.structured_response && (
                    <Card className="border-amber-200 bg-white shadow-lg">
                      <CardHeader className="bg-gradient-to-r from-green-50 to-amber-50 border-b border-amber-200">
                        <CardTitle className="flex items-center gap-2 text-green-800">
                          <FileText className="h-5 w-5" />
                          Comprehensive Soil Analysis
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 space-y-6">
                        {/* Summary */}
                        <div className="bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-lg border border-blue-200">
                          <h4 className="text-blue-900 font-semibold mb-2 flex items-center gap-2">
                            <Beaker className="h-4 w-4" />
                            Executive Summary
                          </h4>
                          <p className="text-blue-800 text-sm leading-relaxed">
                            {results.structured_response.explanation.summary}
                          </p>
                        </div>

                        {/* Detailed Analysis Sections */}
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-3">
                            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                              <h5 className="font-medium text-amber-900 mb-2">
                                Fertility Analysis
                              </h5>
                              <p className="text-sm text-amber-800 leading-relaxed">
                                {
                                  results.structured_response.explanation
                                    .fertility_analysis
                                }
                              </p>
                            </div>

                            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                              <h5 className="font-medium text-green-900 mb-2">
                                pH Analysis
                              </h5>
                              <p className="text-sm text-green-800 leading-relaxed">
                                {
                                  results.structured_response.explanation
                                    .ph_analysis
                                }
                              </p>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                              <h5 className="font-medium text-purple-900 mb-2">
                                Nutrient Analysis
                              </h5>
                              <p className="text-sm text-purple-800 leading-relaxed">
                                {
                                  results.structured_response.explanation
                                    .nutrient_analysis
                                }
                              </p>
                            </div>

                            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                              <h5 className="font-medium text-yellow-900 mb-2">
                                Soil Texture Analysis
                              </h5>
                              <p className="text-sm text-yellow-800 leading-relaxed">
                                {
                                  results.structured_response.explanation
                                    .soil_texture_analysis
                                }
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Overall Assessment */}
                        <div className="bg-gradient-to-r from-slate-50 to-gray-50 p-4 rounded-lg border border-slate-200">
                          <h4 className="text-slate-900 font-semibold mb-2 flex items-center gap-2">
                            <Target className="h-4 w-4" />
                            Overall Assessment
                          </h4>
                          <p className="text-slate-800 text-sm leading-relaxed">
                            {
                              results.structured_response.explanation
                                .overall_assessment
                            }
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Action Plan & Recommendations */}
                  {results.structured_response && (
                    <Card className="border-amber-200 bg-white shadow-lg">
                      <CardHeader className="bg-gradient-to-r from-green-50 to-amber-50 border-b border-amber-200">
                        <CardTitle className="flex items-center gap-2 text-green-800">
                          <CheckCircle className="h-5 w-5" />
                          Action Plan & Recommendations
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 space-y-6">
                        {/* Fertilizer Justification */}
                        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-4 rounded-lg border border-emerald-200">
                          <h4 className="text-emerald-900 font-semibold mb-2 flex items-center gap-2">
                            <Leaf className="h-4 w-4" />
                            Fertilizer Recommendation Justification
                          </h4>
                          <p className="text-emerald-800 text-sm leading-relaxed">
                            {
                              results.structured_response
                                .fertilizer_justification
                            }
                          </p>
                        </div>

                        {/* Categorized Recommendations */}
                        <div className="space-y-4">
                          <h4 className="font-semibold text-green-800 text-lg">
                            Prioritized Action Items:
                          </h4>

                          {/* Group recommendations by priority */}
                          {["high", "medium", "low"].map((priority) => {
                            const priorityRecs =
                              results.structured_response!.recommendations.filter(
                                (rec) => rec.priority.toLowerCase() === priority
                              );

                            if (priorityRecs.length === 0) return null;

                            const priorityStyle = getPriorityStyle(priority);

                            return (
                              <div key={priority} className="space-y-3">
                                <h5
                                  className={`font-medium text-lg ${priorityStyle.color} flex items-center gap-2 capitalize`}
                                >
                                  {priorityStyle.icon}
                                  {priority} Priority Actions
                                </h5>

                                <div className="grid gap-3">
                                  {priorityRecs.map((rec, index) => {
                                    const timeframeStyle = getTimeframeStyle(
                                      rec.timeframe
                                    );

                                    return (
                                      <div
                                        key={`${priority}-${index}`}
                                        className={`p-4 rounded-lg border ${priorityStyle.bg} ${priorityStyle.border} shadow-sm`}
                                      >
                                        <div className="flex items-start justify-between mb-2">
                                          <div className="flex items-center gap-2">
                                            <span
                                              className={`text-xs font-medium px-2 py-1 rounded-full ${priorityStyle.bg} ${priorityStyle.color} border`}
                                            >
                                              {rec.category
                                                .replace("_", " ")
                                                .toUpperCase()}
                                            </span>
                                          </div>
                                          <div
                                            className={`flex items-center gap-1 text-xs ${timeframeStyle.color}`}
                                          >
                                            {timeframeStyle.icon}
                                            <span className="capitalize">
                                              {rec.timeframe.replace("_", " ")}
                                            </span>
                                          </div>
                                        </div>

                                        <h6
                                          className={`font-medium ${priorityStyle.color} mb-2`}
                                        >
                                          {rec.action}
                                        </h6>

                                        <p className="text-sm text-gray-700 leading-relaxed">
                                          {rec.reasoning}
                                        </p>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Confidence Assessment */}
                        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-4 rounded-lg border border-indigo-200">
                          <h4 className="text-indigo-900 font-semibold mb-2 flex items-center gap-2">
                            <Activity className="h-4 w-4" />
                            Confidence Assessment
                          </h4>
                          <p className="text-indigo-800 text-sm leading-relaxed">
                            {results.structured_response.confidence_assessment}
                          </p>
                        </div>

                        {/* Long-term Strategy */}
                        <div className="bg-gradient-to-r from-violet-50 to-purple-50 p-4 rounded-lg border border-violet-200">
                          <h4 className="text-violet-900 font-semibold mb-2 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            Long-term Soil Health Strategy
                          </h4>
                          <p className="text-violet-800 text-sm leading-relaxed">
                            {results.structured_response.long_term_strategy}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
<<<<<<< HEAD
=======

                  {/* Legacy fallback for old format */}
                  {!results.structured_response && results.explanation && (
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

>>>>>>> 914bdb2a0fd0d580106dc088eb30dc234ff3f755
                  {results && results.nearest_agrovets && (
                    <AgrovetsSection
                      agrovets={results.nearest_agrovets}
                      recommendedFertilizer={results.fertilizer_recommendation}
                    />
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
