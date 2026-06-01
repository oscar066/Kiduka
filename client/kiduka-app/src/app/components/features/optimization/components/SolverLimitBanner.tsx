import { Card, CardContent } from "@/components/ui/card";
import { TriangleAlert } from "lucide-react";
import type { OptimizationOutcome } from "@/lib/api-client";

interface SolverLimitBannerProps {
  outcome: OptimizationOutcome;
}

export function SolverLimitBanner({ outcome }: SolverLimitBannerProps) {
  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardContent className="p-4 flex items-start gap-3">
        <TriangleAlert className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-amber-900">{outcome.message}</p>
          {outcome.detail && (
            <p className="text-xs text-amber-700 mt-0.5">{outcome.detail}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
