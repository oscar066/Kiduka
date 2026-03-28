"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  Leaf,
  Zap,
  Mountain,
  Droplets,
  Sparkles,
  Atom,
} from "lucide-react";
import { SoilInput, PredictionResponse } from "@/types/soil-analysis";
import { getNutrientStatusColor, getNutrientProgressColor, getNutrientStatusText } from "@/lib/soil-health-utils";

interface NutrientDisplayProps {
  soilInput: SoilInput;
  results?: PredictionResponse | null;
  title?: string;
  showOptimalRanges?: boolean;
}

interface NutrientGaugeItemProps {
  name: string;
  value: number;
  unit: string;
  optimal: { min: number; max: number };
  icon: React.ReactNode;
  scoreData?: { score: number; label: string };
  confidenceData?: { within_one_accuracy: string; r2: number; flag_low: boolean; };
  isML?: boolean;
  isMeasured?: boolean;
}

function NutrientGaugeItem({
  name,
  value,
  unit,
  optimal,
  icon,
  scoreData,
  confidenceData,
  isML = false,
  isMeasured = false,
}: NutrientGaugeItemProps) {
  // Calculate percentage for progress bar (normalize to 0-100 range)
  // For ML, map score 1-4 to 25-100%
  const percentage = isML && !isMeasured && scoreData 
    ? (scoreData.score / 4) * 100 
    : Math.min((value / optimal.max) * 100, 100);

  // Determine status based on optimal range or ML label
  const status = (isML && !isMeasured && scoreData)
    ? scoreData.label.toLowerCase()
    : value < optimal.min ? "low" : value > optimal.max ? "high" : "optimal";
        
  const isMLEstimate = Boolean(isML && !isMeasured && scoreData);
  const mlLabel = scoreData?.label;

  return (
    <div className="bg-white rounded-lg border border-amber-200 p-4 shadow-sm hover:shadow-md transition-shadow relative">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon}
          <div>
            <h3 className="font-medium text-gray-900 leading-tight">{name}</h3>
            {isML && (
              <Badge 
                variant={isMeasured ? "secondary" : "outline"} 
                className={cn(
                  "mt-1 text-[10px] px-1.5 py-0 h-4",
                  isMeasured 
                    ? "bg-green-50 text-green-700 border-green-100" 
                    : "bg-amber-50 text-amber-700 border-amber-100"
                )}
              >
                {isMeasured ? "Measured" : "Estimated"}
              </Badge>
            )}
          </div>
        </div>
        <span className="text-sm font-mono text-gray-600">
          {(isML && !isMeasured) ? "" : `${value.toFixed(1)} ${unit}`}
        </span>
      </div>

      <div className="space-y-2">
        <Progress
          value={percentage}
          className={`h-3 bg-gray-200 ${getNutrientProgressColor(isMLEstimate, status, mlLabel)}`}
        />
        <div className="flex justify-between text-xs text-gray-500">
          {(!isML || isMeasured) ? (
            <span className="font-medium">
              {optimal.min} {unit}
            </span>
          ) : (
            <span></span>
          )}
          <span className={`font-semibold ${getNutrientStatusColor(isMLEstimate, status, mlLabel)}`}>
            {getNutrientStatusText(isMLEstimate, status, mlLabel)}
          </span>
          {(!isML || isMeasured) ? (
            <span className="font-medium">
              {optimal.max} {unit}
            </span>
          ) : (
             <span></span>
          )}
        </div>
      </div>
    </div>
  );
}

export function NutrientDisplay({
  soilInput,
  results,
  title = "Nutrient Analysis",
  showOptimalRanges = false,
}: NutrientDisplayProps) {
  
  const isML = results?.prediction_mode === "ML";
  const scores = results?.nutrients || {};
  const confidenceNutrients = results?.confidence?.nutrients || [];
  const isHybrid = results?.mentions?.some(m => m.toLowerCase().includes("hybrid"));

  const getTitle = () => {
    if (isHybrid) return "Hybrid Soil Analysis";
    if (isML) return "Estimated Nutrient Analysis";
    return title;
  };

  const nutrientData = [
    {
      id: "N",
      name: "Nitrogen (N)",
      value: soilInput.n || 0,
      unit: "%",
      optimal: { min: 0.10, max: 0.30 },
      icon: <Leaf className="h-4 w-4 text-green-600" />,
    },
    {
      id: "P",
      name: "Phosphorus (P)",
      value: soilInput.p || 0,
      unit: "ppm",
      optimal: { min: 10, max: 50 },
      icon: <Zap className="h-4 w-4 text-yellow-600" />,
    },
    {
      id: "K",
      name: "Potassium (K)",
      value: soilInput.k || 0,
      unit: "ppm",
      optimal: { min: 80, max: 200 },
      icon: <Mountain className="h-4 w-4 text-purple-600" />,
    },
    {
      id: "Ca",
      name: "Calcium (Ca)",
      value: soilInput.ca || 0,
      unit: "ppm",
      optimal: { min: 331, max: 2500 },
      icon: <Droplets className="h-4 w-4 text-blue-600" />,
    },
    {
      id: "Mg",
      name: "Magnesium (Mg)",
      value: soilInput.mg || 0,
      unit: "ppm",
      optimal: { min: 50, max: 350 },
      icon: <Sparkles className="h-4 w-4 text-pink-600" />,
    },
    {
      id: "OC",
      name: "Organic Carbon",
      value: soilInput.organic_carbon || 0,
      unit: "%",
      optimal: { min: 1.0, max: 3.0 },
      icon: <Atom className="h-4 w-4 text-amber-600" />,
    },
  ];

  return (
    <Card className="border-amber-200 bg-white shadow-lg">
      <CardHeader className="bg-gradient-to-r from-green-50 to-amber-50 border-b border-amber-200">
        <CardTitle className="flex items-center gap-2 text-green-800">
          <TrendingUp className="h-5 w-5" />
          {getTitle()}
        </CardTitle>
        <p className="text-sm text-green-600 mt-1">
          {isHybrid 
            ? "Results combine your measured inputs with ML-predicted estimates for missing values."
            : isML 
              ? "Machine learning estimates based on satellite data and local terrain"
              : "Visual analysis of soil nutrient levels with optimal ranges"}
        </p>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {nutrientData.map((nutrient) => {
            // Special mapping for OC vs organic_carbon in soilInput
            const inputKey = nutrient.id === "OC" ? "organic_carbon" : nutrient.id.toLowerCase();
            const isMeasured = !!soilInput[inputKey as keyof SoilInput] && soilInput[inputKey as keyof SoilInput]! > 0;
            const confData = confidenceNutrients.find((n: any) => n.nutrient === nutrient.id);
            
            return (
              <NutrientGaugeItem
                key={nutrient.name}
                name={nutrient.name}
                value={nutrient.value}
                unit={nutrient.unit}
                optimal={nutrient.optimal}
                icon={nutrient.icon}
                isML={isML}
                isMeasured={isMeasured}
                scoreData={scores[nutrient.id]}
                confidenceData={confData}
              />
            );
          })}
        </div>

        {showOptimalRanges && (!isML || isHybrid) && (
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

        {(isML || isHybrid) && (
           <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
             <p className="text-xs text-amber-800 italic">
               Note: {isHybrid ? "Estimated" : "These"} values are predictions generated by our Machine Learning models using satellite data from Google Earth Engine. {isHybrid && "Your measured inputs are prioritized."}
             </p>
           </div>
        )}
      </CardContent>
    </Card>
  );
}