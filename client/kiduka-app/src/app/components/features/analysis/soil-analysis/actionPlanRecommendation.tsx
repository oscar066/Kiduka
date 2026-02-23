// components/soil-analysis/ActionPlanRecommendations.tsx
// Now displays simple recommendations list from the classifier
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CheckCircle,
  Leaf,
  ArrowRight,
} from "lucide-react";

interface ActionPlanRecommendationsProps {
  recommendations: string[];
}

export function ActionPlanRecommendations({
  recommendations,
}: ActionPlanRecommendationsProps) {
  if (!recommendations || recommendations.length === 0) return null;

  return (
    <Card className="border-amber-200 bg-white shadow-lg">
      <CardHeader className="bg-gradient-to-r from-green-50 to-amber-50 border-b border-amber-200">
        <CardTitle className="flex items-center gap-2 text-green-800">
          <Leaf className="h-5 w-5" />
          Action Plan
        </CardTitle>
        <p className="text-green-600 text-sm mt-1">
          Recommended actions based on your soil analysis results
        </p>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-3">
          {recommendations.map((rec, index) => (
            <div
              key={index}
              className="group hover:shadow-md transition-all duration-200 p-4 rounded-lg border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 p-1.5 bg-green-100 rounded-lg shadow-sm group-hover:bg-green-200 transition-colors">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">
                      Action {index + 1}
                    </span>
                  </div>
                  <p className="text-sm text-gray-800 leading-relaxed font-medium">
                    {rec}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-green-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          ))}
        </div>

        {/* Summary footer */}
        <div className="mt-4 pt-4 border-t border-amber-200 text-center">
          <p className="text-xs text-gray-500">
            {recommendations.length} action{recommendations.length !== 1 ? "s" : ""} recommended
            based on soil nutrient analysis
          </p>
        </div>
      </CardContent>
    </Card>
  );
}