"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
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
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import UnifiedSidebar from "../../layout/UnifiedSidebar";
import { Navbar } from "../../layout/navbar";
import { apiClient } from "@/lib/api-client";
import { SessionGuard } from "../../shared/SessionGuard";
import useSWR from "swr";
import { swrFetcher } from "@/lib/swr-config";
import type { PaginatedResponse } from "@/types/api";
import {
  Beaker,
  FileText,
  Calendar,
  MapPin,
  AlertCircle,
  Search,
  Eye,
  Trash2,
  RefreshCw,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { PredictionHistory } from "@/types/soil-analysis";
import { getStatusColor } from "@/lib/soil-analysis-helper";

export default function ReportsPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");

  const { data: response, error: fetchError, isLoading, isValidating, mutate } =
    useSWR<PaginatedResponse<PredictionHistory>>(
      session?.accessToken
        ? ["getPredictionHistory", session.accessToken, currentPage, pageSize, sortBy, sortOrder]
        : null,
      swrFetcher
    );

  const reports = response?.predictions || [];
  const totalPages = response?.pages || 0;
  const totalReports = response?.total || 0;
  const error = fetchError ? "An error occurred while fetching reports" : null;

  const deleteReport = async (reportId: string) => {
    if (!session?.accessToken) return;
    try {
      await apiClient.deletePredictionHistory(reportId, session.accessToken);
      mutate();
    } catch {
      alert("Failed to delete report");
    }
  };

  const filteredReports = reports.filter(
    (report) =>
      report.soil_fertility_status?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.recommendations?.[0]?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.location_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.simplified_texture?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPageNumbers = (): (number | "ellipsis")[] => {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("ellipsis");
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push("ellipsis");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <SessionGuard message="You need to be logged in to access your reports.">
      <SidebarProvider>
        <UnifiedSidebar />
        <SidebarInset>
          <Navbar />

          <main className="flex-1 space-y-6 p-6 bg-gradient-to-br from-green-25 via-amber-25 to-green-25 min-h-screen">

            {/* Page header */}
            <div>
              <h1 className="text-2xl font-serif font-bold bg-gradient-to-r from-green-800 via-emerald-600 to-green-700 bg-clip-text text-transparent">
                Soil Analysis Reports
              </h1>
              <p className="mt-0.5 text-sm text-green-600 font-serif">
                View and manage your historical soil analysis reports
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-red-800">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span className="text-sm font-medium">{error}</span>
              </div>
            )}

            {/* Reports card */}
            <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">

              {/* Card header */}
              <div className="px-4 py-3 bg-gradient-to-r from-green-50 to-amber-50 border-b border-amber-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-serif font-semibold text-green-800">Analysis Reports</span>
                  {!isLoading && totalReports > 0 && (
                    <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full font-medium">
                      {totalReports}
                    </span>
                  )}
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => mutate()}
                        disabled={isLoading}
                        className="h-8 w-8 p-0 text-green-600 hover:bg-green-50 border border-amber-200"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${isValidating ? "animate-spin" : ""}`} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Refresh reports</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {/* Search + sort toolbar */}
              <div className="px-4 py-3 border-b border-amber-100 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center bg-white">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-green-400" />
                  <Input
                    placeholder="Search by location, status, texture…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 pr-8 h-9 border-amber-200 focus-visible:ring-green-400 text-sm"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-38 h-9 border-amber-200 text-sm focus:ring-green-400">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="created_at">Date Created</SelectItem>
                      <SelectItem value="soil_fertility_status">Fertility Status</SelectItem>
                      <SelectItem value="recommendations">Fertilizer</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={sortOrder} onValueChange={setSortOrder}>
                    <SelectTrigger className="w-28 h-9 border-amber-200 text-sm focus:ring-green-400">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desc">Newest</SelectItem>
                      <SelectItem value="asc">Oldest</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Body */}
              {isLoading ? (
                <div className="divide-y divide-amber-100">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="px-5 py-4 flex items-center gap-4">
                      <Skeleton className="h-3 w-4 rounded" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32 rounded-full" />
                        <Skeleton className="h-3 w-56 rounded" />
                      </div>
                      <Skeleton className="h-7 w-7 rounded-md" />
                      <Skeleton className="h-7 w-7 rounded-md" />
                    </div>
                  ))}
                </div>
              ) : filteredReports.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center px-6 gap-3">
                  <div className="p-4 bg-green-50 rounded-full">
                    <FileText className="h-7 w-7 text-green-400" />
                  </div>
                  <p className="text-sm font-serif font-medium text-green-800">
                    {searchTerm ? "No reports match your search" : "No reports yet"}
                  </p>
                  <p className="text-xs text-gray-400 max-w-xs">
                    {searchTerm
                      ? "Try adjusting your search or filters."
                      : "Run your first soil analysis to see reports here."}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-amber-50">
                  {filteredReports.map((report, idx) => (
                    <div
                      key={report.id}
                      className="group px-5 py-4 hover:bg-green-50/30 transition-colors cursor-pointer"
                      onClick={() => router.push(`/reports/${report.id}`)}
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-xs font-mono text-gray-300 w-5 shrink-0 select-none">
                          {(currentPage - 1) * pageSize + idx + 1}
                        </span>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <Badge className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border-0 ${getStatusColor(report.soil_fertility_status)}`}>
                              {report.soil_fertility_status || "Unknown"}
                            </Badge>
                            <span className="text-sm text-gray-700 font-medium truncate max-w-xs">
                              {report.recommendations?.[0] || "No recommendation"}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-green-400" />
                              {new Date(report.created_at || "").toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                            </span>
                            <span className="flex items-center gap-1">
                              <Beaker className="h-3 w-3 text-amber-400" />
                              {report.simplified_texture || "Unknown"} Soil
                            </span>
                            <span className="flex items-center gap-1 truncate">
                              <MapPin className="h-3 w-3 text-red-300 shrink-0" />
                              <span className="truncate">{report.location_name || "Unknown location"}</span>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={(e) => { e.stopPropagation(); router.push(`/reports/${report.id}`); }}
                                  className="h-7 w-7 rounded-md text-green-600 hover:bg-green-100"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>View report</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm("Delete this report?")) deleteReport(report.id);
                                  }}
                                  className="h-7 w-7 rounded-md text-red-400 hover:bg-red-50 hover:text-red-600"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete report</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination footer */}
              {totalPages > 1 && (
                <div className="px-5 py-3 border-t border-amber-100 bg-gradient-to-r from-green-50/50 to-amber-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <p className="text-xs text-gray-500">
                    Showing{" "}
                    <span className="font-medium text-green-700">{(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, totalReports)}</span>
                    {" "}of{" "}
                    <span className="font-medium text-green-700">{totalReports}</span> reports
                  </p>

                  <Pagination className="mx-0 w-auto">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(e) => { e.preventDefault(); setCurrentPage(Math.max(1, currentPage - 1)); }}
                          aria-disabled={currentPage === 1}
                          className={`h-7 text-xs border border-amber-200 bg-white text-green-700 hover:bg-green-50 ${currentPage === 1 ? "pointer-events-none opacity-40" : ""}`}
                        />
                      </PaginationItem>

                      {getPageNumbers().map((page, i) =>
                        page === "ellipsis" ? (
                          <PaginationItem key={`e-${i}`}><PaginationEllipsis /></PaginationItem>
                        ) : (
                          <PaginationItem key={page}>
                            <PaginationLink
                              href="#"
                              isActive={currentPage === page}
                              onClick={(e) => { e.preventDefault(); setCurrentPage(page as number); }}
                              className={`h-7 w-7 text-xs ${currentPage === page ? "border-0 bg-green-700 text-white hover:bg-green-800" : "border border-amber-200 bg-white text-gray-600 hover:bg-amber-50"}`}
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        )
                      )}

                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(e) => { e.preventDefault(); setCurrentPage(Math.min(totalPages, currentPage + 1)); }}
                          aria-disabled={currentPage === totalPages}
                          className={`h-7 text-xs border border-amber-200 bg-white text-green-700 hover:bg-green-50 ${currentPage === totalPages ? "pointer-events-none opacity-40" : ""}`}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </SessionGuard>
  );
}
