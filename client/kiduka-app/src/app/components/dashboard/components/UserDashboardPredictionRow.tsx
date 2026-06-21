import { Leaf } from "lucide-react";
import { type Prediction } from "./userDashboardUtils";

export function UserDashboardPredictionRow({ prediction, index }: { prediction: Prediction; index: number }) {
  return (
    <div
      key={index}
      className="flex items-center justify-between p-3.5 bg-green-50/20 rounded-xl border border-amber-100 hover:border-amber-200 hover:shadow-sm transition-all"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 bg-green-100 rounded-lg shrink-0">
          <Leaf className="h-4 w-4 text-green-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900 truncate max-w-[150px]">
            {prediction.location_name || "Soil Analysis"}
          </p>
          <p className="text-xs text-gray-500">
            {new Date(prediction.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="px-2.5 py-1 bg-green-100 rounded-full inline-block">
          <p className="text-xs font-semibold text-green-800">
            {prediction.soil_fertility_status}
          </p>
        </div>
        <p className="text-xs text-gray-400 mt-1 tabular-nums">
          SHI: {prediction.soil_health_index?.toFixed(2) ?? "N/A"}
        </p>
      </div>
    </div>
  );
}
