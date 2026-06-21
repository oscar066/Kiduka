"use client";
import type React from "react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { UserRole } from "@/types/auth";
import type { AdminDashboardResponse } from "@/types/admin";
import {
  Users,
  BarChart3,
  Activity,
  AlertTriangle,
  TrendingUp,
  MapPin,
  Settings,
  UserCheck,
  FileText,
  RefreshCw,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { SuperAdminOnly } from "../auth/roleBasedGaurd";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminMetricCard } from "./components/AdminMetricCard";
import { AdminActionCard } from "./components/AdminActionCard";
import useSWR from "swr";
import { swrFetcher } from "@/lib/swr-config";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatDate() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

type ActivityTab = "users" | "logs";

export function AdminDashboard() {
  const { user, token, isSuperAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<ActivityTab>("users");

  const { data: dashboardData, error: fetchError, isLoading: loading, mutate } =
    useSWR<AdminDashboardResponse>(
      token ? ["getAdminDashboard", token] : null,
      swrFetcher
    );

  if (fetchError) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Failed to load dashboard</AlertTitle>
            <AlertDescription>{fetchError?.message || "An unexpected error occurred."}</AlertDescription>
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

  const stats = dashboardData?.stats;

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
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-serif font-bold bg-gradient-to-r from-green-800 via-emerald-600 to-green-700 bg-clip-text text-transparent">
                  Admin Dashboard
                </h1>
                {isSuperAdmin && (
                  <Badge className="bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold">
                    Super Admin
                  </Badge>
                )}
              </div>
              <p className="text-sm text-green-600 font-serif mt-0.5">
                {getGreeting()}, {user?.full_name?.split(" ")[0] || user?.username} — {formatDate()}
              </p>
            </>
          )}
        </div>
        <button
          onClick={() => mutate()}
          disabled={loading}
          className="p-2 rounded-lg border border-amber-200 bg-white hover:bg-amber-50 transition-colors disabled:opacity-40"
          aria-label="Refresh"
        >
          <RefreshCw className={`h-4 w-4 text-green-600 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <AdminMetricCard
          title="Total Users"
          value={stats?.total_users || 0}
          icon={<Users className="h-5 w-5 text-green-600" />}
          change={`+${stats?.recent_users || 0} this week`}
          changeType="positive"
          loading={loading}
        />
        <AdminMetricCard
          title="Active Users"
          value={stats?.active_users || 0}
          icon={<UserCheck className="h-5 w-5 text-amber-500" />}
          change={`${Math.round(((stats?.active_users || 0) / (stats?.total_users || 1)) * 100)}% of total`}
          changeType="neutral"
          loading={loading}
        />
        <AdminMetricCard
          title="Predictions"
          value={stats?.total_predictions || 0}
          icon={<BarChart3 className="h-5 w-5 text-blue-500" />}
          change={`+${stats?.recent_predictions || 0} this week`}
          changeType="positive"
          loading={loading}
        />
        <AdminMetricCard
          title="Flagged"
          value={stats?.flagged_predictions || 0}
          icon={<AlertTriangle className="h-5 w-5 text-red-500" />}
          change={stats?.flagged_predictions === 0 ? "All clear" : "Needs attention"}
          changeType={stats?.flagged_predictions === 0 ? "positive" : "negative"}
          loading={loading}
        />
      </div>

      {/* Middle row: Overview + Quick Actions */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Overview breakdown */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-gradient-to-r from-green-50 to-amber-50 border-b border-amber-200">
            <h2 className="text-sm font-serif font-semibold text-green-800">Overview</h2>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">Users by Role</p>
              <div className="space-y-2">
                {loading
                  ? [1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center justify-between">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-5 w-8 rounded-full" />
                      </div>
                    ))
                  : Object.entries(stats?.users_by_role || {}).map(([role, count]) => (
                      <div key={role} className="flex items-center justify-between">
                        <span className="text-sm text-gray-700 capitalize">{role.replace("_", " ")}</span>
                        <Badge variant="outline" className="text-green-700 bg-green-50 border-green-200 text-xs">
                          {count as number}
                        </Badge>
                      </div>
                    ))}
              </div>
            </div>

            <div className="border-t border-amber-100 pt-4">
              <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">Prediction Status</p>
              <div className="space-y-2">
                {loading
                  ? [1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center justify-between">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-5 w-8 rounded-full" />
                      </div>
                    ))
                  : Object.entries(stats?.predictions_by_status || {}).map(([status, count]) => (
                      <div key={status} className="flex items-center justify-between">
                        <span className="text-sm text-gray-700 capitalize">{status.replace("_", " ")}</span>
                        <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-200 text-xs">
                          {count as number}
                        </Badge>
                      </div>
                    ))}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-gradient-to-r from-green-50 to-amber-50 border-b border-amber-200">
            <h2 className="text-sm font-serif font-semibold text-green-800">Quick Actions</h2>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <AdminActionCard
              title="Manage Users"
              description="View and edit user accounts"
              icon={<Users className="h-4 w-4" />}
              href="/admin/users"
              color="green"
            />
            <AdminActionCard
              title="View Predictions"
              description="Monitor all soil predictions"
              icon={<BarChart3 className="h-4 w-4" />}
              href="/admin/predictions"
              color="amber"
            />
            <AdminActionCard
              title="Audit Logs"
              description="System activity and actions"
              icon={<FileText className="h-4 w-4" />}
              href="#"
              color="blue"
              disabled
            />
            <AdminActionCard
              title="Statistics"
              description="Analytics and reporting"
              icon={<TrendingUp className="h-4 w-4" />}
              href="#"
              color="purple"
              disabled
            />
            <AdminActionCard
              title="Manage Agrovets"
              description="Agricultural store info"
              icon={<MapPin className="h-4 w-4" />}
              href="#"
              color="orange"
              disabled
            />
            <SuperAdminOnly>
              <AdminActionCard
                title="System Settings"
                description="Advanced configuration"
                icon={<Settings className="h-4 w-4" />}
                href="#"
                color="gray"
                disabled
              />
            </SuperAdminOnly>
          </div>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
        {/* Tabs */}
        <div className="flex bg-gradient-to-r from-green-50 to-amber-50 border-b border-amber-200">
          {(["users", "logs"] as ActivityTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-serif font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-green-700 text-green-800 bg-white/60"
                  : "border-transparent text-green-600 hover:text-green-800"
              }`}
            >
              {tab === "users" ? <Users className="h-4 w-4" /> : <Activity className="h-4 w-4" />}
              {tab === "users" ? "Recent Users" : "Audit Log"}
            </button>
          ))}
        </div>

        <div className="divide-y divide-amber-50">
          {activeTab === "users" ? (
            loading ? (
              [1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3">
                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-32" />
                    <Skeleton className="h-3 w-44" />
                  </div>
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              ))
            ) : (
              dashboardData?.recent_users?.slice(0, 6).map((u, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3 hover:bg-green-50/40 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-green-900 truncate">{u.username}</p>
                    <p className="text-xs text-green-600 truncate">{u.email}</p>
                  </div>
                  <Badge
                    className={
                      u.role === UserRole.SUPER_ADMIN
                        ? "bg-red-100 text-red-800 border-red-200"
                        : u.role === UserRole.ADMIN
                        ? "bg-amber-100 text-amber-800 border-amber-200"
                        : "bg-green-100 text-green-800 border-green-200"
                    }
                  >
                    {u.role.replace("_", " ")}
                  </Badge>
                </div>
              ))
            )
          ) : loading ? (
            [1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3">
                <Skeleton className="h-4 w-4 rounded-full mt-0.5 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))
          ) : (
            dashboardData?.recent_audit_logs?.slice(0, 6).map((log, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3 hover:bg-amber-50/40 transition-colors">
                <Activity className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800">
                    <span className="font-medium text-green-700">{log.admin_username}</span>{" "}
                    {log.action}
                    {log.target_username && (
                      <>
                        {" for "}
                        <span className="font-medium text-amber-700">{log.target_username}</span>
                      </>
                    )}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(log.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-4 py-2.5 border-t border-amber-100 bg-gradient-to-r from-green-50/50 to-amber-50/50">
          <a
            href={activeTab === "users" ? "/admin/users" : "#"}
            className="flex items-center gap-1 text-xs text-green-700 hover:text-green-900 font-medium transition-colors"
          >
            View all {activeTab === "users" ? "users" : "activity"}
            <ChevronRight className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
