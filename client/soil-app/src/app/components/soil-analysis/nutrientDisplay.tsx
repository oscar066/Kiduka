// components/soil-analysis/NutrientDisplay.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TrendingUp,
  Leaf,
  Zap,
  Mountain,
  Droplets,
  Sparkles,
  Atom,
} from "lucide-react";
import { SoilData } from "@/types/soil-analysis";

interface NutrientDisplayProps {
  soilData: SoilData;
  title?: string;
  showOptimalRanges?: boolean;
}

export function NutrientDisplay({
  soilData,
  title = "Nutrient Levels",
  showOptimalRanges = false,
}: NutrientDisplayProps) {
  const nutrientData = [
    {
      name: "Nitrogen",
      value: soilData.nitrogen || 0,
      unit: "mg/kg",
      optimal: { min: 40, max: 60 },
      icon: <Leaf className="h-4 w-4 text-green-600" />,
    },
    {
      name: "Phosphorus",
      value: soilData.phosphorus || 0,
      unit: "mg/kg",
      optimal: { min: 30, max: 50 },
      icon: <Zap className="h-4 w-4 text-yellow-600" />,
    },
    {
      name: "Potassium",
      value: soilData.potassium || 0,
      unit: "mg/kg",
      optimal: { min: 150, max: 200 },
      icon: <Mountain className="h-4 w-4 text-purple-600" />,
    },
    {
      name: "Calcium",
      value: soilData.calcium || 0,
      unit: "mg/kg",
      optimal: { min: 1000, max: 1500 },
      icon: <Droplets className="h-4 w-4 text-blue-600" />,
    },
    {
      name: "Magnesium",
      value: soilData.magnesium || 0,
      unit: "mg/kg",
      optimal: { min: 200, max: 300 },
      icon: <Sparkles className="h-4 w-4 text-pink-600" />,
    },
    {
      name: "Organic Matter",
      value: soilData.organic_matter || 0,
      unit: "%",
      optimal: { min: 3, max: 5 },
      icon: <Atom className="h-4 w-4 text-amber-600" />,
    },
  ];

  return (
    <Card className="border-amber-200 bg-white shadow-lg">
      <CardHeader className="bg-gradient-to-r from-green-50 to-amber-50 border-b border-amber-200">
        <CardTitle className="flex items-center gap-2 text-green-800">
          <TrendingUp className="h-5 w-5" />
          {title}
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
              {showOptimalRanges && (
                <div className="text-xs text-gray-600 mt-1">
                  Optimal: {nutrient.optimal.min}-{nutrient.optimal.max}{" "}
                  {nutrient.unit}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
