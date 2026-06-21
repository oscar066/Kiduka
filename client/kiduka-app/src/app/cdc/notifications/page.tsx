"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import { ProtectedPage } from "../../components/auth/roleBasedGaurd";
import { CDCLayout } from "../../components/layout/roleBasedLayout";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api-client";
import { UserRole } from "@/types/auth";
import {
  Bell,
  Loader2,
  Mail,
  MessageSquare,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface NotificationRecord {
  id: string;
  farmer_name: string;
  method: "email" | "sms" | "both";
  status: "sent" | "failed" | "partial" | "pending";
  email_status?: string | null;
  sms_status?: string | null;
  created_at: string;
}

interface PaginatedNotifications {
  notifications?: NotificationRecord[];
  items?: NotificationRecord[];
  total: number;
  pages: number;
}

function getStatusStyle(status: string) {
  switch (status) {
    case "sent":    return { badge: "bg-green-100 text-green-800 border-green-200", icon: <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> };
    case "failed":  return { badge: "bg-red-100 text-red-800 border-red-200",       icon: <XCircle className="h-3.5 w-3.5 text-red-500" /> };
    case "partial": return { badge: "bg-amber-100 text-amber-800 border-amber-200", icon: <AlertCircle className="h-3.5 w-3.5 text-amber-500" /> };
    default:        return { badge: "bg-gray-100 text-gray-600 border-gray-200",    icon: <Clock className="h-3.5 w-3.5 text-gray-400" /> };
  }
}

export default function CDCNotificationsPage() {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const loadNotifications = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response: PaginatedNotifications = await apiClient.getCDCNotificationHistory(token, currentPage, 20);
      const items = response.notifications || response.items || [];
      setNotifications(items);
      setTotal(response.total || 0);
      setTotalPages(response.pages || 1);
    } catch (error) {
      console.error("Error loading notifications:", error);
    } finally {
      setLoading(false);
    }
  }, [token, currentPage]);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  return (
    <ProtectedPage requiredRole={UserRole.CDC}>
      <CDCLayout>
        <div className="space-y-6 p-1">

          {/* Header */}
          <div>
            <h1 className="text-2xl font-serif font-bold bg-gradient-to-r from-green-800 via-emerald-600 to-green-700 bg-clip-text text-transparent">
              Notification History
            </h1>
            <p className="mt-0.5 text-sm text-green-600 font-serif">
              Track all result notifications sent to farmers
            </p>
          </div>

          {/* Table card */}
          <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">

            {/* Card header */}
            <div className="px-4 py-3 bg-gradient-to-r from-green-50 to-amber-50 border-b border-amber-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-green-600" />
                <span className="text-sm font-serif font-semibold text-green-800">All Notifications</span>
                {!loading && total > 0 && (
                  <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full font-medium">
                    {total}
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={loadNotifications}
                disabled={loading}
                className="h-8 w-8 p-0 text-green-600 hover:bg-green-50 border border-amber-200"
                aria-label="Refresh"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>

            {/* Body */}
            {loading ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-amber-100">
                  <thead className="bg-gradient-to-r from-green-50 to-amber-50">
                    <tr>
                      {["Farmer", "Channel", "Status", "Date"].map((h) => (
                        <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-green-800 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-amber-50">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <tr key={i}>
                        {[1, 2, 3, 4].map((j) => (
                          <td key={j} className="px-5 py-3.5">
                            <Skeleton className="h-4 w-20" />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="p-4 bg-green-50 rounded-full">
                  <Bell className="h-7 w-7 text-green-400" />
                </div>
                <p className="text-green-800 font-serif font-medium">No notifications yet</p>
                <p className="text-sm text-gray-500 text-center max-w-xs">
                  Notifications will appear here after you send analysis results to farmers.
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-amber-100">
                    <thead className="bg-gradient-to-r from-green-50 to-amber-50">
                      <tr>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-green-800 uppercase tracking-wider">Farmer</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-green-800 uppercase tracking-wider">Channel</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-green-800 uppercase tracking-wider">Status</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-green-800 uppercase tracking-wider">Date</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-amber-50">
                      {notifications.map((n) => {
                        const { badge, icon } = getStatusStyle(n.status);
                        return (
                          <tr key={n.id} className="hover:bg-green-50/30 transition-colors">

                            {/* Farmer */}
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              <p className="text-sm font-medium text-gray-900">{n.farmer_name}</p>
                            </td>

                            {/* Channel — method + per-channel sub-statuses */}
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              <div className="flex flex-col gap-1">
                                {(n.method === "email" || n.method === "both") && (
                                  <span className="flex items-center gap-1.5 text-xs">
                                    <Mail className="h-3 w-3 text-blue-400 shrink-0" />
                                    <span className="text-gray-600">Email</span>
                                    {n.email_status && (
                                      <span className={`capitalize text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${getStatusStyle(n.email_status).badge}`}>
                                        {n.email_status}
                                      </span>
                                    )}
                                  </span>
                                )}
                                {(n.method === "sms" || n.method === "both") && (
                                  <span className="flex items-center gap-1.5 text-xs">
                                    <MessageSquare className="h-3 w-3 text-purple-400 shrink-0" />
                                    <span className="text-gray-600">SMS</span>
                                    {n.sms_status && (
                                      <span className={`capitalize text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${getStatusStyle(n.sms_status).badge}`}>
                                        {n.sms_status}
                                      </span>
                                    )}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Overall status */}
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full border ${badge}`}>
                                {icon}
                                <span className="capitalize">{n.status}</span>
                              </span>
                            </td>

                            {/* Date */}
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              <span className="text-xs text-gray-500">
                                {new Date(n.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="px-5 py-3 border-t border-amber-100 bg-gradient-to-r from-green-50/50 to-amber-50/50 flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    Showing{" "}
                    <span className="font-medium text-green-700">{(currentPage - 1) * 20 + 1}</span>–
                    <span className="font-medium text-green-700">{Math.min(currentPage * 20, total)}</span>{" "}
                    of <span className="font-medium text-green-700">{total}</span> notifications
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="h-7 text-xs border-amber-200 hover:bg-green-50 text-green-700"
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="h-7 text-xs border-amber-200 hover:bg-green-50 text-green-700"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </CDCLayout>
    </ProtectedPage>
  );
}
