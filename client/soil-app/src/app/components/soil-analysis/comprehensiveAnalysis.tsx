// components/soil-analysis/ComprehensiveAnalysis.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Beaker, Target } from "lucide-react";
import { StructuredResponse } from "@/types/soil-analysis";

interface ComprehensiveAnalysisProps {
  structuredResponse: StructuredResponse;
}

export function ComprehensiveAnalysis({
  structuredResponse,
}: ComprehensiveAnalysisProps) {
  return (
    <Card className="border-amber-200 bg-white shadow-lg">
      <CardHeader className="bg-gradient-to-r from-green-50 to-amber-50 border-b border-amber-200">
        <CardTitle className="flex items-center gap-2 text-green-800">
          <FileText className="h-5 w-5" />
          Comprehensive Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Summary */}
        <div className="bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-lg border border-blue-200">
          <h4 className="text-blue-900 font-semibold mb-2 flex items-center gap-2">
            <Beaker className="h-4 w-4" />
            Executive Summary
          </h4>
          <p className="text-blue-800 text-sm leading-relaxed">
            {structuredResponse.explanation.summary}
          </p>
        </div>

        {/* Detailed Analysis Sections */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
              <h5 className="font-medium text-amber-900 mb-2">
                Fertility Analysis
              </h5>
              <p className="text-sm text-amber-800 leading-relaxed">
                {structuredResponse.explanation.fertility_analysis}
              </p>
            </div>

            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h5 className="font-medium text-green-900 mb-2">pH Analysis</h5>
              <p className="text-sm text-green-800 leading-relaxed">
                {structuredResponse.explanation.ph_analysis}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <h5 className="font-medium text-purple-900 mb-2">
                Nutrient Analysis
              </h5>
              <p className="text-sm text-purple-800 leading-relaxed">
                {structuredResponse.explanation.nutrient_analysis}
              </p>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <h5 className="font-medium text-yellow-900 mb-2">
                Soil Texture Analysis
              </h5>
              <p className="text-sm text-yellow-800 leading-relaxed">
                {structuredResponse.explanation.soil_texture_analysis}
              </p>
            </div>
          </div>
        </div>

        {/* Overall Assessment */}
        <div className="bg-gradient-to-r from-slate-50 to-gray-50 p-4 rounded-lg border border-slate-200">
          <h4 className="text-slate-900 font-semibold mb-2 flex items-center gap-2">
            <Target className="h-4 w-4" />
            Overall Assessment
          </h4>
          <p className="text-slate-800 text-sm leading-relaxed">
            {structuredResponse.explanation.overall_assessment}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
