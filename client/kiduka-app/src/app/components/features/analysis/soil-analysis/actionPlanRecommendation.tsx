// components/soil-analysis/ActionPlanRecommendations.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle,
  Leaf,
  Activity,
  TrendingUp,
  Target,
} from "lucide-react";
import { StructuredResponse } from "@/types/soil-analysis";
import {
  getPriorityStyle,
  getTimeframeStyle,
  getCategoryIcon,
} from "@/lib/soil-analysis-helper";

interface ActionPlanRecommendationsProps {
  structuredResponse: StructuredResponse;
}

export function ActionPlanRecommendations({
  structuredResponse,
}: ActionPlanRecommendationsProps) {
  return (
    <div className="space-y-6">
      {/* Fertilizer Justification Card */}
      <Card className="border-amber-200 bg-white shadow-lg">
        <CardHeader className="bg-gradient-to-r from-green-50 to-amber-50 border-b border-amber-200">
          <CardTitle className="flex items-center gap-2 text-green-800">
            <Leaf className="h-5 w-5" />
            Fertilizer Recommendation
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-4 rounded-lg border border-emerald-200">
            <h4 className="text-emerald-900 font-semibold mb-2 flex items-center gap-2">
              <Target className="h-4 w-4" />
              Why This Fertilizer?
            </h4>
            <p className="text-emerald-800 text-sm leading-relaxed">
              {structuredResponse.fertilizer_justification}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Action Plan Card */}
      <Card className="border-amber-200 bg-white shadow-lg">
        <CardHeader className="bg-gradient-to-r from-green-50 to-amber-50 border-b border-amber-200">
          <CardTitle className="flex items-center gap-2 text-green-800">
            <CheckCircle className="h-5 w-5" />
            Prioritized Action Plan
          </CardTitle>
          <p className="text-green-600 text-sm mt-2">
            Organized recommendations by priority and implementation timeline
          </p>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* Priority-based recommendations */}
            {["high", "medium", "low"].map((priority) => {
              const priorityRecs = structuredResponse.recommendations.filter(
                (rec) => rec.priority.toLowerCase() === priority
              );

              if (priorityRecs.length === 0) return null;

              const priorityStyle = getPriorityStyle(priority);

              return (
                <div key={priority} className="space-y-4">
                  <div className="flex items-center gap-3">
                    {priorityStyle.icon}
                    <h4
                      className={`font-semibold text-lg ${priorityStyle.color} capitalize`}
                    >
                      {priority} Priority Actions
                    </h4>
                    <Badge
                      variant="outline"
                      className={priorityStyle.badgeClass}
                    >
                      {priorityRecs.length}{" "}
                      {priorityRecs.length === 1 ? "item" : "items"}
                    </Badge>
                  </div>

                  <div className="grid gap-4">
                    {priorityRecs.map((rec, index) => {
                      const timeframeStyle = getTimeframeStyle(rec.timeframe);
                      const categoryIcon = getCategoryIcon(rec.category);

                      return (
                        <div
                          key={`${priority}-${index}`}
                          className={`group hover:shadow-md transition-all duration-200 p-5 rounded-lg border-2 ${priorityStyle.bg} ${priorityStyle.border}`}
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-white rounded-lg shadow-sm">
                                {categoryIcon}
                              </div>
                              <div>
                                <Badge
                                  variant="outline"
                                  className="text-xs font-medium"
                                >
                                  {rec.category.replace("_", " ").toUpperCase()}
                                </Badge>
                              </div>
                            </div>
                            <div
                              className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${timeframeStyle.bgClass} ${timeframeStyle.color}`}
                            >
                              {timeframeStyle.icon}
                              <span className="capitalize">
                                {rec.timeframe.replace("_", " ")}
                              </span>
                            </div>
                          </div>

                          <div className="bg-white bg-opacity-70 p-4 rounded-lg space-y-3">
                            <h5
                              className={`font-semibold ${priorityStyle.color} text-base`}
                            >
                              {rec.action}
                            </h5>
                            <p className="text-sm text-gray-700 leading-relaxed">
                              {rec.reasoning}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {priority !== "low" && (
                    <Separator className="my-6 bg-slate-200" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Assessment & Strategy Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Confidence Assessment */}
        <Card className="border-amber-200 bg-white shadow-lg">
          <CardHeader className="bg-gradient-to-r from-green-50 to-amber-50 border-b border-amber-200">
            <CardTitle className="flex items-center gap-2 text-green-800">
              <Activity className="h-5 w-5" />
              Confidence Assessment
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-4 rounded-lg border border-indigo-200">
              <p className="text-indigo-800 text-sm leading-relaxed">
                {structuredResponse.confidence_assessment}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Long-term Strategy */}
        <Card className="border-amber-200 bg-white shadow-lg">
          <CardHeader className="bg-gradient-to-r from-green-50 to-amber-50 border-b border-amber-200">
            <CardTitle className="flex items-center gap-2 text-green-800">
              <TrendingUp className="h-5 w-5" />
              Long-term Strategy
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="bg-gradient-to-r from-violet-50 to-purple-50 p-4 rounded-lg border border-violet-200">
              <p className="text-violet-800 text-sm leading-relaxed">
                {structuredResponse.long_term_strategy}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}