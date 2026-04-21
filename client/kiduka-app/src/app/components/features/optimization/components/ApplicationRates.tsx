"use client"

import React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ApplicationRatesProps {
  applicationRows: any[];
}

export function ApplicationRates({ applicationRows }: ApplicationRatesProps) {
  const filteredRows = (applicationRows ?? []).filter((r) => r.kg_per_ac > 0.01);

  return (
    <Card className="border-amber-200 bg-white shadow-lg overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-green-50 to-amber-50 border-b border-amber-200 py-4 px-5">
        <CardTitle className="text-base text-green-800 font-semibold">
          Application Rates
        </CardTitle>
        <CardDescription>
          Recommended kg of product per acre for each crop
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-amber-100">
          {filteredRows.map((row, i) => (
            <div
              key={i}
              className="flex justify-between items-center px-5 py-4 hover:bg-amber-50/50 transition-colors"
            >
              <div>
                <p className="font-semibold text-sm text-gray-800">
                  {row.crop}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Apply {row.product}
                </p>
              </div>
              <div className="text-right">
                <Badge
                  variant="outline"
                  className="text-green-700 bg-green-50 border-green-200 text-sm py-1 px-3"
                >
                  {row.kg_per_ac.toFixed(2)} kg / acre
                </Badge>
                <p className="text-xs text-gray-400 mt-1">
                  Total: {row.kg_total.toFixed(2)} kg
                </p>
              </div>
            </div>
          ))}

          {filteredRows.length === 0 && (
            <p className="text-sm text-gray-400 italic text-center py-8">
              No application rates to display.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
