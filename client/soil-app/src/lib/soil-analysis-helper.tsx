// ===== UTILITY FUNCTIONS =====
// utils/soil-analysis-helpers.ts
import {
  AlertTriangle,
  AlertCircle,
  Info,
  Target,
  Clock,
  Activity,
  CheckCircle,
} from "lucide-react";

export const getPriorityStyle = (priority: string) => {
  switch (priority.toLowerCase()) {
    case "high":
      return {
        color: "text-red-700",
        bg: "bg-red-50",
        border: "border-red-200",
        icon: <AlertTriangle className="h-4 w-4 text-red-600" />,
      };
    case "medium":
      return {
        color: "text-yellow-700",
        bg: "bg-yellow-50",
        border: "border-yellow-200",
        icon: <AlertCircle className="h-4 w-4 text-yellow-600" />,
      };
    case "low":
      return {
        color: "text-blue-700",
        bg: "bg-blue-50",
        border: "border-blue-200",
        icon: <Info className="h-4 w-4 text-blue-600" />,
      };
    default:
      return {
        color: "text-gray-700",
        bg: "bg-gray-50",
        border: "border-gray-200",
        icon: <Info className="h-4 w-4 text-gray-600" />,
      };
  }
};

export const getTimeframeStyle = (timeframe: string) => {
  switch (timeframe.toLowerCase()) {
    case "immediate":
      return {
        color: "text-red-600",
        icon: <Target className="h-3 w-3" />,
      };
    case "within_week":
      return {
        color: "text-orange-600",
        icon: <Clock className="h-3 w-3" />,
      };
    case "seasonal":
      return {
        color: "text-yellow-600",
        icon: <Activity className="h-3 w-3" />,
      };
    case "ongoing":
      return {
        color: "text-blue-600",
        icon: <CheckCircle className="h-3 w-3" />,
      };
    default:
      return {
        color: "text-gray-600",
        icon: <Clock className="h-3 w-3" />,
      };
  }
};

export const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case "excellent":
      return "text-green-700 bg-green-100";
    case "good":
      return "text-emerald-700 bg-emerald-100";
    case "fair":
      return "text-yellow-700 bg-yellow-100";
    case "poor":
      return "text-red-700 bg-red-100";
    default:
      return "text-gray-700 bg-gray-100";
  }
};
