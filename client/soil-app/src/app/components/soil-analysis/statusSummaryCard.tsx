// components/soil-analysis/StatusSummaryCards.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { TrendingUp, Beaker } from "lucide-react";
import { SoilData } from "@/types/soil-analysis";
import { getStatusColor } from "@/lib/soil-analysis-helper";

interface StatusSummaryCardsProps {
  soilData: SoilData;
}

export function StatusSummaryCards({ soilData }: StatusSummaryCardsProps) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Soil Health Status */}
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
              <Label className="text-green-700">Fertility Status</Label>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                    soilData.fertility_prediction
                  )}`}
                >
                  {soilData.fertility_prediction}
                </span>
                <span className="text-sm text-gray-600">
                  ({((soilData.fertility_confidence || 0) * 100).toFixed(1)}% confidence)
                </span>
              </div>
            </div>
            <div>
              <Label className="text-green-700">Soil Properties</Label>
              <div className="grid grid-cols-2 gap-2 mt-1 text-sm">
                <div>Texture: {soilData.simplified_texture || "Unknown"}</div>
                <div>pH: {soilData.soil_ph?.toFixed(1) || "N/A"}</div>
              </div>
            </div>
            <div>
              <Label className="text-green-700">Location</Label>
              <div className="text-sm mt-1">
                {soilData.location_name || "Unknown Location"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fertilizer Recommendation */}
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
              <Label className="text-green-700">Recommended Fertilizer</Label>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-lg font-semibold text-green-800">
                  {soilData.fertilizer_recommendation}
                </span>
                <span className="text-sm text-gray-600">
                  ({((soilData.fertilizer_confidence || 0) * 100).toFixed(1)}% confidence)
                </span>
              </div>
            </div>
            {soilData.structured_response?.fertilizer_justification && (
              <div>
                <Label className="text-green-700">Justification</Label>
                <p className="text-sm text-gray-700 mt-1 leading-relaxed">
                  {soilData.structured_response.fertilizer_justification}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}