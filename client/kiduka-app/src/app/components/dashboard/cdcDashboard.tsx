"use client";

import React from "react";
import useSWR from "swr";
import { useAuth } from "@/hooks/useAuth";
import { swrFetcher } from "@/lib/swr-config";
import {
  Users,
  Beaker,
  Bell,
  Clock,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
interface CDCMetricCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  iconBg: string;
  change: string;
  changeType: "positive" | "negative" | "neutral";
  sub?: string;
  loading: boolean;
}

function CDCMetricCard({ title, value, icon, iconBg, change, changeType, sub, loading }: CDCMetricCardProps) {
  const changeColor = { positive: "text-green-600", negative: "text-red-500", neutral: "text-amber-600" }[changeType];
  return (
    <div className="bg-white rounded-xl border border-amber-200 shadow-sm p-5 hover:shadow-md transition-shadow">
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-9 w-16" />
          <Skeleton className="h-3 w-24" />
        </div>
      ) : (
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-green-700 uppercase tracking-wide">{title}</p>
            <p className="text-3xl font-bold text-green-900 mt-1.5 leading-none">{value.toLocaleString()}</p>
            <p className={`text-xs mt-2 font-medium ${changeColor}`}>{change}</p>
            {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
          </div>
          <div className={`p-3 rounded-xl shrink-0 ${iconBg}`}>{icon}</div>
        </div>
      )}
    </div>
  );
}

interface CDCDashboardData {
  stats?: {
    total_farmers_served?: number;
    total_analyses_done?: number;
    total_notifications_sent?: number;
    pending_notifications?: number;
    recent_analyses?: number;
    recent_notifications?: number;
  };
  recent_activity?: Array<{
    prediction_id: string;
    farmer_username: string;
    farmer_name: string | null;
    soil_health_index: number;
    soil_fertility_status: string | null;
    cdc_notes: string | null;
    notification_sent: boolean;
    notification_status: string | null;
    created_at: string;
  }>;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatDate() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });
}

function getHealthBadgeStyle(index: number | null) {
  if (index === null) return "bg-gray-100 text-gray-600 border-gray-200";
  if (index >= 70) return "bg-green-100 text-green-800 border-green-200";
  if (index >= 40) return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-red-100 text-red-800 border-red-200";
}

function getNotificationBadgeStyle(status: string | null) {
  switch (status) {
    case "sent":    return "bg-green-100 text-green-800 border-green-200";
    case "failed":  return "bg-red-100 text-red-800 border-red-200";
    case "partial": return "bg-amber-100 text-amber-800 border-amber-200";
    default:        return "bg-gray-100 text-gray-600 border-gray-200";
  }
}

