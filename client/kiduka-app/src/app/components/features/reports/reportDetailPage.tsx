"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

import UnifiedSidebar from "../../layout/UnifiedSidebar";
import { Navbar } from "../../layout/navbar";
import { SessionGuard } from "../../shared/SessionGuard";
import { apiClient } from "@/lib/api-client";

import { NutrientDisplay } from "../analysis/components/nutrientDisplay";
import { AgrovetsDisplay } from "../analysis/components/agrovetDisplay";
import { StatusSummaryCards } from "../analysis/components/statusSummaryCard";

import {
  ArrowLeft,
  Trash2,
  AlertCircle,
  Calendar,
  MapPin,
} from "lucide-react";

import { PredictionHistory } from "@/types/soil-analysis";
import { getStatusColor } from "@/lib/soil-analysis-helper";

interface Props {
  reportId: string;
}

export default function ReportDetailPage({ reportId }: Props) {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [report, setReport] = useState<PredictionHistory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "authenticated") {
      fetchReport();
    }
  }, [status, reportId]);

  const fetchReport = async () => {
    if (!session?.accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.getPrediction(reportId, session.accessToken);
      setReport(data);
    } catch (err) {
      console.error("Error fetching report:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load report"
      );
      if (err instanceof Error && err.message.includes("Authentication")) {
        setTimeout(() => signOut({ callbackUrl: "/auth/login" }), 2000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!session?.accessToken || !report) return;
    if (!confirm("Are you sure you want to delete this report?")) return;
    try {
      await apiClient.deletePredictionHistory(report.id, session.accessToken);
      router.push("/reports");
    } catch (err) {
      setError("Failed to delete report");
    }
  };

  // Map PredictionHistory → shape expected by shared components
  const soilInput = report
    ? {
        ph: report.soil_ph || 0,
        n: report.nitrogen || 0,
        p: report.phosphorus || 0,
        k: report.potassium || 0,
        organic_carbon: report.organic_carbon || 0,
        ca: report.calcium || 0,
        mg: report.magnesium || 0,
        latitude: report.location_lat || 0,
        longitude: report.location_lng || 0,
      }
    : null;

  const results = report
    ? {
        ...report,
        timestamp: report.created_at,
        nearest_agrovets: report.agrovets,
        prediction_mode: report.prediction_mode,
        nutrients: report.nutrients,
      }
    : null;

  return (
    <SessionGuard message="You need to be logged in to view this report.">
      <SidebarProvider>
        <UnifiedSidebar />
        <SidebarInset>
          <Navbar />

          <main className="flex-1 space-y-6 p-6 bg-gradient-to-br from-green-25 via-amber-25 to-green-25 min-h-screen">
            {/* Page header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => router.push("/reports")}
                  className="border-green-200 text-green-700 hover:bg-green-50 shrink-0"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Reports
                </Button>

                <div>
                  <h1 className="text-3xl font-serif font-bold text-green-800">
                    Report Details
                  </h1>
                  {report && (
                    <p className="text-green-600 font-serif text-sm">
                      {new Date(report.created_at || "").toLocaleDateString(
                        "en-US",
                        { year: "numeric", month: "long", day: "numeric" }
                      )}
                    </p>
                  )}
                </div>
              </div>

              {/* Quick meta badges & Delete Action */}
              {report && (
                <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                   <div className="flex items-center gap-2">
                    <Badge
                      className={`text-xs font-semibold px-3 py-1 rounded-full border-0 ${getStatusColor(
                        report.soil_fertility_status
                      )}`}
                    >
                      {report.soil_fertility_status || "Unknown"}
                    </Badge>
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <MapPin className="h-3 w-3 text-red-400" />
                      {report.location_name || "Unknown Location"}
                    </span>
                  </div>
                  
                  <div className="h-4 w-px bg-amber-200 hidden sm:block" />
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDelete}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors h-8 px-2"
                  >
                    <Trash2 className="h-4 w-4 mr-1.5" />
                    Delete Report
                  </Button>
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span className="text-sm font-medium">{error}</span>
              </div>
            )}

            {/* Loading skeleton */}
            {isLoading && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <Skeleton className="h-28 rounded-xl" />
                  <Skeleton className="h-28 rounded-xl" />
                  <Skeleton className="h-28 rounded-xl" />
                  <Skeleton className="h-28 rounded-xl" />
                </div>
                <Skeleton className="h-80 w-full rounded-xl" />
                <Skeleton className="h-64 w-full rounded-xl" />
              </div>
            )}

            {/* Report content — Identical to analysis results dashboard */}
            {!isLoading && report && soilInput && results && (
              <div className="space-y-6 animate-in fade-in duration-500">
                {/* Results Section */}
                <StatusSummaryCards results={results} soilInput={soilInput} />

                <NutrientDisplay
                  soilInput={soilInput}
                  results={results}
                  showOptimalRanges={true}
                />

                {report.agrovets && report.agrovets.length > 0 && (
                  <AgrovetsDisplay agrovets={report.agrovets} />
                )}
              </div>
            )}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </SessionGuard>
  );
}
