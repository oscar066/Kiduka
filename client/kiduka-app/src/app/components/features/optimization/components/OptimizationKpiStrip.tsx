import { fmt } from "./OptimizationHelpers";

interface OptimizationKpiStripProps {
  summaryRow: Record<string, number>;
}

export function OptimizationKpiStrip({ summaryRow }: OptimizationKpiStripProps) {
  const budgetPct = ((summaryRow.budget_used / summaryRow.budget_currency) * 100).toFixed(1);
  const improvement = summaryRow.net_return_improvement;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

      {/* Hero KPI — net returns */}
      <div className="bg-green-800 rounded-xl shadow-sm p-5 text-white">
        <p className="text-green-200 uppercase text-xs tracking-wider font-semibold">
          Net Economic Returns
        </p>
        <p className="text-4xl font-bold mt-2 leading-none tabular-nums">
          {fmt(summaryRow.feasible_net_return_total)}
        </p>
        <p className="text-sm text-green-300 mt-2">
          Total value after deducting fertilizer costs
        </p>
      </div>

      {/* Return vs baseline */}
      <div className="bg-white rounded-xl border border-amber-200 shadow-sm p-5">
        <p className="text-gray-500 uppercase text-xs tracking-wider font-semibold">
          Return vs Baseline
        </p>
        <p className={`text-3xl font-bold mt-2 leading-none tabular-nums ${improvement >= 0 ? "text-green-600" : "text-red-600"}`}>
          {improvement >= 0 ? "+" : ""}{fmt(improvement)}
        </p>
        <p className="text-sm text-gray-400 mt-2">
          Net gain over no-fertilizer scenario
        </p>
      </div>

      {/* Fertilizer cost */}
      <div className="bg-white rounded-xl border border-amber-200 shadow-sm p-5">
        <p className="text-gray-500 uppercase text-xs tracking-wider font-semibold">
          Fertilizer Cost
        </p>
        <p className="text-3xl font-bold mt-2 leading-none text-gray-800 tabular-nums">
          {fmt(summaryRow.budget_used)}
        </p>
        <div className="mt-3 space-y-1.5">
          <div className="flex justify-between items-center text-xs font-medium text-amber-700 bg-amber-50 border border-amber-100 px-2.5 py-1.5 rounded-lg">
            <span>Budget used</span>
            <span>{budgetPct}%</span>
          </div>
          <div className="flex justify-between items-center text-xs text-gray-400 px-1">
            <span>Remaining</span>
            <span className="font-medium text-gray-600 tabular-nums">{fmt(summaryRow.budget_remaining)}</span>
          </div>
        </div>
      </div>

    </div>
  );
}
