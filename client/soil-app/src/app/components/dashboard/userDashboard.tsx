// components/dashboard/ UserDashboard.tsx;
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Leaf,
  History,
  TrendingUp,
  MapPin,
  Loader2,
  Settings,
  BarChart3,
  Calendar,
} from "lucide-react";

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
        favoriteTexture: "Loamy", // Placeholder
        averageFertility: "Medium", // Placeholder
      });
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-green-25 via-amber-25 to-green-25 min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-green-600 mx-auto" />
          <p className="text-green-700">Loading your dashboard...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-green-25 via-amber-25 to-green-25 min-h-screen">
        <div className="w-full max-w-md">
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 space-y-6 p-6 bg-gradient-to-br from-green-25 via-amber-25 to-green-25 min-h-screen">
      {/* Welcome Section */}
      <div className="space-y-2">
        <h1 className="text-3xl font-serif font-bold text-green-800">
          Welcome back, {user?.full_name || user?.username}!
        </h1>
        <p className="text-green-600 font-serif">
          Ready to analyze your soil and get personalized recommendations?
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <Card className="border border-amber-200">
          <CardContent className="text-center">
            <div className="space-y-3">
              <div className="p-3 bg-blue-100 rounded-xl w-fit mx-auto">
                <BarChart3 className="h-6 w-6 text-blue-500" />
              </div>
              <div className="text-3xl font-bold text-slate-800">
                {stats?.totalPredictions || 0}
              </div>
              <div className="text-sm text-slate-600 font-medium">
                Total Predictions
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-amber-200">
          <CardContent className="text-center">
            <div className="space-y-3">
              <div className="p-3 bg-green-100 rounded-xl w-fit mx-auto">
                <Calendar className="h-6 w-6 text-green-500" />
              </div>
              <div className="text-3xl font-bold text-slate-800">
                {stats?.recentPredictions || 0}
              </div>
              <div className="text-sm text-slate-600 font-medium">
                This Month
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-amber-200">
          <CardContent className="text-center">
            <div className="space-y-3">
              <div className="p-3 bg-amber-100 rounded-xl w-fit mx-auto">
                <Leaf className="h-6 w-6 text-amber-500" />
              </div>
              <div className="text-3xl font-bold text-slate-800">
                {stats?.averageFertility}
              </div>
              <div className="text-sm text-slate-600 font-medium">
                Avg. Fertility
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-amber-200">
          <CardContent className="text-center">
            <div className="space-y-3">
              <div className="p-3 bg-purple-100 rounded-xl w-fit mx-auto">
                <MapPin className="h-6 w-6 text-purple-500" />
              </div>
              <div className="text-3xl font-bold text-slate-800">
                {stats?.favoriteTexture}
              </div>
              <div className="text-sm text-slate-600 font-medium">
                Favorite Texture
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="bg-white/80 backdrop-blur-sm cursor-pointer group border border-amber-200">
          <a href="/analysis">
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-xl group-hover:bg-green-200 transition-colors">
                  <Leaf className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-xl">
                    New Soil Analysis
                  </h3>
                  <p className="text-gray-600">
                    Analyze your soil and get fertilizer recommendations
                  </p>
                </div>
              </div>
            </CardContent>
          </a>
        </Card>
        <Card className="bg-white/80 backdrop-blur-sm cursor-pointer group border border-amber-200">
          <a href="/history">
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-xl group-hover:bg-blue-200 transition-colors">
                  <History className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-xl">
                    Prediction History
                  </h3>
                  <p className="text-gray-600">
                    View your past soil analyses and recommendations
                  </p>
                </div>
              </div>
            </CardContent>
          </a>
        </Card>
        <Card className="bg-white/80 backdrop-blur-sm cursor-pointer group border border-amber-200">
          <a href="/profile">
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gray-100 rounded-xl group-hover:bg-gray-200 transition-colors">
                  <Settings className="h-6 w-6 text-gray-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-xl">
                    Profile Settings
                  </h3>
                  <p className="text-gray-600">
                    Update your account information and preferences
                  </p>
                </div>
              </div>
            </CardContent>
          </a>
        </Card>
      </div>

      {/* Recent Predictions */}
      {recentPredictions.length > 0 && (
        <Card className="bg-white/90 backdrop-blur-sm border border-amber-200">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-amber-200 rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-green-800">
              <History className="h-5 w-5" />
              Recent Predictions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentPredictions.slice(0, 5).map((prediction: any, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {prediction.simplified_texture} Soil Analysis
                    </p>
                    <p className="text-sm text-gray-600">
                      {new Date(prediction.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {prediction.fertility_prediction}
                    </p>
                    <p className="text-xs text-gray-500">
                      {Math.round(prediction.fertility_confidence * 100)}%
                      confidence
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
