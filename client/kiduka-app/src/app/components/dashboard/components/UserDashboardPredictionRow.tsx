import { Leaf } from "lucide-react";
import { type Prediction } from "./userDashboardUtils";

export function UserDashboardPredictionRow({ prediction, index }: { prediction: Prediction; index: number }) {
  return (
    <div
      key={index}
      className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-green-50/50 rounded-xl border border-gray-100 hover:border-green-200 hover:shadow-md transition-all"
    >
      <div className="flex items-center gap-4">
        <div className="p-2 bg-green-100 rounded-lg">
          <Leaf className="h-5 w-5 text-green-600" />
        </div>
        <div>
          <p className="font-semibold text-gray-900">Soil Analysis</p>
          <p className="text-sm text-gray-500">
            {new Date(prediction.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
      </div>
      <div className="text-right">
        <div className="px-3 py-1 bg-green-100 rounded-full">
          <p className="text-sm font-semibold text-green-800">
            {prediction.soil_fertility_status}
          </p>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          SHI: {prediction.soil_health_index?.toFixed(2) ?? "N/A"}
        </p>
      </div>
    </div>
  );
}
