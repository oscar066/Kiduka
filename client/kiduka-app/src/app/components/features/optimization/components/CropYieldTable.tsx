"use client"

import React from "react";
import { BarChart3 } from "lucide-react";
import { fmt } from "./OptimizationHelpers";

interface CropScenarioRow {
  crop: string;
  yield_kg_ha: number;
  yield_kg_ac: number;
  revenue_total: number;
  fertilizer_cost_total: number;
  net_return_total: number;
}

interface CropYieldTableProps {
  baselineRows: CropScenarioRow[];
  feasibleRows: CropScenarioRow[];
}

export function CropYieldTable({ baselineRows, feasibleRows }: CropYieldTableProps) {
  const baselineMap = Object.fromEntries((baselineRows ?? []).map((r) => [r.crop, r]));

  return (
    <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-green-50 to-amber-50 border-b border-amber-200 py-3.5 px-5">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-green-600" />
          <span className="text-sm font-serif font-semibold text-green-800">Per-Crop Yield Breakdown</span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">Optimized scenario versus no-fertilizer baseline</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gradient-to-r from-green-50 to-amber-50 border-b border-amber-100">
              <th className="text-left px-5 py-3 text-xs font-semibold text-green-800 uppercase tracking-wider whitespace-nowrap">
                Crop
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-green-800 uppercase tracking-wider whitespace-nowrap">
                Yield (kg/ha)
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-green-800 uppercase tracking-wider whitespace-nowrap">
                Revenue
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-green-800 uppercase tracking-wider whitespace-nowrap">
                Fert. Cost
              </th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-green-800 uppercase tracking-wider whitespace-nowrap">
                Net Return
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-amber-50">
            {(feasibleRows ?? []).map((row) => {
              const base = baselineMap[row.crop];
              const yieldGain = base ? row.yield_kg_ha - base.yield_kg_ha : null;

              return (
                <tr key={row.crop} className="hover:bg-green-50/30 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-800 whitespace-nowrap">
                    {row.crop}
                    {yieldGain !== null && yieldGain > 0.5 && (
                      <span className="ml-2 text-[10px] font-bold text-green-700 bg-green-50 border border-green-100 rounded px-1.5 py-0.5">
                        +{yieldGain.toFixed(0)} kg/ha
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700 whitespace-nowrap">
                    <span className="font-semibold tabular-nums">{row.yield_kg_ha.toFixed(0)}</span>
                    <span className="text-xs text-gray-400 ml-1">({row.yield_kg_ac.toFixed(0)}/ac)</span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700 whitespace-nowrap tabular-nums">
                    {fmt(row.revenue_total)}
                  </td>
                  <td className="px-4 py-3 text-right text-amber-600 whitespace-nowrap tabular-nums">
                    {row.fertilizer_cost_total > 0 ? fmt(row.fertilizer_cost_total) : "—"}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold whitespace-nowrap tabular-nums">
                    <span className={row.net_return_total >= 0 ? "text-green-700" : "text-red-600"}>
                      {fmt(row.net_return_total)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
