"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";

interface SoilHealthCardProps {
  status: string;
  confidence: number;
  texture: string;
  ph: number;
}

export function SoilHealthCard({
  status,
  confidence,
  texture,
  ph,
}: SoilHealthCardProps) {
  const getStatusIcon = () => {
    switch (status.toLowerCase()) {
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
    switch (status.toLowerCase()) {
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
    if (ph < 6.0) return { text: "Acidic", color: "text-orange-600" };
    if (ph > 7.5) return { text: "Alkaline", color: "text-blue-600" };
    return { text: "Neutral", color: "text-green-600" };
  };

  const phStatus = getPhStatus();

  return (
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
          <Badge className={getStatusColor()}>{status}</Badge>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-700">Confidence Level</span>
            <span className="font-medium">{Math.round(confidence * 100)}%</span>
          </div>
          <Progress value={confidence * 100} className="h-3" />
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="space-y-1">
            <span className="text-xs text-gray-500 uppercase tracking-wide">
              Texture
            </span>
            <p className="font-medium text-gray-900">{texture}</p>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-gray-500 uppercase tracking-wide">
              pH Level
            </span>
            <p className={`font-medium ${phStatus.color}`}>
              {ph} ({phStatus.text})
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
