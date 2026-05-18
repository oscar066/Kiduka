"use client"

import React from "react";
import { BarChart3 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
    <Card className="border-amber-200 bg-white shadow-lg overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-green-50 to-amber-50 border-b border-amber-200 py-4 px-5">
        <CardTitle className="flex items-center gap-2 text-base text-green-800 font-semibold">
          <BarChart3 className="h-4 w-4 text-green-600" />
          Per-Crop Yield Breakdown
        </CardTitle>
        <CardDescription className="text-xs text-gray-500 mt-0.5">
          Optimized scenario versus no-fertilizer baseline
        </CardDescription>
      </CardHeader>

      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-amber-100 bg-gray-50/60">
              <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                Crop
              </th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                Yield (kg/ha)
              </th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                Revenue
              </th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                Fert. Cost
              </th>
              <th className="text-right px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                Net Return
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-amber-50">
            {(feasibleRows ?? []).map((row) => {
              const base = baselineMap[row.crop];
              const yieldGain = base
                ? row.yield_kg_ha - base.yield_kg_ha
                : null;

              return (
                <tr key={row.crop} className="hover:bg-amber-50/30 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-800 whitespace-nowrap">
                    {row.crop}
                    {yieldGain !== null && yieldGain > 0.5 && (
                      <span className="ml-2 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded px-1.5 py-0.5">
                        +{yieldGain.toFixed(0)} kg/ha
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700 whitespace-nowrap">
                    <span className="font-semibold">{row.yield_kg_ha.toFixed(0)}</span>
                    <span className="text-xs text-gray-400 ml-1">
                      ({row.yield_kg_ac.toFixed(0)}/ac)
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700 whitespace-nowrap">
                    {fmt(row.revenue_total)}
                  </td>
                  <td className="px-4 py-3 text-right text-amber-600 whitespace-nowrap">
                    {row.fertilizer_cost_total > 0 ? fmt(row.fertilizer_cost_total) : "—"}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold whitespace-nowrap">
                    <span className={row.net_return_total >= 0 ? "text-emerald-700" : "text-red-600"}>
                      {fmt(row.net_return_total)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
