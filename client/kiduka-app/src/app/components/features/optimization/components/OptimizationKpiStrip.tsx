import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { fmt } from "./OptimizationHelpers";

interface OptimizationKpiStripProps {
  summaryRow: Record<string, number>;
}

export function OptimizationKpiStrip({ summaryRow }: OptimizationKpiStripProps) {
  const budgetPct = ((summaryRow.budget_used / summaryRow.budget_currency) * 100).toFixed(1);
  const improvement = summaryRow.net_return_improvement;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="bg-green-800 text-white shadow-lg border-none">
        <CardHeader className="pb-2 px-5 pt-5">
          <CardDescription className="text-green-200 uppercase text-xs tracking-wider font-semibold">
            Net Economic Returns
          </CardDescription>
          <CardTitle className="text-4xl">
            {fmt(summaryRow.feasible_net_return_total)}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-green-300 px-5 pb-5">
          Total value after deducting fertilizer costs
        </CardContent>
      </Card>

      <Card className="bg-white border-green-200 shadow-md">
        <CardHeader className="pb-2 px-5 pt-5">
          <CardDescription className="text-gray-500 uppercase text-xs tracking-wider font-semibold">
            Return vs Baseline
          </CardDescription>
          <CardTitle className={`text-3xl ${improvement >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {improvement >= 0 ? "+" : ""}
            {fmt(improvement)}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5 text-sm text-gray-500">
          Net gain over no-fertilizer scenario
        </CardContent>
      </Card>

      <Card className="bg-white border-amber-200 shadow-md">
        <CardHeader className="pb-2 px-5 pt-5">
          <CardDescription className="text-gray-500 uppercase text-xs tracking-wider font-semibold">
            Fertilizer Cost
          </CardDescription>
          <CardTitle className="text-3xl text-gray-800">
            {fmt(summaryRow.budget_used)}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5 space-y-2">
          <div className="flex justify-between items-center text-sm font-medium text-amber-700 bg-amber-50 border border-amber-100 p-2 rounded-md">
            <span>Budget Used</span>
            <span>{budgetPct}%</span>
          </div>
          <div className="flex justify-between items-center text-xs text-gray-500 px-1">
            <span>Remaining</span>
            <span className="font-medium text-gray-700">{fmt(summaryRow.budget_remaining)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
