// components/ReportsPage.tsx
"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { Navbar } from "./navbar";

// Import shared components
import { ComprehensiveAnalysis } from "./soil-analysis/comprehensiveAnalysis";
import { ActionPlanRecommendations } from "./soil-analysis/actionPlanRecommendation";
import { NutrientDisplay } from "./soil-analysis/nutrientDisplay";
import { AgrovetsDisplay } from "./soil-analysis/agrovetDisplay";
import { StatusSummaryCards } from "./soil-analysis/statusSummaryCard";

import {
  Beaker,
  FileText,
  Calendar,
  MapPin,
  TrendingUp,
  AlertCircle,
  Loader2,
  Lock,
  ChevronLeft,
  ChevronRight,
  Search,
  Eye,
  Trash2,
  ArrowLeft,
} from "lucide-react";

import { SoilData } from "@/types/soil-analysis";
import { getStatusColor } from "@/lib/soil-analysis-helper";

interface PredictionHistory extends SoilData {
  id: string;
  user_id: string;
}

interface PredictionListResponse {
  predictions: PredictionHistory[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export default function ReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [reports, setReports] = useState<PredictionHistory[]>([]);
  const [selectedReport, setSelectedReport] =
    useState<PredictionHistory | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalReports, setTotalReports] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");

  // Authentication logic (same as dashboard)
  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  // Fetch reports function
  const fetchReports = async () => {
    if (!session?.accessToken) {
      setError("Authentication token not found. Please sign in again.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        size: pageSize.toString(),
        sort_by: sortBy,
        sort_order: sortOrder,
      });

      const response = await fetch(
        `http://127.0.0.1:8000/predictions?${params}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Authentication failed. Please sign in again.");
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: PredictionListResponse = await response.json();
      setReports(data.predictions);
      setTotalPages(data.pages);
      setTotalReports(data.total);
    } catch (err) {
      console.error("Error fetching reports:", err);
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred while fetching reports"
      );

      if (err instanceof Error && err.message.includes("Authentication")) {
        setTimeout(() => {
          signOut({ callbackUrl: "/auth/login" });
        }, 2000);
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
      const response = await fetch(
        `http://127.0.0.1:8000/predictions/${reportId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
        }
      );

