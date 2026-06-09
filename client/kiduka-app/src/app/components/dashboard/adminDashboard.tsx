"use client";
import type React from "react";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api-client";
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
} from "lucide-react";
import { SuperAdminOnly } from "../auth/roleBasedGaurd";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminMetricCard } from "./components/AdminMetricCard";
import { AdminActionCard } from "./components/AdminActionCard";

import useSWR from "swr";
import { swrFetcher } from "@/lib/swr-config";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function AdminDashboard() {
  const { user, token, isSuperAdmin } = useAuth();
  
  // Use SWR for fetching and caching dashboard data
  const { 
    data: dashboardData, 
    error: fetchError, 
    isLoading,
    mutate 
  } = useSWR<AdminDashboardResponse>(
    token ? ["getAdminDashboard", token] : null,
    swrFetcher
  );

  const loading = isLoading;

  if (fetchError) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Failed to load dashboard</AlertTitle>
            <AlertDescription>
              {fetchError?.message || "An unexpected error occurred."}
            </AlertDescription>
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
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          {loading && !user ? (
            <>
              <Skeleton className="h-9 w-64" />
              <Skeleton className="h-6 w-48" />
            </>
          ) : (
            <>
              <h1 className="text-3xl font-serif font-bold bg-gradient-to-r from-green-800 via-emerald-600 to-green-700 bg-clip-text text-transparent">
                Admin Dashboard
              </h1>
              <p className="text-green-600 font-serif">
                {getGreeting()}, {user?.full_name || user?.username}
                {isSuperAdmin && (
                  <Badge className="ml-2 bg-blue-100 text-blue-800 border border-blue-200 font-semibold text-xs">
                    Super Admin
                  </Badge>
                )}
              </p>
            </>
          )}
        </div>
        <button
          onClick={() => mutate()}
          disabled={loading}
          className="p-2 rounded-lg border border-amber-200 bg-white hover:bg-amber-50 transition-colors disabled:opacity-50"
          aria-label="Refresh dashboard"
        >
          <RefreshCw className={`h-4 w-4 text-green-600 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid lg:grid-cols-4 gap-6">
        <AdminMetricCard
          title="Total Users"
          value={stats?.total_users || 0}
          icon={<Users className="h-8 w-8 text-green-500" />}
          change={`+${stats?.recent_users || 0} this week`}
          changeType="positive"
          loading={loading}
        />
        <AdminMetricCard
          title="Active Users"
          value={stats?.active_users || 0}
          icon={<UserCheck className="h-8 w-8 text-amber-500" />}
          change={`${Math.round(
            ((stats?.active_users || 0) / (stats?.total_users || 1)) * 100
          )}% of total`}
          changeType="neutral"
          loading={loading}
        />
        <AdminMetricCard
          title="Total Predictions"
          value={stats?.total_predictions || 0}
          icon={<BarChart3 className="h-8 w-8 text-blue-500" />}
          change={`+${stats?.recent_predictions || 0} this week`}
          changeType="positive"
          loading={loading}
        />
        <AdminMetricCard
          title="Flagged Predictions"
          value={stats?.flagged_predictions || 0}
          icon={<AlertTriangle className="h-8 w-8 text-red-500" />}
          change={
            stats?.flagged_predictions === 0 ? "All clear" : "Needs attention"
          }
          changeType={
            stats?.flagged_predictions === 0 ? "positive" : "negative"
          }
          loading={loading}
        />
      </div>

      {/* Role Distribution & Prediction Status */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="border border-amber-200 shadow-lg">
          <CardHeader className="flex items-center gap-2 bg-gradient-to-r from-green-50 to-amber-50 border-b border-amber-200">
            <Users className="h-5 w-5 text-green-600" />
            <CardTitle className="text-base font-serif font-semibold text-green-800">
              Users by Role
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between py-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-6 w-12 rounded-full" />
                  </div>
                ))}
              </>
            ) : (
              Object.entries(stats?.users_by_role || {}).map(([role, count]) => (
                <div key={role} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 capitalize">
                    {role.replace("_", " ")}
                  </span>
                  <Badge variant="outline" className="text-green-700 bg-green-50">
                    {count}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card className="border border-amber-200 shadow-lg">
          <CardHeader className="flex items-center gap-2 bg-gradient-to-r from-green-50 to-amber-50 border-b border-amber-200">
            <BarChart3 className="h-5 w-5 text-green-600" />
            <CardTitle className="text-base font-serif font-semibold text-green-800">
              Prediction Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between py-1">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-6 w-12 rounded-full" />
                  </div>
                ))}
              </>
            ) : (
              Object.entries(stats?.predictions_by_status || {}).map(
                ([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 capitalize">
                      {status.replace("_", " ")}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-amber-700 bg-amber-50"
                    >
                      {count}
                    </Badge>
                  </div>
                )
              )
            )}
          </CardContent>
        </Card>
      </div>

      {/* Admin Actions */}
      <div className="grid lg:grid-cols-3 gap-6">
        <AdminActionCard
          title="Manage Users"
          description="View, edit, and manage user accounts"
          icon={<Users className="h-6 w-6" />}
          href="/admin/users"
          color="green"
        />
        <AdminActionCard
          title="View Predictions"
          description="Monitor and manage all soil predictions"
          icon={<BarChart3 className="h-6 w-6" />}
          href="/admin/predictions"
          color="amber"
        />
        <AdminActionCard
          title="Audit Logs"
          description="View system activity and admin actions"
          icon={<FileText className="h-6 w-6" />}
          href="#"
          color="blue"
        />
        <AdminActionCard
          title="Statistics"
          description="Detailed analytics and reporting"
          icon={<TrendingUp className="h-6 w-6" />}
          href="#"
          color="purple"
        />
        <AdminActionCard
          title="Manage Agrovets"
          description="Update agricultural store information"
          icon={<MapPin className="h-6 w-6" />}
          href="#"
          color="orange"
        />
        <SuperAdminOnly>
          <AdminActionCard
            title="System Settings"
            description="Advanced system configuration"
            icon={<Settings className="h-6 w-6" />}
            href="#"
            color="gray"
          />
        </SuperAdminOnly>
      </div>

      {/* Recent Activity */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <Card className="border border-amber-200">
          <CardHeader className="flex items-center gap-2 border-b border-amber-200 bg-gradient-to-br from-green-50 via-amber-50 to-green-50">
            <Users className="h-5 w-5" />
            <CardTitle className="text-lg font-serif font-medium text-green-800">
              Recent Users
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 bg-green-50/50 rounded-lg"
                  >
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                ))}
              </>
            ) : (
              dashboardData?.recent_users?.slice(0, 5).map((user, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-green-50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-green-900">{user.username}</p>
                  <p className="text-sm text-green-600">{user.email}</p>
                </div>
                <div className="text-right">
                  <Badge
                    className={
                      user.role === UserRole.SUPER_ADMIN
                        ? "bg-red-100 text-red-800"
                        : user.role === UserRole.ADMIN
                        ? "bg-amber-100 text-amber-800"
                        : "bg-green-100 text-green-800"
                    }
                  >
                    {user.role.replace("_", " ")}
                  </Badge>
                </div>
              </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Audit Logs */}
        <Card className="border border-amber-200">
          <CardHeader className="flex items-center gap-2 border-b border-amber-200 bg-gradient-to-br from-green-50 via-amber-50 to-green-50">
            <Activity className="h-5 w-5 text-amber-600" />
            <CardTitle className="text-lg font-serif font-medium text-green-800">
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="flex items-start space-x-3 p-3 bg-amber-50/50 rounded-lg"
                  >
                    <Skeleton className="h-4 w-4 rounded-full mt-1" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3 w-3/4" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </>
            ) : (
              dashboardData?.recent_audit_logs?.slice(0, 5).map((log, index) => (
              <div
                key={index}
                className="flex items-start space-x-3 p-3 bg-amber-50 rounded-lg"
              >
                <Activity className="h-4 w-4 text-amber-600 mt-1" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    <span className="font-medium text-green-700">
                      {log.admin_username}
                    </span>{" "}
                    {log.action}
                    {log.target_username && (
                      <span>
                        {" "}
                        for{" "}
                        <span className="font-medium text-amber-700">
                          {log.target_username}
                        </span>
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(log.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
