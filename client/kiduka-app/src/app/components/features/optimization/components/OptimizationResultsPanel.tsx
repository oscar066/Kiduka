import { Badge } from "@/components/ui/badge";
import { CheckCircle2, TriangleAlert, Leaf } from "lucide-react";
import type { OptimizationResult } from "@/lib/api-client";
import { NoEconomicApplicationCard } from "./NoEconomicApplicationCard";
import { SolverLimitBanner } from "./SolverLimitBanner";
import { OptimizationKpiStrip } from "./OptimizationKpiStrip";
import { CropYieldTable } from "./CropYieldTable";
import { ApplicationRates } from "./ApplicationRates";
import { BaselineVsOptimal } from "./BaselineVsOptimal";

interface OptimizationResultsPanelProps {
  results: OptimizationResult;
  cropNames: string[];
  selectedCrop: string;
  onSelectCrop: (name: string) => void;
}

export function OptimizationResultsPanel({
  results,
  cropNames,
  selectedCrop,
  onSelectCrop,
}: OptimizationResultsPanelProps) {
  const { optimization_outcome: outcome, summary_row, baseline_rows, feasible_rows, application_rows } = results;

  return (
    <div className="mt-10 space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-500">

      {/* Header */}
      <div className="flex items-center gap-2 border-b border-green-200 pb-2">
        <h2 className="text-2xl font-serif font-bold bg-gradient-to-r from-green-800 via-emerald-600 to-green-700 bg-clip-text text-transparent">
          Optimization Results
        </h2>
        {outcome?.code === "cost_effective_application_found" && (
          <Badge variant="secondary" className="bg-green-100 text-green-800 border border-green-200 text-xs font-medium">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Recommendation Ready
          </Badge>
        )}
        {outcome?.code === "best_application_with_solver_limit" && (
          <Badge variant="secondary" className="bg-amber-100 text-amber-800 border border-amber-200 text-xs font-medium">
            <TriangleAlert className="h-3 w-3 mr-1" />
            Partial Result
          </Badge>
        )}
        {outcome?.code === "no_economic_application" && (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 border border-blue-200 text-xs font-medium">
            <Leaf className="h-3 w-3 mr-1" />
            No Fertilizer Needed
          </Badge>
        )}
      </div>

      {/* No-application outcome: replace detail panels with explanation card */}
      {outcome?.code === "no_economic_application" ? (
        <NoEconomicApplicationCard outcome={outcome} summaryRow={summary_row} />
      ) : (
        <>
          {outcome?.code === "best_application_with_solver_limit" && (
            <SolverLimitBanner outcome={outcome} />
          )}

          <OptimizationKpiStrip summaryRow={summary_row} />

          <CropYieldTable
            baselineRows={baseline_rows ?? []}
            feasibleRows={feasible_rows ?? []}
          />

          <div className="grid lg:grid-cols-2 gap-6">
            <ApplicationRates applicationRows={application_rows} />

            {baseline_rows && feasible_rows && (
              <BaselineVsOptimal
                baselineRows={baseline_rows}
                optimalRows={feasible_rows}
                baselineSummary={summary_row}
                optimalSummary={summary_row}
                cropNames={cropNames}
                selectedCrop={selectedCrop}
                onSelectCrop={onSelectCrop}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
