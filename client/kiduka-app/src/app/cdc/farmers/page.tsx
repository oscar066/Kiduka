"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ProtectedPage } from "../../components/auth/roleBasedGaurd";
import { CDCLayout } from "../../components/layout/roleBasedLayout";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api-client";
import { UserRole } from "@/types/auth";
import {
  Search,
  Beaker,
  Eye,
  Mail,
  Phone,
  Loader2,
  Calendar,
  BarChart3,
  RefreshCw,
  Users,
  Clock,
  MapPin,
  CheckCircle2,
  Leaf,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

interface Farmer {
  id: string;
  username: string;
  full_name: string | null;
  email: string;
  phone_number?: string | null;
  prediction_count?: number | null;
  last_analysis_date?: string | null;
  created_at: string;
}

interface PaginatedFarmers {
  farmers?: Farmer[];
  total: number;
  pages: number;
}

interface Prediction {
  prediction_id: string;
  soil_health_index: number;
  soil_fertility_status: string | null;
  initial_soil_fertility_status?: string | null;
  recommendations: string[];
  location_name?: string | null;
  notification_sent?: boolean;
  created_at: string;
}

interface PaginatedPredictions {
  predictions?: Prediction[];
  total: number;
  pages: number;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}yr ago`;
}

function healthColor(index: number) {
  if (index >= 75) return { text: "text-green-700", bg: "bg-green-100", border: "border-green-200" };
  if (index >= 50) return { text: "text-amber-700", bg: "bg-amber-100", border: "border-amber-200" };
  return { text: "text-red-700", bg: "bg-red-100", border: "border-red-200" };
}

function HealthBar({ value }: { value: number }) {
  const color = value >= 75 ? "bg-green-500" : value >= 50 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
      <span className={`text-xs font-bold tabular-nums w-7 text-right ${value >= 75 ? "text-green-700" : value >= 50 ? "text-amber-600" : "text-red-600"}`}>
        {value}
      </span>
    </div>
  );
}

// ----- Farmer Detail Sheet -----
interface FarmerSheetProps {
  farmer: Farmer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string;
  onRunAnalysis: (farmerId: string) => void;
}

function FarmerSheet({ farmer, open, onOpenChange, token, onRunAnalysis }: FarmerSheetProps) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [predTotal, setPredTotal] = useState(0);
  const [predPages, setPredPages] = useState(1);
  const [predPage, setPredPage] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !farmer || !token) return;
    setPredPage(1);
    loadPredictions(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, farmer]);

  useEffect(() => {
    if (!open || !farmer || !token) return;
    loadPredictions(predPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [predPage]);

  const loadPredictions = async (page: number) => {
    if (!farmer) return;
    setLoading(true);
    try {
      const data: PaginatedPredictions = await apiClient.getCDCFarmerPredictions(farmer.id, token, page, 5);
      setPredictions(data.predictions || []);
      setPredTotal(data.total || 0);
      setPredPages(data.pages || 1);
    } catch (err) {
      console.error("Failed to load predictions:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!farmer) return null;

  const name = farmer.full_name || farmer.username;
  const initials = name.charAt(0).toUpperCase();
  const hasAnalyses = (farmer.prediction_count ?? 0) > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto border-amber-200 px-0 pb-0">
        {/* Sheet header */}
        <SheetHeader className="px-6 pb-4 border-b border-amber-100 bg-gradient-to-r from-green-50 to-amber-50">
          <div className="flex items-center gap-3 pt-2">
            <Avatar className="h-11 w-11 border border-amber-100 shrink-0">
              <AvatarFallback className="bg-green-100 text-green-700 font-bold text-lg">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <SheetTitle className="text-base font-serif font-bold text-green-800 leading-tight truncate">
                {name}
              </SheetTitle>
              <SheetDescription className="text-xs text-green-600 mt-0.5">
                Farmer Profile
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="px-6 py-5 space-y-6">

          {/* Contact info */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Contact</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="h-3.5 w-3.5 text-green-400 shrink-0" />
                <span className="truncate">{farmer.email}</span>
              </div>
              {farmer.phone_number ? (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="h-3.5 w-3.5 text-green-400 shrink-0" />
                  {farmer.phone_number}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  No phone on file
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-3.5 w-3.5 text-green-400 shrink-0" />
                Joined {new Date(farmer.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-50 rounded-lg border border-green-100 p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <BarChart3 className="h-3.5 w-3.5 text-green-500" />
                <span className="text-xs font-medium text-green-700">Total Analyses</span>
              </div>
              <p className="text-2xl font-bold text-green-900">{farmer.prediction_count ?? predTotal}</p>
            </div>
            <div className="bg-amber-50 rounded-lg border border-amber-100 p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Clock className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-xs font-medium text-amber-700">Last Visit</span>
              </div>
              {farmer.last_analysis_date ? (
                <p className="text-sm font-semibold text-amber-900 mt-1">
                  {timeAgo(farmer.last_analysis_date)}
                </p>
              ) : (
                <p className="text-sm text-gray-400 mt-1">None yet</p>
              )}
            </div>
          </div>

          {/* Run Analysis CTA */}
          <button
            onClick={() => onRunAnalysis(farmer.id)}
            className="w-full flex items-center gap-3 p-3.5 rounded-lg border border-amber-200 bg-white hover:bg-amber-50 hover:border-amber-300 transition-all text-left group"
          >
            <div className="p-2 bg-green-100 rounded-lg shrink-0 group-hover:bg-green-200 transition-colors">
              <Beaker className="h-4 w-4 text-green-700" />
            </div>
            <div>
              <p className="text-sm font-serif font-semibold text-green-800">Run New Analysis</p>
              <p className="text-xs text-green-600">Analyse soil for this farmer</p>
            </div>
          </button>

          {/* Analysis history */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-green-700 uppercase tracking-wide flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" />
                Analysis History
                {!loading && predTotal > 0 && (
                  <span className="text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full text-[10px] font-medium normal-case">
                    {predTotal}
                  </span>
                )}
              </p>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-lg border border-amber-100 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <Skeleton className="h-1.5 w-full rounded-full" />
                  </div>
                ))}
              </div>
            ) : predictions.length === 0 ? (
              <div className="flex flex-col items-center py-8 gap-2 text-center">
                <Leaf className="h-7 w-7 text-green-300" />
                <p className="text-sm font-serif font-medium text-green-700">No analyses yet</p>
                <p className="text-xs text-gray-400">Run the first soil analysis for this farmer.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {predictions.map((p) => {
                  const colors = healthColor(p.soil_health_index);
                  return (
                    <div key={p.prediction_id} className="rounded-lg border border-amber-100 bg-white p-3 space-y-2 hover:border-amber-200 transition-colors">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="outline" className={`text-xs ${colors.text} ${colors.bg} ${colors.border}`}>
                          {p.soil_fertility_status || p.initial_soil_fertility_status || "Unknown"}
                        </Badge>
                        <div className="flex items-center gap-2 shrink-0">
                          {p.notification_sent && (
                            <span className="flex items-center gap-0.5 text-[10px] text-green-600">
                              <CheckCircle2 className="h-3 w-3" /> Sent
                            </span>
                          )}
                          <span className="text-xs text-gray-400">
                            {new Date(p.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                        </div>
                      </div>
                      {p.location_name && (
                        <p className="flex items-center gap-1 text-xs text-gray-400">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {p.location_name}
                        </p>
                      )}
                      {p.recommendations?.length > 0 && (
                        <p className="text-xs text-gray-500 line-clamp-1">{p.recommendations[0]}</p>
                      )}
                    </div>
                  );
                })}

                {predPages > 1 && (
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-gray-400">
                      Page {predPage} of {predPages}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPredPage((p) => Math.max(1, p - 1))}
                        disabled={predPage === 1}
                        className="h-6 text-xs border-amber-200 hover:bg-green-50 text-green-700 px-2"
                      >
                        Prev
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPredPage((p) => Math.min(predPages, p + 1))}
                        disabled={predPage === predPages}
                        className="h-6 text-xs border-amber-200 hover:bg-green-50 text-green-700 px-2"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ----- Main Page -----
export default function CDCFarmersPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedFarmer, setSelectedFarmer] = useState<Farmer | null>(null);

  const loadFarmers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response: PaginatedFarmers = await apiClient.getCDCFarmers(token, currentPage, 20, searchTerm || undefined);
      setFarmers(response.farmers || []);
      setTotal(response.total || 0);
      setTotalPages(response.pages || 1);
    } catch (error) {
      console.error("Error loading farmers:", error);
    } finally {
      setLoading(false);
    }
  }, [token, currentPage, searchTerm]);

  useEffect(() => { loadFarmers(); }, [loadFarmers]);

  const handleViewFarmer = (farmer: Farmer) => {
    setSelectedFarmer(farmer);
    setSheetOpen(true);
  };

  const handleRunAnalysis = (farmerId: string) => {
    setSheetOpen(false);
    router.push(`/cdc/analyze?farmer_id=${farmerId}`);
  };

  return (
    <ProtectedPage requiredRole={UserRole.CDC}>
      <CDCLayout>
        <div className="space-y-6 p-1">

          {/* Header */}
          <div>
            <h1 className="text-2xl font-serif font-bold bg-gradient-to-r from-green-800 via-emerald-600 to-green-700 bg-clip-text text-transparent">
              Farmers
            </h1>
            <p className="mt-0.5 text-sm text-green-600 font-serif">
              View and manage the farmers you serve
            </p>
          </div>

          {/* Table card */}
          <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">

            {/* Card header */}
            <div className="px-4 py-3 bg-gradient-to-r from-green-50 to-amber-50 border-b border-amber-200 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2 shrink-0">
                <Users className="h-4 w-4 text-green-600" />
                <span className="text-sm font-serif font-semibold text-green-800">All Farmers</span>
                {!loading && (
                  <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full font-medium">
                    {total}
                  </span>
                )}
              </div>
              <div className="flex flex-1 gap-2 sm:justify-end">
                <div className="relative flex-1 sm:max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-green-400" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="pl-9 h-8 text-sm border-amber-200 focus-visible:ring-green-500 bg-white"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadFarmers}
                  disabled={loading}
                  className="h-8 w-8 p-0 text-green-600 hover:bg-green-50 border border-amber-200"
                  aria-label="Refresh"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </div>

            {/* Body */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-green-500" />
                <p className="text-sm text-green-600 font-medium">Loading farmers...</p>
              </div>
            ) : farmers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="p-4 bg-green-50 rounded-full">
                  <Search className="h-7 w-7 text-green-400" />
                </div>
                <p className="text-green-800 font-serif font-medium">No farmers found</p>
                <p className="text-sm text-gray-500">Try adjusting your search.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-amber-100">
                    <thead className="bg-gradient-to-r from-green-50 to-amber-50">
                      <tr>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-green-800 uppercase tracking-wider">Farmer</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-green-800 uppercase tracking-wider">Analyses</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-green-800 uppercase tracking-wider">Joined</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold text-green-800 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-amber-50">
                      {farmers.map((farmer) => {
                        const name = farmer.full_name || farmer.username;
                        const initials = name.charAt(0).toUpperCase();
                        const hasAnalyses = (farmer.prediction_count ?? 0) > 0;

                        return (
                          <tr
                            key={farmer.id}
                            className="hover:bg-green-50/30 transition-colors group cursor-pointer"
                            onClick={() => handleViewFarmer(farmer)}
                          >
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9 border border-amber-100 shrink-0">
                                  <AvatarFallback className="bg-green-100 text-green-700 text-sm font-bold">
                                    {initials}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-gray-900 group-hover:text-green-700 transition-colors truncate">
                                    {name}
                                  </p>
                                  <div className="flex items-center gap-3 mt-0.5">
                                    <span className="flex items-center gap-1 text-xs text-gray-500">
                                      <Mail className="h-3 w-3 shrink-0" />
                                      <span className="truncate max-w-[160px]">{farmer.email}</span>
                                    </span>
                                    {farmer.phone_number && (
                                      <span className="flex items-center gap-1 text-xs text-gray-500">
                                        <Phone className="h-3 w-3 shrink-0" />
                                        {farmer.phone_number}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="px-5 py-3.5 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <span className={`flex items-center gap-1 text-sm font-medium ${hasAnalyses ? "text-green-700" : "text-gray-400"}`}>
                                  <BarChart3 className="h-3.5 w-3.5 shrink-0" />
                                  {farmer.prediction_count ?? 0}
                                </span>
                                {farmer.last_analysis_date && (
                                  <span className="flex items-center gap-1 text-xs text-gray-400">
                                    <Clock className="h-3 w-3 shrink-0" />
                                    {timeAgo(farmer.last_analysis_date)}
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="px-5 py-3.5 whitespace-nowrap">
                              <span className="flex items-center gap-1.5 text-xs text-gray-500">
                                <Calendar className="h-3 w-3 text-green-400 shrink-0" />
                                {new Date(farmer.created_at).toLocaleDateString()}
                              </span>
                            </td>

                            <td
                              className="px-5 py-3.5 whitespace-nowrap text-right"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2.5 text-xs border-amber-200 text-green-700 hover:bg-green-50 gap-1.5"
                                  onClick={() => handleViewFarmer(farmer)}
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  View
                                </Button>
                                <Button
                                  size="sm"
                                  className="h-7 px-2.5 text-xs bg-green-600 hover:bg-green-700 text-white gap-1.5"
                                  onClick={() => router.push(`/cdc/analyze?farmer_id=${farmer.id}`)}
                                >
                                  <Beaker className="h-3.5 w-3.5" />
                                  Analyse
                                </Button>
                              </div>
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
                    of <span className="font-medium text-green-700">{total}</span> farmers
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

        {/* Farmer detail sheet */}
        <FarmerSheet
          farmer={selectedFarmer}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          token={token!}
          onRunAnalysis={handleRunAnalysis}
        />
      </CDCLayout>
    </ProtectedPage>
  );
}
