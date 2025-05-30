"use client";

import type React from "react";

import { Progress } from "@/components/ui/progress";

interface NutrientGaugeProps {
  name: string;
  value: number;
  unit: string;
  optimal: { min: number; max: number };
  icon: React.ReactNode;
}

export function NutrientGauge({
  name,
  value,
  unit,
  optimal,
  icon,
}: NutrientGaugeProps) {
  const percentage = Math.min((value / optimal.max) * 100, 100);
  const status =
    value < optimal.min ? "low" : value > optimal.max ? "high" : "optimal";

  const getStatusColor = () => {
    switch (status) {
      case "low":
        return "bg-red-500";
      case "high":
        return "bg-orange-500";
      case "optimal":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "low":
        return "Below Optimal";
      case "high":
        return "Above Optimal";
      case "optimal":
        return "Optimal Range";
      default:
        return "Unknown";
    }
  };

  return (
    <div className="bg-white rounded-lg border border-amber-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-medium text-gray-900">{name}</h3>
        </div>
        <span className="text-sm font-mono text-gray-600">
          {value} {unit}
        </span>
      </div>

      <div className="space-y-2">
        <Progress value={percentage} className={`h-2 ${getStatusColor()}`} />
        <div className="flex justify-between text-xs text-gray-500">
          <span>
            {optimal.min} {unit}
          </span>
          <span
            className={`font-medium ${
              status === "optimal"
                ? "text-green-600"
                : status === "low"
                ? "text-red-600"
                : "text-orange-600"
            }`}
          >
            {getStatusText()}
          </span>
          <span>
            {optimal.max} {unit}
          </span>
        </div>
      </div>
    </div>
  );
}
