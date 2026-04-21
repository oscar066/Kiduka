"use client"

import React from "react";
import { 
  TrendingUpDown, 
  Sprout, 
  LayoutDashboard,
  Minus 
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
  baseline: { label: "Baseline", color: "#64748b" },   // slate-500
  optimized: { label: "Optimized", color: "#10b981" },  // emerald-500
};

type MetricKey = "returns" | "revenue" | "cost";

const METRICS: Record<MetricKey, { label: string; bKey: string; oKey: string; summaryBKey: string; summaryOKey: string }> = {
  returns: { label: "Net Returns",  bKey: "net_returns_currency",       oKey: "net_returns_currency",       summaryBKey: "total_net_returns_currency",       summaryOKey: "total_net_returns_currency"       },
  revenue: { label: "Revenue",      bKey: "expected_revenue_currency",  oKey: "expected_revenue_currency",  summaryBKey: "total_expected_revenue_currency",  summaryOKey: "total_expected_revenue_currency"  },
  cost:    { label: "Fert. Cost",   bKey: "fertilizer_cost_currency",   oKey: "fertilizer_cost_currency",   summaryBKey: "total_fertilizer_cost_currency",   summaryOKey: "total_fertilizer_cost_currency"   },
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
  const baselineMap = Object.fromEntries(
    (baselineRows ?? []).map((r) => [r.crop, r])
  );
  const optimalMap = Object.fromEntries(
    (optimalRows ?? []).map((r) => [r.crop, r])
  );

  const bRow = baselineMap[selectedCrop] ?? null;
  const oRow = optimalMap[selectedCrop] ?? null;

  return (
    <Card className="border-amber-200 bg-white shadow-lg overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-green-50 to-amber-50 border-b border-amber-200 py-4 px-5">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base text-green-800 font-semibold flex items-center gap-2">
              <TrendingUpDown className="h-4 w-4 text-green-600" />
              Impact Comparison
            </CardTitle>
            <CardDescription className="text-xs">
              Baseline vs Optimized for <strong>{selectedCrop}</strong>
            </CardDescription>
          </div>
          <div className="w-40">
            <Select value={selectedCrop} onValueChange={onSelectCrop}>
              <SelectTrigger className="h-8 text-[11px] border-amber-200 bg-white/50 focus:ring-green-400">
                <SelectValue placeholder="Crop" />
              </SelectTrigger>
              <SelectContent>
                {cropNames.map((name) => (
                  <SelectItem key={name} value={name} className="text-xs">
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {!bRow || !oRow ? (
          <div className="py-16 flex flex-col items-center text-center px-6">
            <Sprout className="h-10 w-10 text-green-100 mb-3" />
            <p className="text-sm text-gray-400 max-w-[200px]">
              Waiting for optimization results...
            </p>
          </div>
        ) : (
          <Tabs defaultValue="returns" className="w-full">
            <div className="px-5 pt-4">
              <TabsList className="grid w-full grid-cols-3 bg-gray-50/50 border border-amber-50 p-1 h-9">
                <TabsTrigger value="returns" className="text-[11px] h-7 data-[state=active]:bg-green-600 data-[state=active]:text-white">Returns</TabsTrigger>
                <TabsTrigger value="revenue" className="text-[11px] h-7 data-[state=active]:bg-green-600 data-[state=active]:text-white">Revenue</TabsTrigger>
                <TabsTrigger value="cost" className="text-[11px] h-7 data-[state=active]:bg-green-600 data-[state=active]:text-white">Cost</TabsTrigger>
              </TabsList>
            </div>

            {(Object.entries(METRICS) as [MetricKey, typeof METRICS[MetricKey]][]).map(([key, cfg]) => {
              const bVal = bRow[cfg.bKey] ?? 0;
              const oVal = oRow[cfg.oKey] ?? 0;
              const bSum = baselineSummary?.[cfg.summaryBKey] ?? 0;
              const oSum = optimalSummary?.[cfg.summaryOKey] ?? 0;

              const chartData = [
                { name: "Current", value: bVal, fill: "var(--color-baseline)" },
                { name: "Optimized", value: oVal, fill: "var(--color-optimized)" },
              ];

              return (
                <TabsContent key={key} value={key} className="p-0 animate-in fade-in duration-500">
                  <div className="px-5 py-6">
                    <div className="mb-6 h-[180px]">
                      <ChartContainer config={chartConfig} className="h-full w-full">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 10, fill: '#64748b', fontWeight: 500 }}
                          />
                          <YAxis 
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: '#94a3b8' }}
                            tickFormatter={(v) => `KES ${v >= 1000 ? (v/1000).toFixed(0) + 'k' : v}`}
                          />
                          <ChartTooltip content={<ChartTooltipContent hideLabel />} cursor={false} />
                          <Bar 
                            dataKey="value" 
                            radius={[6, 6, 0, 0]} 
                            barSize={60}
                          />
                        </BarChart>
                      </ChartContainer>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-slate-50/80 p-3 rounded-lg border border-slate-100/50">
                        <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Current {cfg.label}</p>
                        <p className="text-md font-mono font-bold text-slate-600 mt-0.5 tabular-nums">{fmt(bVal)}</p>
                      </div>
                      <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-100/50">
                        <p className="text-[9px] text-emerald-600 uppercase font-bold tracking-wider">Optimized {cfg.label}</p>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-md font-mono font-bold text-emerald-700 mt-0.5 tabular-nums">{fmt(oVal)}</p>
                          <DeltaBadge baseline={bVal} optimal={oVal} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-amber-50/30 border-t border-amber-100 py-3 px-5">
                    <div className="flex justify-between items-center">
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
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
