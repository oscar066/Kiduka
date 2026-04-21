"use client"

import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

/**
 * Shared Types
 */
export interface Crop {
  crop: string;
  area_ac: number;
  grain_value_currency_per_kg: number;
  initial_n_kg_per_ha: number;
  initial_p_kg_per_ha: number;
  initial_k_kg_per_ha: number;
}

export interface FertilizerEntry {
  product: string;
  n_pct: number;
  p2o5_pct: number;
  k2o_pct: number;
  price_currency_per_50kg: number;
  enabled: boolean;
  isCustom: boolean;
}

/**
 * Constants
 */
export const SUPPORTED_CROPS = [
  "Maize HP >3t",
  "Maize LP <3t",
  "Sorghum",
  "Finger millet",
  "Bean",
  "Groundnuts, unshelled",
];

/**
 * Format currency to KES
 */
export function fmt(val: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(val);
}

/**
 * Nutrient tag component
 */
export function NutrientTag({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full border border-gray-200 bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700">
      <span className="text-gray-500 font-normal">{label} </span>
      {value}%
    </span>
  );
}

/**
 * Delta badge showing gain or loss
 */
export function DeltaBadge({
  baseline,
  optimal,
}: {
  baseline: number;
  optimal: number;
}) {
  const diff = optimal - baseline;
  if (Math.abs(diff) < 0.01) return null;

  const isGain = diff > 0;
  const pct = (Math.abs(diff) / (Math.abs(baseline) || 1)) * 100;

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset ${
        isGain
          ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
          : "bg-red-50 text-red-700 ring-red-600/20"
      }`}
    >
      {isGain ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      {isGain ? "+" : "-"}
      {pct > 100 ? fmt(Math.abs(diff)) : pct.toFixed(1) + "%"}
    </div>
  );
}
