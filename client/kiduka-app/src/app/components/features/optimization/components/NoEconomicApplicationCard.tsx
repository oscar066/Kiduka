import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Leaf } from "lucide-react";
import { fmt } from "./OptimizationHelpers";
import type { OptimizationOutcome } from "@/lib/api-client";

interface NoEconomicApplicationCardProps {
  outcome: OptimizationOutcome;
  summaryRow?: Record<string, number>;
}

export function NoEconomicApplicationCard({ outcome, summaryRow }: NoEconomicApplicationCardProps) {
  return (
    <Card className="bg-white border-green-200 shadow-md overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-green-50 to-amber-50 border-b border-green-200 py-4 px-5">
        <CardTitle className="flex items-center gap-2 text-green-800 text-base font-semibold">
          <div className="flex items-center justify-center h-7 w-7 rounded-full bg-green-100 border border-green-200">
            <Leaf className="h-4 w-4 text-green-600" />
          </div>
          No Fertilizer Needed
        </CardTitle>
        <CardDescription className="mt-0.5 text-xs text-gray-500">
          {outcome.message}
        </CardDescription>
      </CardHeader>

      <CardContent className="p-5 space-y-4">
        {outcome.detail && (
          <p className="text-sm text-gray-600">{outcome.detail}</p>
        )}

        {summaryRow && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-gradient-to-r from-green-50 to-amber-50 border border-amber-100 rounded-lg px-4 py-3">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">
                Baseline Returns
              </p>
              <p className="text-gray-800 font-semibold text-lg">
                {fmt(summaryRow.baseline_net_return_total)}
              </p>
            </div>
            <div className="bg-gradient-to-r from-green-50 to-amber-50 border border-amber-100 rounded-lg px-4 py-3">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">
                Budget Allocated
              </p>
              <p className="text-gray-800 font-semibold text-lg">
                {fmt(summaryRow.budget_currency)}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
