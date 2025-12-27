"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Leaf,
  History,
  TrendingUp,
  MapPin,
  Loader2,
  Settings,
  BarChart3,
  Calendar,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

interface UserStats {
  totalPredictions: number;
  recentPredictions: number;
  favoriteTexture: string;
  averageFertility: string;
}

export function UserDashboard() {
  const { user, token } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [recentPredictions, setRecentPredictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      loadUserDashboardData();
    }
  }, [token]);

  const loadUserDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const predictionsData = await apiClient.getPredictionHistory(
        token!,
        1,
        5
      );
      setRecentPredictions(predictionsData.predictions || []);
      const totalPredictions = predictionsData.total || 0;
      const recentCount = predictionsData.predictions?.length || 0;
      setStats({
        totalPredictions,
        recentPredictions: recentCount,
        favoriteTexture: "Loamy",
        averageFertility: "Medium",
      });
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Alert variant="destructive" className="border-red-300">
            <AlertTitle className="font-serif">Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section with Gradient */}
      <div className="space-y-3">
        <h1 className="text-4xl font-serif font-bold bg-gradient-to-r from-green-700 via-emerald-600 to-green-600 bg-clip-text text-transparent">
          Welcome back, {user?.full_name || user?.username}!
        </h1>
        <p className="text-lg text-gray-600 font-serif">
          Ready to analyze your soil and get personalized recommendations?
        </p>
      </div>

      {/* Quick Stats - Enhanced */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-amber-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <BarChart3 className="h-7 w-7 text-blue-600" />
                </div>
                {!loading && <TrendingUp className="h-5 w-5 text-blue-500" />}
              </div>
              <div>
                {loading ? (
                  <>
                    <div className="h-9 w-16 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mt-2" />
                  </>
                ) : (
                  <>
                    <div className="text-3xl font-bold text-gray-900">
                      {stats?.totalPredictions || 0}
                    </div>
                    <div className="text-sm text-gray-600 font-medium mt-1">
                      Total Predictions
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="p-3 bg-green-100 rounded-xl">
                  <Calendar className="h-7 w-7 text-green-600" />
                </div>
                {!loading && <Sparkles className="h-5 w-5 text-green-500" />}
              </div>
              <div>
                {loading ? (
                  <>
                    <div className="h-9 w-16 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mt-2" />
                  </>
                ) : (
                  <>
                    <div className="text-3xl font-bold text-gray-900">
                      {stats?.recentPredictions || 0}
                    </div>
                    <div className="text-sm text-gray-600 font-medium mt-1">
                      This Month
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="p-3 bg-amber-100 rounded-xl">
                  <Leaf className="h-7 w-7 text-amber-600" />
                </div>
                {!loading && (
                  <div className="px-2 py-1 bg-amber-100 rounded text-xs font-semibold text-amber-700">
                    AVG
                  </div>
                )}
              </div>
              <div>
                {loading ? (
                  <>
                    <div className="h-9 w-20 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 w-28 bg-gray-200 rounded animate-pulse mt-2" />
                  </>
                ) : (
                  <>
                    <div className="text-3xl font-bold text-gray-900">
                      {stats?.averageFertility}
                    </div>
                    <div className="text-sm text-gray-600 font-medium mt-1">
                      Avg. Fertility
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="p-3 bg-emerald-100 rounded-xl">
                  <MapPin className="h-7 w-7 text-emerald-600" />
                </div>
              </div>
              <div>
                {loading ? (
                  <>
                    <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mt-2" />
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold text-gray-900">
                      {stats?.favoriteTexture}
                    </div>
                    <div className="text-sm text-gray-600 font-medium mt-1">
                      Favorite Texture
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions - Enhanced */}
      <div>
        <h2 className="text-2xl font-serif font-bold text-green-800 mb-4">
          Quick Actions
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link href="/analysis">
            <Card className="cursor-pointer group border-amber-200 hover:border-green-400 hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-4 bg-gradient-to-br from-green-100 to-emerald-100 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                    <Leaf className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 text-lg mb-1 group-hover:text-green-700 transition-colors">
                      New Soil Analysis
                    </h3>
                    <p className="text-gray-600 text-sm mb-3">
                      Analyze your soil and get fertilizer recommendations
                    </p>
                    <div className="flex items-center text-green-600 text-sm font-medium">
                      Start analysis
                      <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/history">
            <Card className="cursor-pointer group border-amber-200 hover:border-blue-400 hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-4 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                    <History className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 text-lg mb-1 group-hover:text-blue-700 transition-colors">
                      Prediction History
                    </h3>
                    <p className="text-gray-600 text-sm mb-3">
                      View your past soil analyses and recommendations
                    </p>
                    <div className="flex items-center text-blue-600 text-sm font-medium">
                      View history
                      <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/profile">
            <Card className="cursor-pointer group border-amber-200 hover:border-gray-400 hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-4 bg-gradient-to-br from-gray-100 to-slate-100 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                    <Settings className="h-8 w-8 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 text-lg mb-1 group-hover:text-gray-700 transition-colors">
                      Profile Settings
                    </h3>
                    <p className="text-gray-600 text-sm mb-3">
                      Update your account information and preferences
                    </p>
                    <div className="flex items-center text-gray-600 text-sm font-medium">
                      Manage profile
                      <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* Recent Predictions - Enhanced */}
      {recentPredictions.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-serif font-bold text-green-800">
              Recent Predictions
            </h2>
            <Link href="/history">
              <Button variant="ghost" className="text-green-600 hover:text-green-700 hover:bg-green-50">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <Card className="border-amber-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-green-50 via-emerald-50 to-green-50 border-b border-amber-200">
              <CardTitle className="flex items-center gap-2 text-green-800">
                <History className="h-5 w-5" />
                Latest Analysis Results
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                {recentPredictions.slice(0, 5).map((prediction: any, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-green-50/50 rounded-xl border border-gray-100 hover:border-green-200 hover:shadow-md transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Leaf className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {prediction.simplified_texture} Soil Analysis
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(prediction.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="px-3 py-1 bg-green-100 rounded-full">
                        <p className="text-sm font-semibold text-green-800">
                          {prediction.fertility_prediction}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {Math.round(prediction.fertility_confidence * 100)}% confidence
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty State if No Predictions */}
      {recentPredictions.length === 0 && (
        <Card className="border-amber-200">
          <CardContent className="p-12 text-center">
            <div className="max-w-md mx-auto space-y-4">
              <div className="p-4 bg-green-100 rounded-full w-fit mx-auto">
                <Leaf className="h-12 w-12 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">
                Start Your First Analysis
              </h3>
              <p className="text-gray-600">
                You haven't analyzed any soil samples yet. Get started now to receive personalized fertilizer recommendations!
              </p>
              <Link href="/analysis">
                <Button className="bg-green-600 hover:bg-green-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all mt-4">
                  <Leaf className="mr-2 h-5 w-5" />
                  Start Analysis
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
