"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  apiClient,
  type AdminDashboardResponse,
  UserRole,
} from "@/lib/api-client";
import {
  Users,
  BarChart3,
  Activity,
  AlertTriangle,
  Shield,
  TrendingUp,
  MapPin,
  Settings,
  UserCheck,
  FileText,
  Loader2,
  Leaf,
} from "lucide-react";
import { SuperAdminOnly } from "../auth/roleBasedGaurd";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

export function AdminDashboard() {
  const { user, token, isSuperAdmin } = useAuth();
  const [dashboardData, setDashboardData] =
    useState<AdminDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      loadAdminDashboard();
    }
  }, [token]);

  const loadAdminDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getAdminDashboard(token!);
      setDashboardData(data);
    } catch (err) {
      console.error("Error loading admin dashboard:", err);
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-green-25 via-amber-25 to-green-25 min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-600">
              <Leaf className="h-5 w-5 text-white" />
            </div>
            <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-medium text-green-800">Loading...</h3>
            <p className="text-green-600">Loading dashboard data</p>
          </div>
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

  const stats = dashboardData?.stats;

  return (
    <main className="flex-1 space-y-6 p-6 bg-gradient-to-br from-green-25 via-amber-25 to-green-25 min-h-screen">
      {/* Welcome Section */}
      <div className="space-y-2">
        <h1 className="text-3xl font-serif font-bold text-green-800">
          Admin Dashboard
        </h1>
        <p className="text-green-600 font-serif">
          Welcome back, {user?.full_name || user?.username}
          {isSuperAdmin && (
            <span className="ml-2 font-semibold text-blue-700">
              (Super Admin)
            </span>
          )}
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Users"
          value={stats?.total_users || 0}
          icon={<Users className="h-8 w-8 text-green-500" />}
          change={`+${stats?.recent_users || 0} this week`}
          changeType="positive"
        />
        <MetricCard
          title="Active Users"
          value={stats?.active_users || 0}
          icon={<UserCheck className="h-8 w-8 text-amber-500" />}
          change={`${Math.round(
            ((stats?.active_users || 0) / (stats?.total_users || 1)) * 100
          )}% of total`}
          changeType="neutral"
        />
        <MetricCard
          title="Total Predictions"
          value={stats?.total_predictions || 0}
          icon={<BarChart3 className="h-8 w-8 text-blue-500" />}
          change={`+${stats?.recent_predictions || 0} this week`}
          changeType="positive"
        />
        <MetricCard
          title="Flagged Predictions"
          value={stats?.flagged_predictions || 0}
          icon={<AlertTriangle className="h-8 w-8 text-red-500" />}
          change={
            stats?.flagged_predictions === 0 ? "All clear" : "Needs attention"
          }
          changeType={
            stats?.flagged_predictions === 0 ? "positive" : "negative"
          }
        />
      </div>

      {/* Role Distribution & Prediction Status */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="border border-amber-200">
          <CardHeader className="mb-4 flex items-center gap-2">
            <Users className="h-5 w-5" />
            <CardTitle className="text-lg font-serif font-medium text-green-800">
              Users by Role
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(stats?.users_by_role || {}).map(([role, count]) => (
              <div key={role} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 capitalize">
                  {role.replace("_", " ")}
                </span>
                <Badge variant="outline" className="text-green-700 bg-green-50">
                  {count}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="border border-amber-200">
          <CardHeader className="mb-4 flex items-center gap-2 border-amber-200">
            <BarChart3 className="h-5 w-5" />
            <CardTitle className="text-lg font-serif font-medium text-green-800">
              Prediction Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(stats?.predictions_by_status || {}).map(
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
          href="/admin/audit-logs"
          color="blue"
        />
        <AdminActionCard
          title="Statistics"
          description="Detailed analytics and reporting"
          icon={<TrendingUp className="h-6 w-6" />}
          href="/admin/statistics"
          color="purple"
        />
        <AdminActionCard
          title="Manage Agrovets"
          description="Update agricultural store information"
          icon={<MapPin className="h-6 w-6" />}
          href="/admin/agrovets"
          color="orange"
        />
        <SuperAdminOnly>
          <AdminActionCard
            title="System Settings"
            description="Advanced system configuration"
            icon={<Settings className="h-6 w-6" />}
            href="/admin/settings"
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
            {dashboardData?.recent_users?.slice(0, 5).map((user, index) => (
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
            ))}
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
            {dashboardData?.recent_audit_logs?.slice(0, 5).map((log, index) => (
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
            ))}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

// Metric Card Component
interface MetricCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  change: string;
  changeType: "positive" | "negative" | "neutral";
}

function MetricCard({
  title,
  value,
  icon,
  change,
  changeType,
}: MetricCardProps) {
  const changeColorClass = {
    positive: "text-green-600",
    negative: "text-red-600",
    neutral: "text-gray-600",
  }[changeType];

  return (
    <Card>
      <CardHeader className="flex items-center">
        <div className="p-2 bg-green-50 rounded-lg">{icon}</div>
        <div className="ml-4">
          <CardTitle className="text-sm font-medium text-green-700">
            {title}
          </CardTitle>
          <div className="text-2xl font-semibold text-green-900">
            {value.toLocaleString()}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className={`text-sm ${changeColorClass}`}>{change}</p>
      </CardContent>
    </Card>
  );
}

// Admin Action Card Component
interface AdminActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  color: "green" | "amber" | "blue" | "purple" | "orange" | "gray";
}

function AdminActionCard({
  title,
  description,
  icon,
  href,
  color,
}: AdminActionCardProps) {
  const colorClasses = {
    green: "bg-green-500 hover:bg-green-600",
    amber: "bg-amber-500 hover:bg-amber-600",
    blue: "bg-blue-500 hover:bg-blue-600",
    purple: "bg-purple-500 hover:bg-purple-600",
    orange: "bg-orange-500 hover:bg-orange-600",
    gray: "bg-gray-500 hover:bg-gray-600",
  };

  return (
    <a
      href={href}
      className="block bg-white rounded-lg shadow-lg border border-amber-200 hover:shadow-xl transition-all duration-200 hover:scale-105"
    >
      <div className="p-6">
        <div
          className={`inline-flex p-3 rounded-lg text-white ${colorClasses[color]}`}
        >
          {icon}
        </div>
        <h3 className="mt-4 text-lg font-serif font-medium text-green-800">
          {title}
        </h3>
        <p className="mt-2 text-sm text-green-600">{description}</p>
      </div>
    </a>
  );
}