      if (response.ok) {
        fetchReports();
        if (selectedReport?.id === reportId) {
          setSelectedReport(null);
        }
      } else {
        throw new Error("Failed to delete report");
      }
    } catch (err) {
      console.error("Error deleting report:", err);
      setError("Failed to delete report");
    }
  };

  const filteredReports = reports.filter(
    (report) =>
      report.fertility_prediction
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      report.fertilizer_recommendation
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      report.location_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.simplified_texture
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase())
  );

  // Loading and access denied screens (same as dashboard)
  if (status === "loading") {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-green-25 via-amber-25 to-green-25">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          <div className="text-center">
            <h3 className="text-lg font-medium text-green-800">Loading...</h3>
            <p className="text-green-600">Checking authentication status</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-green-25 via-amber-25 to-green-25">
        <Card className="w-full max-w-md border-red-200 bg-white shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-red-800">Access Denied</CardTitle>
            <CardDescription className="text-red-600">
              You need to be logged in to access your reports.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={() => router.push("/auth/login")}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              Sign In
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/")}
              className="w-full border-green-200 text-green-700 hover:bg-green-50"
            >
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Navbar />

        <main className="flex-1 space-y-6 p-6 bg-gradient-to-br from-green-25 via-amber-25 to-green-25 min-h-screen">
          {!selectedReport ? (
            // Reports List View
            <>
              <div className="space-y-2">
                <h1 className="text-3xl font-serif font-bold text-green-800">
                  Soil Analysis Reports
                </h1>
                <p className="text-green-600 font-serif">
                  View and manage your historical soil analysis reports
                </p>
              </div>

              {/* Error Display */}
              {error && (
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-red-800">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        Error: {error}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Search and Filter Controls */}
              <Card className="border-amber-200 bg-white shadow-lg">
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="flex flex-col md:flex-row gap-4 flex-1">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          placeholder="Search reports..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 border-amber-200 focus:border-green-500"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Select value={sortBy} onValueChange={setSortBy}>
                          <SelectTrigger className="w-40 border-amber-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="created_at">
                              Date Created
                            </SelectItem>
                            <SelectItem value="fertility_prediction">
                              Fertility Status
                            </SelectItem>
                            <SelectItem value="fertilizer_recommendation">
                              Fertilizer
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={sortOrder} onValueChange={setSortOrder}>
                          <SelectTrigger className="w-32 border-amber-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="desc">Newest</SelectItem>
                            <SelectItem value="asc">Oldest</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button
                      onClick={fetchReports}
                      variant="outline"
                      className="border-green-200 text-green-700 hover:bg-green-50"
                    >
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Reports List */}
              <Card className="border-amber-200 bg-white shadow-lg">
                <CardHeader className="bg-gradient-to-r from-green-50 to-amber-50 border-b border-amber-200">
                  <CardTitle className="flex items-center gap-2 text-green-800">
                    <FileText className="h-5 w-5" />
                    Analysis Reports ({totalReports})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                    </div>
                  ) : filteredReports.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No Reports Found
                      </h3>
                      <p className="text-gray-500">
                        {searchTerm
                          ? "No reports match your search criteria."
                          : "You haven't created any soil analysis reports yet."}
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-amber-100">
                      {filteredReports.map((report) => (
                        <div
                          key={report.id}
                          className="p-4 hover:bg-amber-25 transition-colors cursor-pointer"
                          onClick={() => setSelectedReport(report)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-4 mb-2">
                                <span
                                  className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                                    report.fertility_prediction
                                  )}`}
                                >
                                  {report.fertility_prediction}
                                </span>
                                <span className="text-sm text-gray-600">
                                  {report.fertilizer_recommendation} Recommended
                                </span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  {new Date(
                                    report.created_at || ""
                                  ).toLocaleDateString()}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Beaker className="h-4 w-4" />
                                  {report.simplified_texture || "Unknown"} Soil
                                </div>
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-4 w-4" />
                                  {report.location_name || "Unknown Location"}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedReport(report);
                                }}
                                className="border-green-200 text-green-700 hover:bg-green-50"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (
                                    confirm(
                                      "Are you sure you want to delete this report?"
                                    )
                                  ) {
                                    deleteReport(report.id);
                                  }
                                }}
                                className="border-red-200 text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
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
                <Card className="border-amber-200 bg-white shadow-lg">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-600">
                        Showing {(currentPage - 1) * pageSize + 1} to{" "}
                        {Math.min(currentPage * pageSize, totalReports)} of{" "}
                        {totalReports} reports
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setCurrentPage(Math.max(1, currentPage - 1))
                          }
                          disabled={currentPage === 1}
                          className="border-amber-200"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm text-gray-600">
                          Page {currentPage} of {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setCurrentPage(
                              Math.min(totalPages, currentPage + 1)
                            )
                          }
                          disabled={currentPage === totalPages}
                          className="border-amber-200"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            // Report Detail View - Using shared components
            <>
              <div className="flex items-center gap-4 mb-6">
                <Button
                  variant="outline"
                  onClick={() => setSelectedReport(null)}
                  className="border-green-200 text-green-700 hover:bg-green-50"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Reports
                </Button>
                <div>
                  <h1 className="text-3xl font-serif font-bold text-green-800">
                    Report Details
                  </h1>
                  <p className="text-green-600 font-serif">
                    Created on{" "}
                    {new Date(
                      selectedReport.created_at || ""
                    ).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Report Summary Cards - Using shared component */}
              <StatusSummaryCards soilData={selectedReport} />

              {/* Nutrient Analysis - Using shared component */}
              <NutrientDisplay soilData={selectedReport} />

              {/* Comprehensive Analysis - Using shared component */}
              {selectedReport.structured_response && (
                <ComprehensiveAnalysis
                  structuredResponse={selectedReport.structured_response}
                />
              )}

              {/* Action Plan & Recommendations - Using shared component */}
              {selectedReport.structured_response && (
                <ActionPlanRecommendations
                  structuredResponse={selectedReport.structured_response}
                />
              )}

              {/* Agrovets - Using shared component */}
              {selectedReport.agrovets && (
                <AgrovetsDisplay agrovets={selectedReport.agrovets} />
              )}

              {/* Report Actions */}
              <Card className="border-amber-200 bg-white shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-green-800">
                        Report Actions
                      </h4>
                      <p className="text-sm text-gray-600">
                        Manage this soil analysis report
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          // Implement export functionality here
                          console.log("Export report:", selectedReport.id);
                        }}
                        className="border-green-200 text-green-700 hover:bg-green-50"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Export Report
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          if (
                            confirm(
                              "Are you sure you want to delete this report?"
                            )
                          ) {
                            deleteReport(selectedReport.id);
                          }
                        }}
                        className="border-red-200 text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Report
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
