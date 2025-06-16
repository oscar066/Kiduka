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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { Navbar } from "./navbar";
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
  Filter,
  Eye,
  Trash2,
  ArrowLeft,
  Target,
  Activity,
  CheckCircle,
  AlertTriangle,
  Info,
  Clock,
  Leaf,
  Zap,
  Droplets,
  Mountain,
  Atom,
  Sparkles,
} from "lucide-react";

interface AgrovetInfo {
  id?: string;
  name: string;
  latitude: number;
  longitude: number;
  products: string[];
  prices: number[];
  distance_km: number;
  address?: string;
  phone?: string;
  email?: string;
  rating?: number;
  services?: string[];
}

interface PredictionHistory {
  id: string;
  user_id: string;
  simplified_texture?: string;
  soil_ph?: number;
  nitrogen?: number;
  phosphorus?: number;
  potassium?: number;
  organic_matter?: number;
  calcium?: number;
  magnesium?: number;
  copper?: number;
  iron?: number;
  zinc?: number;
  location_lat?: number;
  location_lng?: number;
  location_name?: string;
  fertility_prediction: string;
  fertility_confidence?: number;
  fertilizer_recommendation: string;
  fertilizer_confidence?: number;
  structured_response?: {
    explanation: {
      summary: string;
      fertility_analysis: string;
      nutrient_analysis: string;
      ph_analysis: string;
      soil_texture_analysis: string;
      overall_assessment: string;
    };
    recommendations: Array<{
      category: string;
      priority: string;
      action: string;
      reasoning: string;
      timeframe: string;
    }>;
    fertilizer_justification: string;
    confidence_assessment: string;
    long_term_strategy: string;
  };
  agrovets: AgrovetInfo[];
  created_at: string;
  updated_at: string;
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

  // Redirect unauthenticated users
  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  // Fetch reports
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

  // Fetch reports on component mount and when dependencies change
  useEffect(() => {
    if (status === "authenticated") {
      fetchReports();
    }
  }, [status, currentPage, sortBy, sortOrder]);

  // Delete report function
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
        // Refresh the reports list
        fetchReports();
        // Close detail view if the deleted report was selected
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

  // Filter reports based on search term
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

  // Show loading screen while checking authentication
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

  // Show access denied for unauthenticated users
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

