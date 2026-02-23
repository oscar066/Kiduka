// components/soil-analysis/NutrientDisplay.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  Leaf,
  Zap,
  Mountain,
  Droplets,
  Sparkles,
  Atom,
} from "lucide-react";
import { SoilInput } from "@/types/soil-analysis";

interface NutrientDisplayProps {
  soilInput: SoilInput;
  title?: string;
  showOptimalRanges?: boolean;
}

interface NutrientGaugeItemProps {
  name: string;
  value: number;
  unit: string;
  optimal: { min: number; max: number };
  icon: React.ReactNode;
}

function NutrientGaugeItem({
  name,
  value,
  unit,
  optimal,
  icon,
}: NutrientGaugeItemProps) {
  // Calculate percentage for progress bar (normalize to 0-100 range)
  const percentage = Math.min((value / optimal.max) * 100, 100);

  // Determine status based on optimal range
  const status =
    value < optimal.min ? "low" : value > optimal.max ? "high" : "optimal";

  const getStatusColor = () => {
    switch (status) {
      case "low":
        return "text-red-600";
      case "high":
        return "text-blue-600";
      case "optimal":
        return "text-green-600";
      default:
        return "text-gray-600";
    }
  };

  const getProgressColor = () => {
    switch (status) {
      case "low":
        return "[&>div]:bg-red-500";
      case "high":
        return "[&>div]:bg-blue-500";
      case "optimal":
        return "[&>div]:bg-green-500";
      default:
        return "[&>div]:bg-gray-500";
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "low":
        return "Below Optimal";
      case "high":
        return "High / Excess";
      case "optimal":
        return "Optimal Range";
      default:
        return "Unknown";
    }
  };

  return (
    <div className="bg-white rounded-lg border border-amber-200 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-medium text-gray-900">{name}</h3>
        </div>
        <span className="text-sm font-mono text-gray-600">
          {value.toFixed(1)} {unit}
        </span>
      </div>

      <div className="space-y-2">
        <Progress
          value={percentage}
          className={`h-3 bg-gray-200 ${getProgressColor()}`}
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span className="font-medium">
            {optimal.min} {unit}
          </span>
          <span className={`font-semibold ${getStatusColor()}`}>
            {getStatusText()}
          </span>
          <span className="font-medium">
            {optimal.max} {unit}
          </span>
        </div>
      </div>
    </div>
  );
}

export function NutrientDisplay({
  soilInput,
  title = "Nutrient Analysis",
  showOptimalRanges = false,
}: NutrientDisplayProps) {
  
  const nutrientData = [
    {
      name: "Nitrogen (N)",
      value: soilInput.n || 0,
      unit: "%",
      optimal: { min: 0.15, max: 0.30 },
      icon: <Leaf className="h-4 w-4 text-green-600" />,
    },
    {
      name: "Phosphorus (P)",
      value: soilInput.p || 0,
      unit: "ppm",
      optimal: { min: 20, max: 50 },
      icon: <Zap className="h-4 w-4 text-yellow-600" />,
    },
    {
      name: "Potassium (K)",
      value: soilInput.k || 0,
      unit: "ppm",
      optimal: { min: 80, max: 200 },
      icon: <Mountain className="h-4 w-4 text-purple-600" />,
    },
    {
      name: "Calcium (Ca)",
      value: soilInput.ca || 0,
      unit: "ppm",
      optimal: { min: 1000, max: 2500 },
      icon: <Droplets className="h-4 w-4 text-blue-600" />,
    },
    {
      name: "Magnesium (Mg)",
      value: soilInput.mg || 0,
      unit: "ppm",
      optimal: { min: 150, max: 350 },
      icon: <Sparkles className="h-4 w-4 text-pink-600" />,
    },
    {
      name: "Organic Carbon",
      value: soilInput.organic_carbon || 0,
      unit: "%",
      optimal: { min: 2.0, max: 4.0 },
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
        <p className="text-sm text-green-600 mt-1">
          Visual analysis of soil nutrient levels with optimal ranges
        </p>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {nutrientData.map((nutrient) => (
            <NutrientGaugeItem
              key={nutrient.name}
              name={nutrient.name}
              value={nutrient.value}
              unit={nutrient.unit}
              optimal={nutrient.optimal}
              icon={nutrient.icon}
            />
          ))}
        </div>

        {showOptimalRanges && (
          <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-200">
            <h4 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Optimal Range Guide
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span className="text-red-700">
                  Below Optimal - Deficiency
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span className="text-green-700">
                  Optimal Range - Ideal for plant growth
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span className="text-blue-700">
                  Above Optimal - High reserves
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}