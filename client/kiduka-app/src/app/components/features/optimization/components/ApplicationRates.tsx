"use client"

import React from "react";
import { Sprout } from "lucide-react";
import { fmt } from "./OptimizationHelpers";

interface ApplicationRow {
  crop: string;
  fertilizer: string;
  kg_product_per_ha: number;
  kg_product_per_ac: number;
  kg_product_total: number;
  cost_total: number;
}

interface ApplicationRatesProps {
  applicationRows: ApplicationRow[];
}

export function ApplicationRates({ applicationRows }: ApplicationRatesProps) {
  const rows = (applicationRows ?? []).filter((r) => r.kg_product_per_ac > 0.01);

  const grouped = rows.reduce<Record<string, ApplicationRow[]>>((acc, row) => {
    if (!acc[row.crop]) acc[row.crop] = [];
    acc[row.crop].push(row);
    return acc;
  }, {});

  return (
    <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-green-50 to-amber-50 border-b border-amber-200 py-3.5 px-5">
        <div className="flex items-center gap-2">
          <Sprout className="h-4 w-4 text-green-600" />
          <span className="text-sm font-serif font-semibold text-green-800">Application Rates</span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">Recommended product quantities per crop</p>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2">
          <div className="p-3 bg-green-50 rounded-full">
            <Sprout className="h-5 w-5 text-green-300" />
          </div>
          <p className="text-sm text-gray-400 italic">No application rates to display.</p>
        </div>
      ) : (
        <div className="divide-y divide-amber-100">
          {Object.entries(grouped).map(([crop, cropRows]) => (
            <div key={crop}>
              <div className="px-5 py-2 bg-green-50/60 border-b border-amber-100">
                <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">
                  {crop}
                </span>
              </div>
              {cropRows.map((row, i) => (
                <div key={i} className="px-5 py-3 hover:bg-amber-50/40 transition-colors">
                  <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{row.fertilizer}</p>
                      <div className="flex gap-3 mt-1 text-xs text-gray-400">
                        <span className="tabular-nums">{row.kg_product_per_ac.toFixed(1)} kg/ac</span>
                        <span className="text-gray-200">·</span>
                        <span className="tabular-nums">{row.kg_product_per_ha.toFixed(1)} kg/ha</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-gray-800 tabular-nums">
                        {row.kg_product_total.toFixed(1)} kg
                      </p>
                      <p className="text-xs text-amber-600 mt-0.5 tabular-nums">{fmt(row.cost_total)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
