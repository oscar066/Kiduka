"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Sprout, Target, Calendar } from "lucide-react"

interface FertilizerRecommendationProps {
  fertilizer: string
  confidence: number
  timestamp: string
}

export function FertilizerRecommendation({ fertilizer, confidence, timestamp }: FertilizerRecommendationProps) {
  return (
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
            <Badge className="bg-blue-600 text-white text-lg px-4 py-2">{fertilizer}</Badge>
            <p className="text-sm text-gray-600">Recommended Fertilizer</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1">
              <Target className="h-4 w-4 text-blue-600" />
              <span className="text-gray-700">Recommendation Confidence</span>
            </div>
            <span className="font-medium">{Math.round(confidence * 100)}%</span>
          </div>
          <Progress value={confidence * 100} className="h-3" />
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500 pt-2">
          <Calendar className="h-3 w-3" />
          <span>Analysis Date: {new Date(timestamp).toLocaleDateString()}</span>
        </div>
      </CardContent>
    </Card>
  )
}
