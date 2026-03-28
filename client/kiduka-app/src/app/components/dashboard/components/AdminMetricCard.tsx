import type React from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";

export interface MetricCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  change: string;
  changeType: "positive" | "negative" | "neutral";
  loading?: boolean;
}

export function AdminMetricCard({
  title,
  value,
  icon,
  change,
  changeType,
  loading = false,
}: MetricCardProps) {
  const changeColorClass = {
    positive: "text-green-600",
    negative: "text-red-600",
    neutral: "text-gray-600",
  }[changeType];

  return (
    <Card>
      <CardHeader className="flex items-center">
        <div className="p-2 bg-green-50 rounded-lg">{icon}</div>
        <div className="ml-4">
          <CardTitle className="text-sm font-medium text-green-700">
            {title}
          </CardTitle>
          {loading ? (
            <div className="h-8 w-20 bg-gray-200 rounded animate-pulse mt-1" />
          ) : (
            <div className="text-2xl font-semibold text-green-900">
              {value.toLocaleString()}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
        ) : (
          <p className={`text-sm ${changeColorClass}`}>{change}</p>
        )}
      </CardContent>
    </Card>
  );
}