  // Helper functions for styling
  const getPriorityStyle = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "high":
        return {
          color: "text-red-700",
          bg: "bg-red-50",
          border: "border-red-200",
          icon: <AlertTriangle className="h-4 w-4 text-red-600" />,
        };
      case "medium":
        return {
          color: "text-yellow-700",
          bg: "bg-yellow-50",
          border: "border-yellow-200",
          icon: <AlertCircle className="h-4 w-4 text-yellow-600" />,
        };
      case "low":
        return {
          color: "text-blue-700",
          bg: "bg-blue-50",
          border: "border-blue-200",
          icon: <Info className="h-4 w-4 text-blue-600" />,
        };
      default:
        return {
          color: "text-gray-700",
          bg: "bg-gray-50",
          border: "border-gray-200",
          icon: <Info className="h-4 w-4 text-gray-600" />,
        };
    }
  };

  const getTimeframeStyle = (timeframe: string) => {
    switch (timeframe.toLowerCase()) {
      case "immediate":
        return {
          color: "text-red-600",
          icon: <Target className="h-3 w-3" />,
        };
      case "within_week":
        return {
          color: "text-orange-600",
          icon: <Clock className="h-3 w-3" />,
        };
      case "seasonal":
        return {
          color: "text-yellow-600",
          icon: <Activity className="h-3 w-3" />,
        };
      case "ongoing":
        return {
          color: "text-blue-600",
          icon: <CheckCircle className="h-3 w-3" />,
        };
      default:
        return {
          color: "text-gray-600",
          icon: <Clock className="h-3 w-3" />,
        };
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "excellent":
        return "text-green-700 bg-green-100";
      case "good":
        return "text-emerald-700 bg-emerald-100";
      case "fair":
        return "text-yellow-700 bg-yellow-100";
      case "poor":
        return "text-red-700 bg-red-100";
      default:
        return "text-gray-700 bg-gray-100";
    }
  };

  const nutrientData = selectedReport
    ? [
        {
          name: "Nitrogen",
          value: selectedReport.nitrogen || 0,
          unit: "mg/kg",
          icon: <Leaf className="h-4 w-4 text-green-600" />,
        },
        {
          name: "Phosphorus",
          value: selectedReport.phosphorus || 0,
          unit: "mg/kg",
          icon: <Zap className="h-4 w-4 text-yellow-600" />,
        },
        {
          name: "Potassium",
          value: selectedReport.potassium || 0,
          unit: "mg/kg",
          icon: <Mountain className="h-4 w-4 text-purple-600" />,
        },
        {
          name: "Calcium",
          value: selectedReport.calcium || 0,
          unit: "mg/kg",
          icon: <Droplets className="h-4 w-4 text-blue-600" />,
        },
        {
          name: "Magnesium",
          value: selectedReport.magnesium || 0,
          unit: "mg/kg",
          icon: <Sparkles className="h-4 w-4 text-pink-600" />,
        },
        {
          name: "Organic Matter",
          value: selectedReport.organic_matter || 0,
          unit: "%",
          icon: <Atom className="h-4 w-4 text-amber-600" />,
        },
      ]
    : [];

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
                                    report.created_at
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
            // Report Detail View
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
                    {new Date(selectedReport.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Report Summary Cards */}
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="border-amber-200 bg-white shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-green-50 to-amber-50 border-b border-amber-200">
                    <CardTitle className="flex items-center gap-2 text-green-800">
                      <TrendingUp className="h-5 w-5" />
                      Soil Health Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div>
                        <Label className="text-green-700">
                          Fertility Status
                        </Label>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                              selectedReport.fertility_prediction
                            )}`}
                          >
                            {selectedReport.fertility_prediction}
                          </span>
                          <span className="text-sm text-gray-600">
                            (
                            {(
                              (selectedReport.fertility_confidence || 0) * 100
                            ).toFixed(1)}
                            % confidence)
                          </span>
                        </div>
                      </div>
                      <div>
                        <Label className="text-green-700">
                          Soil Properties
                        </Label>
                        <div className="grid grid-cols-2 gap-2 mt-1 text-sm">
                          <div>
                            Texture:{" "}
                            {selectedReport.simplified_texture || "Unknown"}
                          </div>
                          <div>
                            pH: {selectedReport.soil_ph?.toFixed(1) || "N/A"}
                          </div>
                        </div>
                      </div>
                      <div>
                        <Label className="text-green-700">Location</Label>
                        <div className="text-sm mt-1">
                          {selectedReport.location_name || "Unknown Location"}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-amber-200 bg-white shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-green-50 to-amber-50 border-b border-amber-200">
                    <CardTitle className="flex items-center gap-2 text-green-800">
                      <Beaker className="h-5 w-5" />
                      Fertilizer Recommendation
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div>
                        <Label className="text-green-700">
                          Recommended Fertilizer
                        </Label>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-lg font-semibold text-green-800">
                            {selectedReport.fertilizer_recommendation}
                          </span>
                          <span className="text-sm text-gray-600">
                            (
                            {(
                              (selectedReport.fertilizer_confidence || 0) * 100
                            ).toFixed(1)}
                            % confidence)
                          </span>
                        </div>
                      </div>
                      {selectedReport.structured_response
                        ?.fertilizer_justification && (
                        <div>
                          <Label className="text-green-700">
                            Justification
                          </Label>
                          <p className="text-sm text-gray-700 mt-1 leading-relaxed">
                            {
                              selectedReport.structured_response
                                .fertilizer_justification
                            }
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Nutrient Analysis */}
              <Card className="border-amber-200 bg-white shadow-lg">
                <CardHeader className="bg-gradient-to-r from-green-50 to-amber-50 border-b border-amber-200">
                  <CardTitle className="flex items-center gap-2 text-green-800">
                    <TrendingUp className="h-5 w-5" />
                    Nutrient Levels
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {nutrientData.map((nutrient) => (
                      <div
                        key={nutrient.name}
                        className="bg-gradient-to-r from-amber-50 to-green-50 p-4 rounded-lg border border-amber-200"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          {nutrient.icon}
                          <span className="font-medium text-green-800">
                            {nutrient.name}
                          </span>
                        </div>
                        <div className="text-lg font-semibold text-green-900">
                          {nutrient.value.toFixed(1)} {nutrient.unit}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Comprehensive Analysis */}
              {selectedReport.structured_response && (
                <Card className="border-amber-200 bg-white shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-green-50 to-amber-50 border-b border-amber-200">
                    <CardTitle className="flex items-center gap-2 text-green-800">
                      <FileText className="h-5 w-5" />
                      Comprehensive Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    {/* Summary */}
                    <div className="bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-lg border border-blue-200">
                      <h4 className="text-blue-900 font-semibold mb-2 flex items-center gap-2">
                        <Beaker className="h-4 w-4" />
                        Executive Summary
                      </h4>
                      <p className="text-blue-800 text-sm leading-relaxed">
                        {selectedReport.structured_response.explanation.summary}
                      </p>
                    </div>

                    {/* Detailed Analysis Sections */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                          <h5 className="font-medium text-amber-900 mb-2">
                            Fertility Analysis
                          </h5>
                          <p className="text-sm text-amber-800 leading-relaxed">
                            {
                              selectedReport.structured_response.explanation
                                .fertility_analysis
                            }
                          </p>
                        </div>

                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                          <h5 className="font-medium text-green-900 mb-2">
                            pH Analysis
                          </h5>
                          <p className="text-sm text-green-800 leading-relaxed">
                            {
                              selectedReport.structured_response.explanation
                                .ph_analysis
                            }
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                          <h5 className="font-medium text-purple-900 mb-2">
                            Nutrient Analysis
                          </h5>
                          <p className="text-sm text-purple-800 leading-relaxed">
                            {
                              selectedReport.structured_response.explanation
                                .nutrient_analysis
                            }
                          </p>
                        </div>

                        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                          <h5 className="font-medium text-yellow-900 mb-2">
                            Soil Texture Analysis
                          </h5>
                          <p className="text-sm text-yellow-800 leading-relaxed">
                            {
                              selectedReport.structured_response.explanation
                                .soil_texture_analysis
                            }
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Overall Assessment */}
                    <div className="bg-gradient-to-r from-slate-50 to-gray-50 p-4 rounded-lg border border-slate-200">
                      <h4 className="text-slate-900 font-semibold mb-2 flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Overall Assessment
                      </h4>
                      <p className="text-slate-800 text-sm leading-relaxed">
                        {
                          selectedReport.structured_response.explanation
                            .overall_assessment
                        }
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Action Plan & Recommendations */}
              {selectedReport.structured_response && (
                <Card className="border-amber-200 bg-white shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-green-50 to-amber-50 border-b border-amber-200">
                    <CardTitle className="flex items-center gap-2 text-green-800">
                      <CheckCircle className="h-5 w-5" />
                      Action Plan & Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    {/* Categorized Recommendations */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-green-800 text-lg">
                        Prioritized Action Items:
                      </h4>

                      {/* Group recommendations by priority */}
                      {["high", "medium", "low"].map((priority) => {
                        const priorityRecs =
                          selectedReport.structured_response!.recommendations.filter(
                            (rec) => rec.priority.toLowerCase() === priority
                          );

                        if (priorityRecs.length === 0) return null;

                        const priorityStyle = getPriorityStyle(priority);

                        return (
                          <div key={priority} className="space-y-3">
                            <h5
                              className={`font-medium text-lg ${priorityStyle.color} flex items-center gap-2 capitalize`}
                            >
                              {priorityStyle.icon}
                              {priority} Priority Actions
                            </h5>

                            <div className="grid gap-3">
                              {priorityRecs.map((rec, index) => {
                                const timeframeStyle = getTimeframeStyle(
                                  rec.timeframe
                                );

                                return (
                                  <div
                                    key={`${priority}-${index}`}
                                    className={`p-4 rounded-lg border ${priorityStyle.bg} ${priorityStyle.border} shadow-sm`}
                                  >
                                    <div className="flex items-start justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <span
                                          className={`text-xs font-medium px-2 py-1 rounded-full ${priorityStyle.bg} ${priorityStyle.color} border`}
                                        >
                                          {rec.category
                                            .replace("_", " ")
                                            .toUpperCase()}
                                        </span>
                                      </div>
                                      <div
                                        className={`flex items-center gap-1 text-xs ${timeframeStyle.color}`}
                                      >
                                        {timeframeStyle.icon}
                                        <span className="capitalize">
                                          {rec.timeframe.replace("_", " ")}
                                        </span>
                                      </div>
                                    </div>

                                    <h6
                                      className={`font-medium ${priorityStyle.color} mb-2`}
                                    >
                                      {rec.action}
                                    </h6>

                                    <p className="text-sm text-gray-700 leading-relaxed">
                                      {rec.reasoning}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Confidence Assessment */}
                    <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-4 rounded-lg border border-indigo-200">
                      <h4 className="text-indigo-900 font-semibold mb-2 flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        Confidence Assessment
                      </h4>
                      <p className="text-indigo-800 text-sm leading-relaxed">
                        {
                          selectedReport.structured_response
                            .confidence_assessment
                        }
                      </p>
                    </div>

                    {/* Long-term Strategy */}
                    <div className="bg-gradient-to-r from-violet-50 to-purple-50 p-4 rounded-lg border border-violet-200">
                      <h4 className="text-violet-900 font-semibold mb-2 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Long-term Soil Health Strategy
                      </h4>
                      <p className="text-violet-800 text-sm leading-relaxed">
                        {selectedReport.structured_response.long_term_strategy}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Nearby Agrovets */}
              {selectedReport.agrovets &&
                selectedReport.agrovets.length > 0 && (
                  <Card className="border-amber-200 bg-white shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-green-50 to-amber-50 border-b border-amber-200">
                      <CardTitle className="flex items-center gap-2 text-green-800">
                        <MapPin className="h-5 w-5" />
                        Nearby Agrovets ({selectedReport.agrovets.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {selectedReport.agrovets.map((agrovet, index) => (
                          <div
                            key={index}
                            className="bg-gradient-to-r from-green-50 to-amber-50 p-4 rounded-lg border border-green-200"
                          >
                            <div className="mb-3">
                              <h5 className="font-semibold text-green-800 mb-1">
                                {agrovet.name.trim()}
                              </h5>
                              <p className="text-sm text-gray-600">
                                {agrovet.distance_km.toFixed(1)} km away
                              </p>
                            </div>

                            <div className="space-y-2">
                              <div>
                                <Label className="text-xs font-medium text-green-700">
                                  Available Products:
                                </Label>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {agrovet.products.map((product, idx) => (
                                    <span
                                      key={idx}
                                      className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full"
                                    >
                                      {product}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              {agrovet.prices && agrovet.prices.length > 0 && (
                                <div>
                                  <Label className="text-xs font-medium text-green-700">
                                    Prices (KES):
                                  </Label>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {agrovet.prices.map((price, idx) => (
                                      <span
                                        key={idx}
                                        className="px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded-full"
                                      >
                                        {price.toFixed(0)}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {agrovet.rating && (
                                <div className="flex items-center gap-1">
                                  <Label className="text-xs font-medium text-green-700">
                                    Rating:
                                  </Label>
                                  <span className="text-sm text-yellow-600">
                                    {"★".repeat(Math.floor(agrovet.rating))}
                                    {agrovet.rating % 1 !== 0 && "☆"}
                                    <span className="ml-1 text-gray-600">
                                      ({agrovet.rating.toFixed(1)})
                                    </span>
                                  </span>
                                </div>
                              )}

                              {agrovet.phone && (
                                <div>
                                  <Label className="text-xs font-medium text-green-700">
                                    Phone:
                                  </Label>
                                  <p className="text-sm text-gray-700">
                                    {agrovet.phone}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
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