export function CDCDashboard() {
  const { token, user } = useAuth();
  const { data, error, isLoading, isValidating, mutate } = useSWR<CDCDashboardData>(
    token ? ["getCDCDashboard", token] : null,
    swrFetcher,
    { revalidateOnFocus: false, dedupingInterval: 5000 }
  );

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Failed to load dashboard</AlertTitle>
            <AlertDescription>{error?.message ?? "Failed to load dashboard data"}</AlertDescription>
          </Alert>
          <button
            onClick={() => mutate()}
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
  const recentActivity = data?.recent_activity || [];
  const loading = isLoading;

  return (
    <div className="space-y-6 p-1">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          {loading && !user ? (
            <>
              <Skeleton className="h-8 w-56" />
              <Skeleton className="h-4 w-36 mt-1.5" />
            </>
          ) : (
            <>
              <h1 className="text-2xl font-serif font-bold bg-gradient-to-r from-green-800 via-emerald-600 to-green-700 bg-clip-text text-transparent">
                CDC Dashboard
              </h1>
              <p className="text-sm text-green-600 font-serif mt-0.5">
                {getGreeting()}, {user?.full_name?.split(" ")[0] || user?.username} — {formatDate()}
              </p>
            </>
          )}
        </div>
        <button
          onClick={() => mutate()}
          disabled={isValidating}
          className="p-2 rounded-lg border border-amber-200 bg-white hover:bg-amber-50 transition-colors disabled:opacity-40"
          aria-label="Refresh"
        >
          <RefreshCw className={`h-4 w-4 text-green-600 ${isValidating ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <CDCMetricCard
          title="Farmers Served"
          value={stats?.total_farmers_served ?? 0}
          icon={<Users className="h-6 w-6 text-green-600" />}
          iconBg="bg-green-100"
          change="Total assigned to you"
          changeType="neutral"
          loading={loading}
        />
        <CDCMetricCard
          title="Analyses Done"
          value={stats?.total_analyses_done ?? 0}
          icon={<Beaker className="h-6 w-6 text-amber-600" />}
          iconBg="bg-amber-100"
          change={`+${stats?.recent_analyses ?? 0} this week`}
          changeType="positive"
          sub="Cumulative soil analyses run"
          loading={loading}
        />
        <CDCMetricCard
          title="Notifications Sent"
          value={stats?.total_notifications_sent ?? 0}
          icon={<Bell className="h-6 w-6 text-blue-600" />}
          iconBg="bg-blue-100"
          change={`+${stats?.recent_notifications ?? 0} this week`}
          changeType="positive"
          sub="Results delivered to farmers"
          loading={loading}
        />
        <CDCMetricCard
          title="Pending Results"
          value={stats?.pending_notifications ?? 0}
          icon={<Clock className="h-6 w-6 text-red-500" />}
          iconBg="bg-red-100"
          change={(stats?.pending_notifications ?? 0) === 0 ? "All results sent" : "Awaiting delivery"}
          changeType={(stats?.pending_notifications ?? 0) === 0 ? "positive" : "negative"}
          sub="Analyses not yet sent to farmer"
          loading={loading}
        />
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">

        {/* Header */}
        <div className="px-4 py-3 bg-gradient-to-r from-green-50 to-amber-50 border-b border-amber-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Beaker className="h-4 w-4 text-green-600" />
            <span className="text-sm font-serif font-semibold text-green-800">Recent Analyses</span>
            {!loading && recentActivity.length > 0 && (
              <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full font-medium">
                {recentActivity.length}
              </span>
            )}
          </div>
          <a
            href="/cdc/farmers"
            className="flex items-center gap-1 text-xs text-green-700 hover:text-green-900 font-medium transition-colors"
          >
            View all farmers
            <ChevronRight className="h-3 w-3" />
          </a>
        </div>

        {/* Body */}
        {loading ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-amber-100">
              <thead className="bg-gradient-to-r from-green-50 to-amber-50">
                <tr>
                  {["Farmer", "Health", "Fertility Status", "Notification", "Date"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-green-800 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-amber-50">
                {[1, 2, 3, 4, 5].map((i) => (
                  <tr key={i}>
                    {[1, 2, 3, 4, 5].map((j) => (
                      <td key={j} className="px-5 py-3.5">
                        <Skeleton className="h-4 w-20" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : recentActivity.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 gap-3">
            <div className="p-4 bg-green-50 rounded-full">
              <Beaker className="h-7 w-7 text-green-400" />
            </div>
            <p className="text-green-800 font-serif font-medium">No analyses yet</p>
            <p className="text-sm text-gray-500">Run your first soil analysis to see activity here.</p>
            <a
              href="/cdc/analyze"
              className="mt-1 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors"
            >
              <Beaker className="h-4 w-4" />
              Run Analysis
            </a>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-amber-100">
              <thead className="bg-gradient-to-r from-green-50 to-amber-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-green-800 uppercase tracking-wider">Farmer</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-green-800 uppercase tracking-wider">Health</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-green-800 uppercase tracking-wider">Fertility Status</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-green-800 uppercase tracking-wider">Notification</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-green-800 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-amber-50">
                {recentActivity.slice(0, 5).map((item) => (
                  <tr key={item.prediction_id} className="hover:bg-green-50/30 transition-colors">
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <p className="text-sm font-medium text-gray-900">{item.farmer_name || item.farmer_username}</p>
                      {item.farmer_name && (
                        <p className="text-xs text-gray-400 mt-0.5">@{item.farmer_username}</p>
                      )}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <Badge variant="outline" className={`text-xs ${getHealthBadgeStyle(item.soil_health_index)}`}>
                        {item.soil_health_index !== null ? item.soil_health_index.toFixed(0) : "N/A"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className="text-sm text-gray-600 capitalize">
                        {item.soil_fertility_status || "Unknown"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {item.notification_sent ? (
                        <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Sent
                        </span>
                      ) : (
                        <Badge variant="outline" className={`text-xs ${getNotificationBadgeStyle(item.notification_status)}`}>
                          {item.notification_status || "pending"}
                        </Badge>
                      )}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className="text-xs text-gray-500">
                        {new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
