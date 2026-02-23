// components/soil-analysis/StatusSummaryCards.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Activity,
  Leaf,
  Calendar,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import { PredictionResponse, SoilInput } from "@/types/soil-analysis";

interface StatusSummaryCardsProps {
  results: PredictionResponse;
  soilInput: SoilInput;
}

export function StatusSummaryCards({ results, soilInput }: StatusSummaryCardsProps) {
  // Helper functions for soil health status
  const getStatusIcon = () => {
    const status = results.soil_fertility_status?.toLowerCase() || "";
    switch (status) {
      case "healthy":
        return <CheckCircle className="h-6 w-6 text-green-600" />;
      case "moderately healthy":
        return <AlertTriangle className="h-6 w-6 text-yellow-600" />;
      case "poor":
        return <XCircle className="h-6 w-6 text-orange-600" />;
      case "very poor":
        return <XCircle className="h-6 w-6 text-red-600" />;
      default:
        return <AlertTriangle className="h-6 w-6 text-gray-600" />;
    }
  };

  const getStatusColor = () => {
    const status = results.soil_fertility_status?.toLowerCase() || "";
    switch (status) {
      case "healthy":
        return "bg-green-100 text-green-800 border-green-200";
      case "moderately healthy":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "poor":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "very poor":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getSHIColor = () => {
    const shi = results.soil_health_index;
    if (shi >= 3.5) return "text-green-600";
    if (shi >= 2.5) return "text-yellow-600";
    if (shi >= 1.5) return "text-orange-600";
    return "text-red-600";
  };

  const getPhStatus = () => {
    const ph = soilInput.ph || 0;
    if (ph < 6.0) return { text: "Acidic", color: "text-orange-600" };
    if (ph > 7.5) return { text: "Alkaline", color: "text-blue-600" };
    return { text: "Neutral", color: "text-green-600" };
  };

  const phStatus = getPhStatus();
  // Normalize SHI to percentage (max is 4.0)
  const shiPercentage = Math.min((results.soil_health_index / 4.0) * 100, 100);
  const wasDowngraded = results.initial_soil_fertility_status !== results.soil_fertility_status;

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Soil Health Index Card */}
      <Card className="bg-gradient-to-br from-green-50 to-amber-50 border-amber-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-green-800">
            {getStatusIcon()}
            Soil Health Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* SHI Score */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              Soil Health Index (SHI):
            </span>
            <span className={`text-2xl font-bold ${getSHIColor()}`}>
              {results.soil_health_index.toFixed(2)}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-700">Health Score</span>
              <span className="font-medium">
                {Math.round(shiPercentage)}%
              </span>
            </div>
            <Progress value={shiPercentage} className="h-3" />
          </div>

          {/* Fertility Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              Final Status:
            </span>
            <Badge className={getStatusColor()}>
              {results.soil_fertility_status || "Unknown"}
            </Badge>
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
            <div className="space-y-1">
              <span className="text-xs text-gray-500 uppercase tracking-wide">
                Initial Class
              </span>
              <p className="font-medium text-gray-900">
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