"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import { ProtectedPage } from "../../components/auth/roleBasedGaurd";
import { CDCLayout } from "../../components/layout/roleBasedLayout";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api-client";
import { UserRole } from "@/types/auth";
import { Bell, Loader2, Mail, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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

function getMethodBadgeStyle(method: string): string {
  switch (method) {
    case "email":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "sms":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "both":
      return "bg-indigo-100 text-indigo-800 border-indigo-200";
    default:
      return "bg-gray-100 text-gray-600 border-gray-200";
  }
}

function getStatusBadgeStyle(status: string): string {
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
      const response: PaginatedNotifications = await apiClient.getCDCNotificationHistory(
        token,
        currentPage,
        20
      );
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

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  return (
    <ProtectedPage requiredRole={UserRole.CDC}>
      <CDCLayout>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-serif font-bold text-green-800">Notification History</h1>
            <p className="mt-1 text-green-600 font-serif">
              Track all result notifications sent to farmers
            </p>
          </div>

          {/* Table */}
          <Card className="border-amber-200 shadow-md overflow-hidden bg-white/90 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-green-50 to-amber-50 border-b border-amber-100">
              <CardTitle className="text-base font-serif font-semibold text-green-800 flex items-center gap-2">
                <Bell className="h-5 w-5 text-green-600" />
                All Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <Loader2 className="h-10 w-10 animate-spin text-green-600" />
                  <p className="text-green-600 font-medium">Loading notifications...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-3">
                  <div className="p-4 bg-green-50 rounded-full">
                    <Bell className="h-8 w-8 text-green-400" />
                  </div>
                  <p className="text-green-700 font-medium font-serif">No notifications yet</p>
                  <p className="text-sm text-gray-500">
                    Notifications will appear here after you send analysis results to farmers.
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-amber-100">
                      <thead className="bg-gradient-to-r from-green-50 to-emerald-50">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-green-800 uppercase tracking-wider">Farmer</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-green-800 uppercase tracking-wider">Method</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-green-800 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-green-800 uppercase tracking-wider">Email</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-green-800 uppercase tracking-wider">SMS</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-green-800 uppercase tracking-wider">Date</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-amber-50">
                        {notifications.map((n) => (
                          <tr key={n.id} className="hover:bg-green-50/20 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm font-medium text-gray-900">{n.farmer_name}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge variant="outline" className={getMethodBadgeStyle(n.method)}>
                                <span className="flex items-center gap-1">
                                  {n.method === "email" && <Mail className="h-3 w-3" />}
                                  {n.method === "sms" && <MessageSquare className="h-3 w-3" />}
                                  {n.method === "both" && <Bell className="h-3 w-3" />}
                                  {n.method}
                                </span>
                              </Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge variant="outline" className={getStatusBadgeStyle(n.status)}>
                                {n.status}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-500 capitalize">
                                {n.email_status || "-"}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-500 capitalize">
                                {n.sms_status || "-"}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-500">
                                {new Date(n.created_at).toLocaleDateString()}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="px-6 py-4 border-t border-amber-100 flex items-center justify-between bg-green-50/30">
                    <p className="text-sm text-gray-500">
                      Showing{" "}
                      <span className="font-medium text-green-700">{(currentPage - 1) * 20 + 1}</span> to{" "}
                      <span className="font-medium text-green-700">{Math.min(currentPage * 20, total)}</span> of{" "}
                      <span className="font-medium text-green-700">{total}</span> notifications
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="border-amber-200 hover:bg-green-50 text-green-700"
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="border-amber-200 hover:bg-green-50 text-green-700"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </CDCLayout>
    </ProtectedPage>
  );
}
