import type React from "react";
import { Skeleton } from "@/components/ui/skeleton";

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
  const changeColor = {
    positive: "text-green-600",
    negative: "text-red-500",
    neutral: "text-amber-600",
  }[changeType];

  return (
    <div className="bg-white rounded-xl border border-amber-200 shadow-sm p-4 flex items-start gap-3 hover:shadow-md transition-shadow">
      <div className="p-2 bg-green-50 rounded-lg shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-green-700 uppercase tracking-wide">{title}</p>
        {loading ? (
          <Skeleton className="h-7 w-20 mt-1" />
        ) : (
          <p className="text-2xl font-bold text-green-900 mt-0.5 leading-none">
            {value.toLocaleString()}
          </p>
        )}
        {loading ? (
          <Skeleton className="h-3 w-24 mt-2" />
        ) : (
          <p className={`text-xs mt-1.5 ${changeColor}`}>{change}</p>
        )}
      </div>
    </div>
  );
}
