// components/soil-analysis/ActionPlanRecommendations.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Leaf, Activity, TrendingUp } from "lucide-react";
import { StructuredResponse } from "@/types/soil-analysis";
import { getPriorityStyle, getTimeframeStyle } from "@/lib/soil-analysis-helper";

interface ActionPlanRecommendationsProps {
  structuredResponse: StructuredResponse;
}

export function ActionPlanRecommendations({ structuredResponse }: ActionPlanRecommendationsProps) {
  return (
    <Card className="border-amber-200 bg-white shadow-lg">
      <CardHeader className="bg-gradient-to-r from-green-50 to-amber-50 border-b border-amber-200">
        <CardTitle className="flex items-center gap-2 text-green-800">
          <CheckCircle className="h-5 w-5" />
          Action Plan & Recommendations
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Fertilizer Justification */}
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-4 rounded-lg border border-emerald-200">
          <h4 className="text-emerald-900 font-semibold mb-2 flex items-center gap-2">
            <Leaf className="h-4 w-4" />
            Fertilizer Recommendation Justification
          </h4>
          <p className="text-emerald-800 text-sm leading-relaxed">
            {structuredResponse.fertilizer_justification}
          </p>
        </div>

        {/* Categorized Recommendations */}
        <div className="space-y-4">
          <h4 className="font-semibold text-green-800 text-lg">
            Prioritized Action Items:
          </h4>

          {/* Group recommendations by priority */}
          {["high", "medium", "low"].map((priority) => {
            const priorityRecs = structuredResponse.recommendations.filter(
              (rec) => rec.priority.toLowerCase() === priority
            );

            if (priorityRecs.length === 0) return null;

            const priorityStyle = getPriorityStyle(priority);

            return (
              <div key={priority} className="space-y-3">
                <h5 className={`font-medium text-lg ${priorityStyle.color} flex items-center gap-2 capitalize`}>
                  {priorityStyle.icon}
                  {priority} Priority Actions
                </h5>

                <div className="grid gap-3">
                  {priorityRecs.map((rec, index) => {
                    const timeframeStyle = getTimeframeStyle(rec.timeframe);

                    return (
                      <div
                        key={`${priority}-${index}`}
                        className={`p-4 rounded-lg border ${priorityStyle.bg} ${priorityStyle.border} shadow-sm`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${priorityStyle.bg} ${priorityStyle.color} border`}>
                              {rec.category.replace("_", " ").toUpperCase()}
                            </span>
                          </div>
                          <div className={`flex items-center gap-1 text-xs ${timeframeStyle.color}`}>
                            {timeframeStyle.icon}
                            <span className="capitalize">{rec.timeframe.replace("_", " ")}</span>
                          </div>
                        </div>

                        <h6 className={`font-medium ${priorityStyle.color} mb-2`}>
                          {rec.action}
                        </h6>

                        <p className="text-sm text-gray-700 leading-relaxed">
                          {rec.reasoning}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Confidence Assessment */}
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-4 rounded-lg border border-indigo-200">
          <h4 className="text-indigo-900 font-semibold mb-2 flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Confidence Assessment
          </h4>
          <p className="text-indigo-800 text-sm leading-relaxed">
            {structuredResponse.confidence_assessment}
          </p>
        </div>

        {/* Long-term Strategy */}
        <div className="bg-gradient-to-r from-violet-50 to-purple-50 p-4 rounded-lg border border-violet-200">
          <h4 className="text-violet-900 font-semibold mb-2 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Long-term Soil Health Strategy
          </h4>
          <p className="text-violet-800 text-sm leading-relaxed">
            {structuredResponse.long_term_strategy}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}