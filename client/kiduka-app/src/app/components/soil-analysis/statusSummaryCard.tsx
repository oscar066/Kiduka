// components/soil-analysis/StatusSummaryCards.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Sprout,
  Target,
  Calendar,
  MapPin,
} from "lucide-react";
import { SoilData } from "@/types/soil-analysis";

interface StatusSummaryCardsProps {
  soilData: SoilData;
}

export function StatusSummaryCards({ soilData }: StatusSummaryCardsProps) {
  // Helper functions for soil health status
  const getStatusIcon = () => {
    const status = soilData.fertility_prediction?.toLowerCase() || "";
    switch (status) {
      case "healthy":
        return <CheckCircle className="h-6 w-6 text-green-600" />;
      case "moderately healthy":
        return <AlertTriangle className="h-6 w-6 text-yellow-600" />;
      case "poor":
        return <XCircle className="h-6 w-6 text-red-600" />;
      default:
        return <AlertTriangle className="h-6 w-6 text-gray-600" />;
    }
  };

  const getStatusColor = () => {
    const status = soilData.fertility_prediction?.toLowerCase() || "";
    switch (status) {
      case "healthy":
        return "bg-green-100 text-green-800 border-green-200";
      case "moderately healthy":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "poor":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getPhStatus = () => {
    const ph = soilData.soil_ph || 0;
    if (ph < 6.0) return { text: "Acidic", color: "text-orange-600" };
    if (ph > 7.5) return { text: "Alkaline", color: "text-blue-600" };
    return { text: "Neutral", color: "text-green-600" };
  };

  const phStatus = getPhStatus();
  const fertilityConfidence = (soilData.fertility_confidence || 0) * 100;
  const fertilizerConfidence = (soilData.fertilizer_confidence || 0) * 100;

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Soil Health Status Card */}
      <Card className="bg-gradient-to-br from-green-50 to-amber-50 border-amber-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-green-800">
            {getStatusIcon()}
            Soil Health Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              Overall Status:
            </span>
            <Badge className={getStatusColor()}>
              {soilData.fertility_prediction || "Unknown"}
            </Badge>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-700">Confidence Level</span>
              <span className="font-medium">
                {Math.round(fertilityConfidence)}%
              </span>
            </div>
            <Progress value={fertilityConfidence} className="h-3" />
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="space-y-1">
              <span className="text-xs text-gray-500 uppercase tracking-wide">
                Texture
              </span>
              <p className="font-medium text-gray-900">
                {soilData.simplified_texture || "Unknown"}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-gray-500 uppercase tracking-wide">
                pH Level
              </span>
              <p className={`font-medium ${phStatus.color}`}>
                {soilData.soil_ph?.toFixed(1) || "N/A"} ({phStatus.text})
              </p>
            </div>
          </div>

          {/* Location info if available */}
          {soilData.location_name && (
            <div className="flex items-center gap-2 text-xs text-gray-500 pt-2 border-t border-amber-200">
              <MapPin className="h-3 w-3" />
              <span>{soilData.location_name}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fertilizer Recommendation Card */}
      <Card className="bg-gradient-to-br from-blue-50 to-green-50 border-blue-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <Sprout className="h-5 w-5" />
            Fertilizer Recommendation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center">
            <div className="text-center space-y-2">
              <Badge className="bg-blue-600 text-white text-lg px-4 py-2">
                {soilData.fertilizer_recommendation || "Not Available"}
              </Badge>
              <p className="text-sm text-gray-600">Recommended Fertilizer</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1">
                <Target className="h-4 w-4 text-blue-600" />
                <span className="text-gray-700">Recommendation Confidence</span>
              </div>
              <span className="font-medium">
                {Math.round(fertilizerConfidence)}%
              </span>
            </div>
            <Progress value={fertilizerConfidence} className="h-3" />
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500 pt-2">
            <Calendar className="h-3 w-3" />
            <span>Analysis Date: {new Date().toLocaleDateString()}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}