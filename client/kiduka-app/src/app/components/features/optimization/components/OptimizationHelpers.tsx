"use client"

import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

/**
 * Shared Types
 */
export interface Crop {
  crop: string;
  area_ac: number;
  // Client UI only - not sent to API
  grain_price_currency_per_kg: number; // API expects this for crop baseline valuation
}

export interface FertilizerEntry {
  product: string;
  // Fractions as decimals (0-1), not percentages
  n_fraction: number; // e.g., 0.46 for 46% N
  p2o5_fraction: number; // e.g., 0.23 for 23% P2O5
  k2o_fraction: number; // e.g., 0.23 for 23% K2O
  price_currency_per_kg: number; // Price per kg product
  // Client UI only - not sent to API
  enabled: boolean;
  isCustom: boolean;
}

/**
 * Constants
 */
export const SUPPORTED_CROPS = [
  "Maize",
  "Beans",
  "Groundnuts",
  "Soybeans",
  "Sunflower",
  "Cassava",
  "Cotton",
  "Sesame (Sim sim)",
];

export const DEFAULT_GRAIN_PRICES: Record<string, number> = {
  "Maize": 30,
  "Beans": 90,
  "Groundnuts": 90,
  "Soybeans": 50,
  "Sunflower": 35,
  "Cassava": 18,
  "Cotton": 25,
  "Sesame (Sim sim)": 110,
};

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
