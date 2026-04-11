"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  const { data: session, status } = useSession();
  const router = useRouter();

  const [reports, setReports] = useState<PredictionHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalReports, setTotalReports] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");

  const fetchReports = async () => {
    if (!session?.accessToken) {
      setError("Authentication token not found. Please sign in again.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.getPredictionHistory(
        session.accessToken,
        currentPage,
        pageSize,
        sortBy,
        sortOrder
      );
      setReports(response.predictions || []);
      setTotalPages(response.pages);
      setTotalReports(response.total);
    } catch (err) {
      console.error("Error fetching reports:", err);
      setError(
        err instanceof Error ? err.message : "An error occurred while fetching reports"
      );
      if (err instanceof Error && err.message.includes("Authentication")) {
        setTimeout(() => signOut({ callbackUrl: "/auth/login" }), 2000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetchReports();
    }
  }, [status, currentPage, sortBy, sortOrder]);

  const deleteReport = async (reportId: string) => {
    if (!session?.accessToken) return;
    try {
      await apiClient.deletePredictionHistory(reportId, session.accessToken);
      fetchReports();
    } catch (err) {
      console.error("Error deleting report:", err);
      setError("Failed to delete report");
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
      for (
        let i = Math.max(2, currentPage - 1);
        i <= Math.min(totalPages - 1, currentPage + 1);
        i++
      )
        pages.push(i);
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
            {/* Page Header */}
            <div className="space-y-1">
              <h1 className="text-3xl font-serif font-bold text-green-800">
                Soil Analysis Reports
              </h1>
              <p className="text-green-600 font-serif">
                View and manage your historical soil analysis reports
              </p>
            </div>

            {/* Error Display */}
            {error && (
              <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span className="text-sm font-medium">{error}</span>
              </div>
            )}

            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                <Input
                  id="reports-search"
                  placeholder="Search by location, status, texture…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-9 h-10 rounded-lg border-amber-200 bg-white shadow-sm focus-visible:ring-green-400 placeholder:text-gray-400 text-sm"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <SlidersHorizontal className="h-4 w-4 text-green-600 shrink-0" />
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40 h-10 border-amber-200 bg-white shadow-sm text-sm rounded-lg focus:ring-green-400">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_at">Date Created</SelectItem>
                    <SelectItem value="soil_fertility_status">Fertility Status</SelectItem>
                    <SelectItem value="recommendations">Fertilizer</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortOrder} onValueChange={setSortOrder}>
                  <SelectTrigger className="w-28 h-10 border-amber-200 bg-white shadow-sm text-sm rounded-lg focus:ring-green-400">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Newest</SelectItem>
                    <SelectItem value="asc">Oldest</SelectItem>
                  </SelectContent>
                </Select>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={fetchReports}
                        disabled={isLoading}
                        className="h-10 w-10 border-amber-200 bg-white shadow-sm text-green-700 hover:bg-green-50 rounded-lg shrink-0"
                      >
                        <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Refresh reports</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>

            {/* Reports Table Card */}
            <Card className="border-amber-200 bg-white shadow-lg overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-green-50 to-amber-50 border-b border-amber-200 py-4 px-5">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-green-800 text-base font-semibold">
                    <FileText className="h-4 w-4" />
                    Analysis Reports
                  </CardTitle>
                  {!isLoading && (
                    <Badge
                      variant="secondary"
                      className="bg-amber-100 text-amber-800 border border-amber-200 text-xs font-medium"
                    >
                      {totalReports} total
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {isLoading ? (
                  <div className="divide-y divide-amber-100">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="px-5 py-5 flex items-center gap-5">
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-32 rounded-full" />
                          <Skeleton className="h-3 w-64" />
                        </div>
                        <Skeleton className="h-8 w-8 rounded-md" />
                        <Skeleton className="h-8 w-8 rounded-md" />
                      </div>
                    ))}
                  </div>
                ) : filteredReports.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                    <div className="rounded-full bg-green-50 p-4 mb-4">
                      <FileText className="h-8 w-8 text-green-400" />
                    </div>
                    <h3 className="text-base font-semibold text-gray-800 mb-1">
                      No Reports Found
                    </h3>
                    <p className="text-sm text-gray-500 max-w-xs">
                      {searchTerm
                        ? "No reports match your search. Try adjusting your query."
                        : "You haven't created any soil analysis reports yet."}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-amber-100">
                    {filteredReports.map((report, idx) => (
                      <div
                        key={report.id}
                        className="group px-5 py-5 hover:bg-amber-50/60 transition-colors duration-150 cursor-pointer"
                        onClick={() => router.push(`/reports/${report.id}`)}
                      >
                        <div className="flex items-center gap-5">
                          <span className="text-xs font-mono text-gray-300 w-5 shrink-0 select-none">
                            {(currentPage - 1) * pageSize + idx + 1}
                          </span>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <Badge
                                className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border-0 ${getStatusColor(report.soil_fertility_status)}`}
                              >
                                {report.soil_fertility_status || "Unknown"}
                              </Badge>
                              <span className="text-sm text-gray-700 font-medium truncate max-w-xs">
                                {report.recommendations?.[0] || "No recommendation"}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-green-500" />
                                {new Date(report.created_at || "").toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                              <span className="flex items-center gap-1">
                                <Beaker className="h-3 w-3 text-amber-500" />
                                {report.simplified_texture || "Unknown"} Soil
                              </span>
                              <span className="flex items-center gap-1 truncate">
                                <MapPin className="h-3 w-3 text-red-400 shrink-0" />
                                <span className="truncate">
                                  {report.location_name || "Unknown Location"}
                                </span>
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      router.push(`/reports/${report.id}`);
                                    }}
                                    className="h-8 w-8 rounded-md text-green-700 hover:bg-green-100 hover:text-green-800"
                                  >
                                    <Eye className="h-4 w-4" />
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
                                      if (confirm("Are you sure you want to delete this report?")) {
                                        deleteReport(report.id);
                                      }
                                    }}
                                    className="h-8 w-8 rounded-md text-red-500 hover:bg-red-50 hover:text-red-700"
                                  >
                                    <Trash2 className="h-4 w-4" />
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
              </CardContent>
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-2">
                <p className="text-sm text-gray-500 shrink-0">
                  Showing{" "}
                  <span className="font-medium text-gray-700">
                    {(currentPage - 1) * pageSize + 1}–
                    {Math.min(currentPage * pageSize, totalReports)}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-gray-700">{totalReports}</span>{" "}
                  reports
                </p>

                <Pagination className="mx-0 w-auto">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setCurrentPage(Math.max(1, currentPage - 1));
                        }}
                        aria-disabled={currentPage === 1}
                        className={`border border-amber-200 bg-white text-green-700 hover:bg-green-50 hover:text-green-800 ${
                          currentPage === 1 ? "pointer-events-none opacity-40" : ""
                        }`}
                      />
                    </PaginationItem>

                    {getPageNumbers().map((page, i) =>
                      page === "ellipsis" ? (
                        <PaginationItem key={`ellipsis-${i}`}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      ) : (
                        <PaginationItem key={page}>
                          <PaginationLink
                            href="#"
                            isActive={currentPage === page}
                            onClick={(e) => {
                              e.preventDefault();
                              setCurrentPage(page as number);
                            }}
                            className={
                              currentPage === page
                                ? "border-0 bg-green-700 text-white hover:bg-green-800 hover:text-white"
                                : "border border-amber-200 bg-white text-gray-700 hover:bg-amber-50"
                            }
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      )
                    )}

                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setCurrentPage(Math.min(totalPages, currentPage + 1));
                        }}
                        aria-disabled={currentPage === totalPages}
                        className={`border border-amber-200 bg-white text-green-700 hover:bg-green-50 hover:text-green-800 ${
                          currentPage === totalPages ? "pointer-events-none opacity-40" : ""
                        }`}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </SessionGuard>
  );
}
