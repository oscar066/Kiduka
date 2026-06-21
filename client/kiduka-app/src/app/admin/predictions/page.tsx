"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import { ProtectedPage } from "../../components/auth/roleBasedGaurd";
import { AdminLayout } from "../../components/layout/roleBasedLayout";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api-client";
import { UserRole } from "@/types/auth";
import { getStatusColor } from "@/lib/soil-analysis-helper";
import {
  Search,
  RefreshCw,
  Trash2,
  Beaker,
  Calendar,
  MapPin,
  User,
  AlertTriangle,
  X,
  Loader2,
  Flag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AdminPrediction {
  id: string;
  user_id: string;
  username?: string;
  full_name?: string;
  soil_fertility_status: string;
  soil_health_index: number;
  location_name?: string;
  simplified_texture?: string;
  recommendations?: string[];
  is_flagged?: boolean;
  created_at: string;
}

export default function AdminPredictionsPage() {
  const { token } = useAuth();

  const [predictions, setPredictions] = useState<AdminPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [flagFilter, setFlagFilter] = useState<"ALL" | "flagged" | "normal">("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  const loadPredictions = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const flagged = flagFilter === "flagged" ? true : flagFilter === "normal" ? false : undefined;
      const response = await apiClient.getAllPredictions(token, currentPage, pageSize, undefined, flagged);
      setPredictions(response.predictions || []);
      setTotal(response.total ?? 0);
      setTotalPages(response.pages ?? 1);
    } catch (err) {
      console.error("Failed to load predictions:", err);
    } finally {
      setLoading(false);
    }
  }, [token, currentPage, flagFilter]);

  useEffect(() => {
    loadPredictions();
  }, [loadPredictions]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this prediction? This cannot be undone.")) return;
    try {
      await apiClient.deletePrediction(id, token!);
      loadPredictions();
    } catch {
      alert("Failed to delete prediction.");
    }
  };

  const filtered = predictions.filter((p) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      p.username?.toLowerCase().includes(q) ||
      p.full_name?.toLowerCase().includes(q) ||
      p.location_name?.toLowerCase().includes(q) ||
      p.soil_fertility_status?.toLowerCase().includes(q)
    );
  });

  return (
    <ProtectedPage requiredRole={UserRole.ADMIN}>
      <AdminLayout>
        <div className="space-y-6 p-1">

          {/* Header */}
          <div>
            <h1 className="text-2xl font-serif font-bold bg-gradient-to-r from-green-800 via-emerald-600 to-green-700 bg-clip-text text-transparent">
              Predictions
            </h1>
            <p className="mt-0.5 text-sm text-green-600 font-serif">
              All soil analysis predictions made by users across the platform
            </p>
          </div>

          {/* Table card */}
          <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">

            {/* Card header */}
            <div className="px-4 py-3 bg-gradient-to-r from-green-50 to-amber-50 border-b border-amber-200 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2 shrink-0">
                <Beaker className="h-4 w-4 text-green-600" />
                <span className="text-sm font-serif font-semibold text-green-800">All Predictions</span>
                {!loading && (
                  <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full font-medium">
                    {total}
                  </span>
                )}
              </div>

              <div className="flex flex-1 gap-2 sm:justify-end flex-wrap">
                {/* Search */}
                <div className="relative flex-1 sm:max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-green-400 pointer-events-none" />
                  <Input
                    placeholder="Search user or location…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-8 h-8 text-sm border-amber-200 focus-visible:ring-green-500 bg-white"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Flag filter */}
                <Select value={flagFilter} onValueChange={(v) => { setFlagFilter(v as typeof flagFilter); setCurrentPage(1); }}>
                  <SelectTrigger className="h-8 w-36 text-sm border-amber-200 focus:ring-green-500 bg-white">
                    <div className="flex items-center gap-1.5">
                      <Flag className="h-3.5 w-3.5 text-green-400 shrink-0" />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All</SelectItem>
                    <SelectItem value="flagged">Flagged</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                  </SelectContent>
                </Select>

                {/* Refresh */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={loadPredictions}
                        disabled={loading}
                        className="h-8 w-8 p-0 text-green-600 hover:bg-green-50 border border-amber-200"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Refresh</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>

            {/* Body */}
            {loading ? (
              <div className="divide-y divide-amber-50">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="px-5 py-4 flex items-center gap-4">
                    <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-3.5 w-16" />
                    <Skeleton className="h-7 w-7 rounded-md" />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <div className="p-4 bg-green-50 rounded-full">
                  <Beaker className="h-7 w-7 text-green-400" />
                </div>
                <p className="text-sm font-serif font-medium text-green-800">
                  {searchTerm ? "No predictions match your search" : "No predictions yet"}
                </p>
                <p className="text-xs text-gray-400">
                  {searchTerm ? "Try a different search term." : "Predictions will appear here once users run soil analyses."}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-amber-100">
                    <thead className="bg-gradient-to-r from-green-50 to-amber-50">
                      <tr>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-green-800 uppercase tracking-wider">User</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-green-800 uppercase tracking-wider">Fertility Status</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-green-800 uppercase tracking-wider">Location</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-green-800 uppercase tracking-wider">SHI</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-green-800 uppercase tracking-wider">Date</th>
                        <th className="relative px-5 py-3"><span className="sr-only">Actions</span></th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-amber-50">
                      {filtered.map((p) => (
                        <tr key={p.id} className="hover:bg-green-50/30 transition-colors group">

                          {/* User */}
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="h-7 w-7 rounded-full bg-green-100 border border-green-200 flex items-center justify-center shrink-0">
                                <User className="h-3.5 w-3.5 text-green-600" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate max-w-[140px]">
                                  {p.full_name || p.username || "Unknown"}
                                </p>
                                {p.username && p.full_name && (
                                  <p className="text-xs text-gray-400 truncate max-w-[140px]">@{p.username}</p>
                                )}
                              </div>
                              {p.is_flagged && (
                                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" aria-label="Flagged" />
                              )}
                            </div>
                          </td>

                          {/* Fertility status */}
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <div className="space-y-1">
                              <Badge className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border-0 ${getStatusColor(p.soil_fertility_status)}`}>
                                {p.soil_fertility_status || "Unknown"}
                              </Badge>
                              {p.simplified_texture && (
                                <p className="text-xs text-gray-400 flex items-center gap-1">
                                  <Beaker className="h-3 w-3 text-amber-400" />
                                  {p.simplified_texture}
                                </p>
                              )}
                            </div>
                          </td>

                          {/* Location */}
                          <td className="px-5 py-3.5">
                            <span className="flex items-center gap-1 text-xs text-gray-600 max-w-[160px] truncate">
                              <MapPin className="h-3 w-3 text-red-300 shrink-0" />
                              {p.location_name || "—"}
                            </span>
                          </td>

                          {/* SHI */}
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <span className="text-sm font-semibold text-green-700 tabular-nums">
                              {p.soil_health_index != null ? p.soil_health_index.toFixed(2) : "—"}
                            </span>
                            <span className="text-xs text-gray-400">/4</span>
                          </td>

                          {/* Date */}
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <Calendar className="h-3 w-3 text-green-400" />
                              {new Date(p.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-3.5 whitespace-nowrap text-right">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDelete(p.id)}
                                    className="h-7 w-7 rounded-md text-red-400 hover:bg-red-50 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete prediction</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination footer */}
                {totalPages > 1 && (
                  <div className="px-5 py-3 border-t border-amber-100 bg-gradient-to-r from-green-50/50 to-amber-50/50 flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      Showing{" "}
                      <span className="font-medium text-green-700">{(currentPage - 1) * pageSize + 1}</span>–
                      <span className="font-medium text-green-700">{Math.min(currentPage * pageSize, total)}</span>{" "}
                      of <span className="font-medium text-green-700">{total}</span> predictions
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1 || loading}
                        className="h-7 text-xs border-amber-200 hover:bg-green-50 text-green-700"
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages || loading}
                        className="h-7 text-xs border-amber-200 hover:bg-green-50 text-green-700"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Loader2 used inline above */}
          <span className="hidden"><Loader2 /></span>
        </div>
      </AdminLayout>
    </ProtectedPage>
  );
}
