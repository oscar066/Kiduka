"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  const phStatus = getPhStatus(phValue);
  const wasDowngraded = results.initial_soil_fertility_status !== results.soil_fertility_status;

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Soil Health Index Card */}
      <Card className="bg-gradient-to-br from-green-50 to-amber-50 border-amber-200">
        <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-green-800">
            {getStatusIcon(statusText)}
            Soil Health Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* SHI Score */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              Soil Health Index (SHI):
            </span>
            <span className={`text-2xl font-bold ${getSHIColor(shiScore)}`}>
              {shiScore.toFixed(2)}/4
            </span>
          </div>

          {/* Fertility Status & Mode */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                Final Status:
              </span>
              <Badge className={getStatusColor(statusText)}>
                {statusText || "Unknown"}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                Prediction Mode:
              </span>
              <div className="flex flex-col items-end gap-1">
                <Badge variant="outline" className={cn(
                  "border-green-200 text-green-700 bg-green-50",
                  results.mentions?.some(m => m.toLowerCase().includes("hybrid")) && "bg-amber-50 border-amber-200 text-amber-700"
                )}>
                  {results.mentions?.some(m => m.toLowerCase().includes("hybrid")) 
                    ? "Hybrid Analysis" 
                    : (results.prediction_mode === "ML" ? "Machine Learning" : "Standard Formula")}
                </Badge>
                {results.mentions?.some(m => m.toLowerCase().includes("hybrid")) && (
                  <span className="text-[10px] text-amber-600 font-medium italic">
                    User Input + AI Prediction
                  </span>
                )}
              </div>
            </div>
            
            {results.prediction_mode === "ML" && results.confidence && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  ML Confidence:
                </span>
                <Badge 
                  variant="outline" 
                  className={
                    results.confidence.confidence_level === "high" 
                      ? "border-green-200 text-green-700 bg-green-50"
                      : "border-yellow-200 text-yellow-700 bg-yellow-50"
                  }
                >
                  {results.confidence.confidence_level?.toUpperCase() || "MODERATE"}
                </Badge>
              </div>
            )}
          </div>

          {/* Show downgrade if applicable */}
          {wasDowngraded && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-amber-800 text-sm">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">Status Adjusted</span>
              </div>
              <p className="text-xs text-amber-700 mt-1">
                Initial classification was <strong>{results.initial_soil_fertility_status}</strong>,
                adjusted to <strong>{results.soil_fertility_status}</strong> based on override rules.
              </p>
            </div>
          )}

          {/* pH info */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="space-y-1">
              <span className="text-xs text-gray-500 uppercase tracking-wide">
                pH Level
              </span>
              <p className={`font-medium ${phStatus.color}`}>
                {soilInput.ph?.toFixed(1) || "N/A"} ({phStatus.text})
              </p>
            </div>
            <div className="space-y-1 text-right">
              <span className="text-xs text-gray-500 uppercase tracking-wide">
                Initial Class
              </span>
              <p className="font-medium text-gray-700">
                {results.initial_soil_fertility_status}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500 pt-2 border-t border-amber-200">
            <Calendar className="h-3 w-3" />
            <span>Analysis Date: {new Date(results.timestamp).toLocaleDateString()}</span>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations Card */}
      <Card className="bg-gradient-to-br from-blue-50 to-green-50 border-blue-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <Leaf className="h-5 w-5" />
            Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {results.recommendations.length > 0 ? (
            <div className="space-y-3">
              {results.recommendations.map((rec, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 bg-white bg-opacity-70 rounded-lg border border-green-200"
                >
                  <div className="mt-0.5 p-1 bg-green-100 rounded-full">
                    <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                  </div>
                  <p className="text-sm text-gray-800 leading-relaxed">{rec}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <Activity className="h-8 w-8 text-green-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">
                No specific recommendations — soil health is good!
              </p>
            </div>
          )}

          {/* Mentions / Triggered Rules */}
          {results.mentions && results.mentions.length > 0 && (
            <div className="mt-4 pt-4 border-t border-blue-200">
              <h4 className="text-xs font-semibold text-blue-800 uppercase tracking-wide mb-2 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Triggered Rules
              </h4>
              <div className="space-y-1">
                {results.mentions.map((mention, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 px-2 py-1.5 rounded"
                  >
                    <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                    <span>{mention}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}