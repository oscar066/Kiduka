// components/MainDashboard.tsx
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { Navbar } from "./navbar";

import {
  ChevronRight,
  BarChart3,
  MapPin,
  Calendar,
  Leaf,
  Beaker,
  TrendingUp,
  Clock,
  ArrowRight,
  Sparkles,
  Activity,
  Globe,
  Users,
  Loader2,
  AlertCircle,
  Star,
} from "lucide-react";

// Types from backend API
interface PredictionHistory {
  id: string;
  created_at: string;
  simplified_texture?: string;
  soil_ph?: number;
  fertility_prediction?: string;
  fertility_confidence?: number;
  fertilizer_recommendation?: string;
  fertilizer_confidence?: number;
  location_name?: string;
  structured_response?: any;
}

interface DashboardStats {
  totalAnalyses: number;
  healthyFields: number;
  moderateFields: number;
  poorFields: number;
  averageConfidence: number;
  lastAnalysisDate?: string;
  nearbyAgrovets: number;
}

interface PredictionListResponse {
  predictions: PredictionHistory[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export default function MainDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [recentAnalyses, setRecentAnalyses] = useState<PredictionHistory[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalAnalyses: 0,
    healthyFields: 0,
    moderateFields: 0,
    poorFields: 0,
    averageConfidence: 0,
    nearbyAgrovets: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Fetch real data from backend
  useEffect(() => {
    if (session?.accessToken) {
      fetchDashboardData();
    }
  }, [session]);

  const fetchDashboardData = async () => {
    if (!session?.accessToken) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch prediction history
      const predictionsResponse = await fetch(
        "http://127.0.0.1:8000/predictions?size=5&sort_order=desc",
        {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
        }
      );

      if (!predictionsResponse.ok) {
        throw new Error("Failed to fetch predictions");
      }

      const predictionsData: PredictionListResponse =
        await predictionsResponse.json();
      setRecentAnalyses(predictionsData.predictions);

      // Calculate dashboard stats from the data
      const stats = calculateDashboardStats(predictionsData);
      setDashboardStats(stats);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load dashboard data"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const calculateDashboardStats = (
    data: PredictionListResponse
  ): DashboardStats => {
    const predictions = data.predictions;
    const total = data.total;

    let healthyCount = 0;
    let moderateCount = 0;
    let poorCount = 0;
    let totalConfidence = 0;
    let confidenceCount = 0;

    predictions.forEach((prediction) => {
      // Count fertility status
      const status = prediction.fertility_prediction?.toLowerCase();
      if (status === "healthy") healthyCount++;
      else if (status === "moderately healthy") moderateCount++;
      else if (status === "poor") poorCount++;

      // Calculate average confidence
      if (prediction.fertility_confidence) {
        totalConfidence += prediction.fertility_confidence;
        confidenceCount++;
      }
    });

    return {
      totalAnalyses: total,
      healthyFields: healthyCount,
      moderateFields: moderateCount,
      poorFields: poorCount,
      averageConfidence:
        confidenceCount > 0 ? totalConfidence / confidenceCount : 0,
      lastAnalysisDate: predictions[0]?.created_at,
      nearbyAgrovets: 12, // This would come from a separate endpoint
    };
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case "healthy":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "moderately healthy":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "poor":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getUserName = () => {
    return session?.user?.name?.split(" ")[0] || "Farmer";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <Navbar />
          <main className="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-green-25 via-amber-25 to-green-25 min-h-screen">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-green-600 mx-auto" />
              <p className="text-green-700">Loading your dashboard...</p>
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Navbar />

        <main className="flex-1 space-y-8 p-6 bg-gradient-to-br from-green-25 via-amber-25 to-green-25 min-h-screen">
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

          {/* Welcome Section - Enhanced */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 via-slate-700 to-slate-600 p-8 text-white shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-green-600/20 to-amber-500/20"></div>
            <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
                  <Leaf className="h-8 w-8 text-amber-300" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-white">
                    {getGreeting()}, {getUserName()}! 👋
                  </h1>
                  <p className="text-slate-200 text-xl mt-2">
                    Ready to optimize your farming with AI-powered soil
                    analysis?
                  </p>
                </div>
              </div>
            </div>
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-amber-400/10"></div>
            <div className="absolute -left-4 -bottom-4 h-24 w-24 rounded-full bg-green-400/10"></div>
          </div>

          {/* Quick Stats Cards - Modern Design */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border border-slate-200 bg-white shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6 text-center">
                <div className="space-y-3">
                  <div className="p-3 bg-slate-100 rounded-xl w-fit mx-auto">
                    <Activity className="h-6 w-6 text-slate-600" />
                  </div>
                  <div className="text-3xl font-bold text-slate-800">
                    {dashboardStats.totalAnalyses}
                  </div>
                  <div className="text-sm text-slate-600 font-medium">
                    Total Analyses
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200 bg-white shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6 text-center">
                <div className="space-y-3">
                  <div className="p-3 bg-green-100 rounded-xl w-fit mx-auto">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="text-3xl font-bold text-slate-800">
                    {dashboardStats.healthyFields}
                  </div>
                  <div className="text-sm text-slate-600 font-medium">
                    Healthy Fields
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200 bg-white shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6 text-center">
                <div className="space-y-3">
                  <div className="p-3 bg-amber-100 rounded-xl w-fit mx-auto">
                    <Star className="h-6 w-6 text-amber-600" />
                  </div>
                  <div className="text-3xl font-bold text-slate-800">
                    {Math.round(dashboardStats.averageConfidence * 100)}%
                  </div>
                  <div className="text-sm text-slate-600 font-medium">
                    Avg Confidence
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200 bg-white shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6 text-center">
                <div className="space-y-3">
                  <div className="p-3 bg-blue-100 rounded-xl w-fit mx-auto">
                    <Globe className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="text-3xl font-bold text-slate-800">
                    {dashboardStats.nearbyAgrovets}
                  </div>
                  <div className="text-sm text-slate-600 font-medium">
                    Nearby Stores
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Action Card - Enhanced */}
          <Card className="border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <CardContent className="p-8">
              <div className="flex items-center justify-between">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="p-4 bg-amber-100 rounded-xl border border-amber-200">
                      <Beaker className="h-8 w-8 text-amber-700" />
                    </div>
                    <div>
                      <h3 className="text-3xl font-bold text-slate-800">
                        Quick Soil Analysis
                      </h3>
                      <p className="text-slate-600 text-lg">
                        Get AI-powered soil health insights in minutes
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-slate-600">
                    <Sparkles className="h-5 w-5 text-amber-600" />
                    <span className="font-medium">
                      Advanced ML Models • Real-time Results • Expert
                      Recommendations
                    </span>
                  </div>
                </div>
                <Button
                  onClick={() => router.push("/soil-analysis")}
                  size="lg"
                  className="bg-amber-600 hover:bg-amber-700 text-white px-8 py-4 text-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  START ANALYSIS
                  <ArrowRight className="ml-3 h-6 w-6" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Access Cards - Modern Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card
              className="border-0 bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group"
              onClick={() => router.push("/reports")}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-amber-100 rounded-xl group-hover:bg-amber-200 transition-colors">
                        <BarChart3 className="h-6 w-6 text-amber-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-xl">
                          Analysis Reports
                        </h3>
                        <p className="text-gray-600">
                          View detailed history & insights
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-sm text-gray-600">
                      <span className="flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        {dashboardStats.totalAnalyses} total reports
                      </span>
                      {dashboardStats.lastAnalysisDate && (
                        <span className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Last: {formatDate(dashboardStats.lastAnalysisDate)}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-6 w-6 text-gray-400 group-hover:text-amber-600 transition-colors" />
                </div>
              </CardContent>
            </Card>

            <Card
              className="border-0 bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group"
              onClick={() => router.push("/agrovets")}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-green-100 rounded-xl group-hover:bg-green-200 transition-colors">
                        <MapPin className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-xl">
                          Nearby Agrovets
                        </h3>
                        <p className="text-gray-600">
                          Find fertilizer suppliers near you
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-sm text-gray-600">
                      <span className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        {dashboardStats.nearbyAgrovets} verified stores
                      </span>
                      <span className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Trusted suppliers
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-6 w-6 text-gray-400 group-hover:text-green-600 transition-colors" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Analysis Section - Enhanced */}
          <Card className="border-0 bg-white/90 backdrop-blur-sm shadow-xl">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100 rounded-t-lg">
              <CardTitle className="flex items-center justify-between text-green-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Clock className="h-5 w-5 text-green-600" />
                  </div>
                  Recent Analysis
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/reports")}
                  className="border-green-200 text-green-700 hover:bg-green-50 font-medium"
                >
                  View All Reports
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </CardTitle>
              <CardDescription className="text-green-600">
                Your latest soil analysis results and recommendations
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {recentAnalyses.length > 0 ? (
                  recentAnalyses.map((analysis) => (
                    <div
                      key={analysis.id}
                      className="p-5 rounded-xl border border-gray-200 bg-gradient-to-r from-gray-50 to-white hover:shadow-lg transition-all duration-300 cursor-pointer group hover:border-green-200"
                      onClick={() => router.push(`/reports/${analysis.id}`)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="space-y-3 flex-1">
                          <div className="flex items-center gap-3 text-sm text-gray-600">
                            <Calendar className="h-4 w-4" />
                            <span className="font-medium">
                              {formatDate(analysis.created_at)}
                            </span>
                            {analysis.location_name && (
                              <>
                                <MapPin className="h-4 w-4 ml-2" />
                                <span>{analysis.location_name}</span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-4">
                            <Badge
                              className={getStatusColor(
                                analysis.fertility_prediction
                              )}
                            >
                              {analysis.fertility_prediction?.toUpperCase() ||
                                "UNKNOWN"}
                            </Badge>
                            {analysis.fertility_confidence && (
                              <span className="text-sm text-gray-600">
                                {Math.round(
                                  analysis.fertility_confidence * 100
                                )}
                                % confidence
                              </span>
                            )}
                          </div>
                          {analysis.fertilizer_recommendation && (
                            <div className="text-sm text-gray-700">
                              <span className="font-medium text-green-700">
                                Recommended:
                              </span>{" "}
                              <span className="font-semibold">
                                {analysis.fertilizer_recommendation}
                              </span>
                            </div>
                          )}
                          {analysis.soil_ph && (
                            <div className="text-xs text-gray-500">
                              pH: {analysis.soil_ph.toFixed(1)} • Texture:{" "}
                              {analysis.simplified_texture || "N/A"}
                            </div>
                          )}
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-green-600 transition-colors ml-4" />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <div className="p-4 bg-green-100 rounded-full w-fit mx-auto mb-4">
                      <Leaf className="h-12 w-12 text-green-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      No analysis yet
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Start your first soil analysis to see detailed results and
                      recommendations here
                    </p>
                    <Button
                      onClick={() => router.push("/soil-analysis")}
                      className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 text-lg font-semibold"
                    >
                      <Beaker className="mr-2 h-5 w-5" />
                      Start Your First Analysis
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
