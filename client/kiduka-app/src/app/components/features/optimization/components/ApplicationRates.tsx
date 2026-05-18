"use client"

import React from "react";
import { Sprout } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
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

  // Group rows by crop for section headers
  const grouped = rows.reduce<Record<string, ApplicationRow[]>>((acc, row) => {
    if (!acc[row.crop]) acc[row.crop] = [];
    acc[row.crop].push(row);
    return acc;
  }, {});

  return (
    <Card className="border-amber-200 bg-white shadow-lg overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-green-50 to-amber-50 border-b border-amber-200 py-4 px-5">
        <CardTitle className="flex items-center gap-2 text-base text-green-800 font-semibold">
          <Sprout className="h-4 w-4 text-green-600" />
          Application Rates
        </CardTitle>
        <CardDescription className="text-xs text-gray-500 mt-0.5">
          Recommended product quantities per crop
        </CardDescription>
      </CardHeader>

      <CardContent className="p-0">
        {rows.length === 0 ? (
          <p className="text-sm text-gray-400 italic text-center py-8">
            No application rates to display.
          </p>
        ) : (
          <div className="divide-y divide-amber-100">
            {Object.entries(grouped).map(([crop, cropRows]) => (
              <div key={crop}>
                {/* Crop header */}
                <div className="px-5 py-2 bg-green-50/60 border-b border-amber-100">
                  <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">
                    {crop}
                  </span>
                </div>

                {cropRows.map((row, i) => (
                  <div
                    key={i}
                    className="px-5 py-3 hover:bg-amber-50/40 transition-colors"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {row.fertilizer}
                        </p>
                        <div className="flex gap-3 mt-1 text-xs text-gray-500">
                          <span>{row.kg_product_per_ac.toFixed(1)} kg/ac</span>
                          <span className="text-gray-300">·</span>
                          <span>{row.kg_product_per_ha.toFixed(1)} kg/ha</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-gray-800">
                          {row.kg_product_total.toFixed(1)} kg
                        </p>
                        <p className="text-xs text-amber-600 mt-0.5">
                          {fmt(row.cost_total)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
