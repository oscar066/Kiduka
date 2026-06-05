"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api-client";
import {
  Users,
  Beaker,
  Bell,
  Clock,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

interface CDCDashboardData {
  stats?: {
    total_farmers?: number;
    total_analyses?: number;
    notifications_sent?: number;
    pending_notifications?: number;
  };
  recent_analyses?: Array<{
    id: string;
    farmer_name: string;
    health_index: number | null;
    fertility_status: string | null;
    cdc_notes: string | null;
    notification_status: string | null;
    created_at: string;
  }>;
}

interface MetricCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  colorClass: string;
  loading: boolean;
}

function MetricCard({ title, value, icon, colorClass, loading }: MetricCardProps) {
  return (
    <Card className="border-amber-200 shadow-sm bg-white/90 backdrop-blur-sm">
      <CardContent className="p-5">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">{title}</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
            </div>
            <div className={`p-3 rounded-full ${colorClass}`}>{icon}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function getHealthBadgeStyle(index: number | null): string {
  if (index === null) return "bg-gray-100 text-gray-600 border-gray-200";
  if (index >= 70) return "bg-green-100 text-green-800 border-green-200";
  if (index >= 40) return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-red-100 text-red-800 border-red-200";
}

function getNotificationBadgeStyle(status: string | null): string {
  switch (status) {
    case "sent":
      return "bg-green-100 text-green-800 border-green-200";
    case "failed":
      return "bg-red-100 text-red-800 border-red-200";
    case "partial":
      return "bg-amber-100 text-amber-800 border-amber-200";
    default:
      return "bg-gray-100 text-gray-600 border-gray-200";
  }
}

export function CDCDashboard() {
  const { token, user } = useAuth();
  const [data, setData] = useState<CDCDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const result = await apiClient.getCDCDashboard(token);
      setData(result);
    } catch (err: any) {
      console.error("Failed to load CDC dashboard:", err);
      setError(err?.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Failed to load dashboard</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <button
            onClick={fetchDashboard}
            className="w-full h-10 rounded-lg border border-amber-200 bg-white hover:bg-amber-50 text-sm font-medium text-green-700 flex items-center justify-center gap-2 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
        </div>
      </div>
    );
  }

  const stats = data?.stats;
  const recentAnalyses = data?.recent_analyses || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          {loading && !user ? (
            <>
              <Skeleton className="h-9 w-64" />
              <Skeleton className="h-5 w-48" />
            </>
          ) : (
            <>
              <h1 className="text-3xl font-serif font-bold bg-gradient-to-r from-green-800 via-emerald-600 to-green-700 bg-clip-text text-transparent">
                CDC Dashboard
              </h1>
              <p className="text-green-600 font-serif">
                Welcome, {user?.full_name || user?.username}
              </p>
            </>
          )}
        </div>
        <button
          onClick={fetchDashboard}
          disabled={loading}
          className="p-2 rounded-lg border border-amber-200 bg-white hover:bg-amber-50 transition-colors disabled:opacity-50"
          aria-label="Refresh dashboard"
        >
          <RefreshCw className={`h-4 w-4 text-green-600 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Farmers Served"
          value={stats?.total_farmers ?? 0}
          icon={<Users className="h-6 w-6 text-green-600" />}
          colorClass="bg-green-100"
          loading={loading}
        />
        <MetricCard
          title="Total Analyses Done"
          value={stats?.total_analyses ?? 0}
          icon={<Beaker className="h-6 w-6 text-blue-600" />}
          colorClass="bg-blue-100"
          loading={loading}
        />
        <MetricCard
          title="Notifications Sent"
          value={stats?.notifications_sent ?? 0}
          icon={<Bell className="h-6 w-6 text-amber-600" />}
          colorClass="bg-amber-100"
          loading={loading}
        />
        <MetricCard
          title="Pending (Unsent)"
          value={stats?.pending_notifications ?? 0}
          icon={<Clock className="h-6 w-6 text-orange-600" />}
          colorClass="bg-orange-100"
          loading={loading}
        />
      </div>

      {/* Recent Activity */}
      <Card className="border-amber-200 shadow-md bg-white/90 backdrop-blur-sm">
        <CardHeader className="bg-gradient-to-r from-green-50 to-amber-50 border-b border-amber-100 flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-serif font-semibold text-green-800 flex items-center gap-2">
            <Beaker className="h-5 w-5 text-green-600" />
            Recent Analyses
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-6">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-green-50/50 rounded-lg">
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              ))}
            </div>
          ) : recentAnalyses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <div className="p-4 bg-green-50 rounded-full">
                <Beaker className="h-8 w-8 text-green-400" />
              </div>
              <p className="text-green-700 font-medium font-serif">No analyses yet</p>
              <p className="text-sm text-gray-500">Run your first soil analysis to see activity here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-amber-100">
                <thead className="bg-gradient-to-r from-green-50 to-emerald-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-green-800 uppercase tracking-wider">Farmer</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-green-800 uppercase tracking-wider">Health Index</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-green-800 uppercase tracking-wider">Fertility Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-green-800 uppercase tracking-wider">Notes</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-green-800 uppercase tracking-wider">Notification</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-green-800 uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-amber-50">
                  {recentAnalyses.map((analysis) => (
                    <tr key={analysis.id} className="hover:bg-green-50/20 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">{analysis.farmer_name}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="outline" className={getHealthBadgeStyle(analysis.health_index)}>
                          {analysis.health_index !== null ? `${analysis.health_index}` : "N/A"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600 capitalize">
                          {analysis.fertility_status || "Unknown"}
                        </span>
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        <span className="text-sm text-gray-500 truncate block" title={analysis.cdc_notes || ""}>
                          {analysis.cdc_notes
                            ? analysis.cdc_notes.length > 60
                              ? analysis.cdc_notes.substring(0, 60) + "..."
                              : analysis.cdc_notes
                            : "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="outline" className={getNotificationBadgeStyle(analysis.notification_status)}>
                          {analysis.notification_status || "pending"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-500">
                          {new Date(analysis.created_at).toLocaleDateString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
