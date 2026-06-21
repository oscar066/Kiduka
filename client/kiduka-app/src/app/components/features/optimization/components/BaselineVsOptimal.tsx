"use client"

import React from "react";
import {
  TrendingUpDown,
  Sprout,
  LayoutDashboard,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { fmt, DeltaBadge } from "./OptimizationHelpers";

interface ComparisonProps {
  baselineRows: any[];
  optimalRows: any[];
  baselineSummary: any;
  optimalSummary: any;
  cropNames: string[];
  selectedCrop: string;
  onSelectCrop: (name: string) => void;
}

const chartConfig: ChartConfig = {
  baseline:  { label: "Baseline",  color: "#64748b" },
  optimized: { label: "Optimized", color: "#16a34a" },
};

type MetricKey = "returns" | "revenue" | "cost";

const METRICS: Record<MetricKey, { label: string; bKey: string; oKey: string; summaryBKey: string; summaryOKey: string }> = {
  returns: { label: "Net Returns", bKey: "net_return_total",      oKey: "net_return_total",      summaryBKey: "baseline_net_return_total", summaryOKey: "feasible_net_return_total" },
  revenue: { label: "Revenue",     bKey: "revenue_total",         oKey: "revenue_total",         summaryBKey: "baseline_revenue_total",    summaryOKey: "feasible_revenue_total"    },
  cost:    { label: "Fert. Cost",  bKey: "fertilizer_cost_total", oKey: "fertilizer_cost_total", summaryBKey: "baseline_cost_total",       summaryOKey: "budget_used"               },
};

export function BaselineVsOptimal({
  baselineRows,
  optimalRows,
  baselineSummary,
  optimalSummary,
  cropNames,
  selectedCrop,
  onSelectCrop,
}: ComparisonProps) {
  const uniqueCropNames = [...new Set(cropNames)];

  const baselineMap = Object.fromEntries((baselineRows ?? []).map((r) => [r.crop, r]));
  const optimalMap  = Object.fromEntries((optimalRows  ?? []).map((r) => [r.crop, r]));

  const bRow = baselineMap[selectedCrop] ?? null;
  const oRow = optimalMap[selectedCrop]  ?? null;

  return (
    <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-green-50 to-amber-50 border-b border-amber-200 py-3.5 px-5 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUpDown className="h-4 w-4 text-green-600" />
            <span className="text-sm font-serif font-semibold text-green-800">Impact Comparison</span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Baseline vs Optimized for <strong className="text-green-700">{selectedCrop}</strong>
          </p>
        </div>
        <div className="w-36">
          <Select value={selectedCrop} onValueChange={onSelectCrop}>
            <SelectTrigger className="h-8 text-[11px] border-amber-200 bg-white focus:ring-green-400">
              <SelectValue placeholder="Crop" />
            </SelectTrigger>
            <SelectContent>
              {uniqueCropNames.map((name) => (
                <SelectItem key={name} value={name} className="text-xs">{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!bRow || !oRow ? (
        <div className="py-16 flex flex-col items-center text-center px-6 gap-3">
          <div className="p-3 bg-green-50 rounded-full">
            <Sprout className="h-6 w-6 text-green-300" />
          </div>
          <p className="text-sm text-gray-400 max-w-[200px]">
            Waiting for optimization results…
          </p>
        </div>
      ) : (
        <Tabs defaultValue="returns" className="w-full">
          <div className="px-5 pt-4">
            <TabsList className="grid w-full grid-cols-3 bg-green-50/50 border border-amber-100 p-1 h-9">
              <TabsTrigger value="returns" className="text-[11px] h-7 data-[state=active]:bg-green-600 data-[state=active]:text-white">Returns</TabsTrigger>
              <TabsTrigger value="revenue" className="text-[11px] h-7 data-[state=active]:bg-green-600 data-[state=active]:text-white">Revenue</TabsTrigger>
              <TabsTrigger value="cost"    className="text-[11px] h-7 data-[state=active]:bg-green-600 data-[state=active]:text-white">Cost</TabsTrigger>
            </TabsList>
          </div>

          {(Object.entries(METRICS) as [MetricKey, typeof METRICS[MetricKey]][]).map(([key, cfg]) => {
            const bVal = bRow[cfg.bKey] ?? 0;
            const oVal = oRow[cfg.oKey] ?? 0;
            const bSum = baselineSummary?.[cfg.summaryBKey] ?? 0;
            const oSum = optimalSummary?.[cfg.summaryOKey] ?? 0;

            const chartData = [
              { name: "Current",   value: bVal, fill: "var(--color-baseline)"  },
              { name: "Optimized", value: oVal, fill: "var(--color-optimized)" },
            ];

            return (
              <TabsContent key={key} value={key} className="p-0 animate-in fade-in duration-300">
                <div className="px-5 py-5">
                  <div className="mb-5 h-[180px]">
                    <ChartContainer config={chartConfig} className="h-full w-full">
                      <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis
                          dataKey="name"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 10, fill: "#64748b", fontWeight: 500 }}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 10, fill: "#94a3b8" }}
                          tickFormatter={(v) => `KES ${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`}
                        />
                        <ChartTooltip content={<ChartTooltipContent hideLabel />} cursor={false} />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={60} />
                      </BarChart>
                    </ChartContainer>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <p className="text-[9px] text-gray-400 uppercase font-bold tracking-wider">Current {cfg.label}</p>
                      <p className="text-base font-mono font-bold text-gray-600 mt-0.5 tabular-nums">{fmt(bVal)}</p>
                    </div>
                    <div className="bg-green-50/60 p-3 rounded-lg border border-green-100">
                      <p className="text-[9px] text-green-600 uppercase font-bold tracking-wider">Optimized {cfg.label}</p>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <p className="text-base font-mono font-bold text-green-700 tabular-nums">{fmt(oVal)}</p>
                        <DeltaBadge baseline={bVal} optimal={oVal} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50/40 border-t border-amber-100 py-3 px-5 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <LayoutDashboard className="h-3 w-3 text-amber-500" />
                    <span className="text-[10px] font-bold text-amber-700 uppercase tracking-tight">Portfolio Summary</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-[8px] text-gray-400 uppercase">Total Optimized</p>
                      <p className="text-xs font-mono font-bold text-green-700 tabular-nums">{fmt(oSum)}</p>
                    </div>
                    <DeltaBadge baseline={bSum} optimal={oSum} />
                  </div>
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      )}
    </div>
  );
}
