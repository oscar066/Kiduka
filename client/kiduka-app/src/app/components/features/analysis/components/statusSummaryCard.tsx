"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  CheckCircle,
  AlertTriangle,
  Activity,
  Leaf,
  Calendar,
  AlertCircle,
  TrendingUp,
  MapPin,
} from "lucide-react";
import { PredictionResponse, SoilInput } from "@/types/soil-analysis";
import { getStatusIcon, getStatusColor, getSHIColor, getPhStatus } from "@/lib/soil-health-utils";

interface StatusSummaryCardsProps {
  results: PredictionResponse;
  soilInput: SoilInput;
}

export function StatusSummaryCards({ results, soilInput }: StatusSummaryCardsProps) {
  const statusText = results.soil_fertility_status || "";
  const shiScore = results.soil_health_index;
  const phValue = soilInput.ph || 0;
  const locationName = results.location_name || soilInput.location_name;

  const phStatus = getPhStatus(phValue);
  const wasDowngraded = results.initial_soil_fertility_status !== results.soil_fertility_status;

  return (
    <div className="grid md:grid-cols-2 gap-4">

      {/* Soil Health Overview */}
      <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-green-50 to-amber-50 border-b border-amber-200 py-3.5 px-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon(statusText)}
            <span className="text-sm font-serif font-semibold text-green-800">Soil Health Overview</span>
          </div>
          {locationName && (
            <Badge variant="outline" className="flex items-center gap-1 bg-green-50 border-green-200 text-green-700 text-xs">
              <MapPin className="h-3 w-3" />
              {locationName}
            </Badge>
          )}
        </div>

        <div className="p-5 space-y-4">
          {/* SHI Score */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">Soil Health Index (SHI)</span>
            <span className={`text-2xl font-bold tabular-nums ${getSHIColor(shiScore)}`}>
              {shiScore.toFixed(2)}<span className="text-sm font-normal text-gray-400">/4</span>
            </span>
          </div>

          {/* Fertility status & mode */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Final Status</span>
              <Badge className={getStatusColor(statusText)}>{statusText || "Unknown"}</Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Prediction Mode</span>
              <div className="flex flex-col items-end gap-1">
                <Badge variant="outline" className={cn(
                  "border-green-200 text-green-700 bg-green-50",
                  results.mentions?.some(m => m.toLowerCase().includes("hybrid")) && "bg-amber-50 border-amber-200 text-amber-700"
                )}>
                  {results.mentions?.some(m => m.toLowerCase().includes("hybrid"))
                    ? "Hybrid Analysis"
                    : results.prediction_mode === "ML" ? "Machine Learning" : "Standard Formula"}
                </Badge>
                {results.mentions?.some(m => m.toLowerCase().includes("hybrid")) && (
                  <span className="text-[10px] text-amber-600 font-medium italic">User Input + AI Prediction</span>
                )}
              </div>
            </div>

            {results.prediction_mode === "ML" && results.confidence && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">ML Confidence</span>
                <Badge
                  variant="outline"
                  className={
                    results.confidence.confidence_level === "high"
                      ? "border-green-200 text-green-700 bg-green-50"
                      : "border-amber-200 text-amber-700 bg-amber-50"
                  }
                >
                  {results.confidence.confidence_level?.toUpperCase() || "MODERATE"}
                </Badge>
              </div>
            )}
          </div>

          {wasDowngraded && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-amber-800 text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span className="font-medium">Status Adjusted</span>
              </div>
              <p className="text-xs text-amber-700 mt-1">
                Initial classification was <strong>{results.initial_soil_fertility_status}</strong>,
                adjusted to <strong>{results.soil_fertility_status}</strong> based on override rules.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 pt-1 border-t border-amber-100">
            <div className="space-y-0.5">
              <span className="text-xs text-gray-400 uppercase tracking-wide">pH Level</span>
              <p className={`text-sm font-medium ${phStatus.color}`}>
                {soilInput.ph?.toFixed(1) || "N/A"} <span className="text-gray-500">({phStatus.text})</span>
              </p>
            </div>
            <div className="space-y-0.5 text-right">
              <span className="text-xs text-gray-400 uppercase tracking-wide">Initial Class</span>
              <p className="text-sm font-medium text-green-900">{results.initial_soil_fertility_status}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-gray-400 pt-1 border-t border-amber-100">
            <Calendar className="h-3 w-3" />
            <span>Analysed {new Date(results.timestamp).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-green-50 to-amber-50 border-b border-amber-200 py-3.5 px-5">
          <div className="flex items-center gap-2">
            <Leaf className="h-4 w-4 text-green-600" />
            <span className="text-sm font-serif font-semibold text-green-800">Recommendations</span>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {results.recommendations.length > 0 ? (
            <div className="space-y-2.5">
              {results.recommendations.map((rec, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 bg-green-50/50 rounded-lg border border-green-100"
                >
                  <div className="mt-0.5 p-1 bg-green-100 rounded-full shrink-0">
                    <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{rec}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-5">
              <Activity className="h-7 w-7 text-green-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No specific recommendations — soil health is good!</p>
            </div>
          )}

          {results.mentions && results.mentions.length > 0 && (
            <div className="pt-3 border-t border-amber-100">
              <h4 className="text-xs font-semibold text-green-800 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <TrendingUp className="h-3 w-3" />
                Triggered Rules
              </h4>
              <div className="space-y-1.5">
                {results.mentions.map((mention, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 px-2.5 py-1.5 rounded-lg"
                  >
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    <span>{mention}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
