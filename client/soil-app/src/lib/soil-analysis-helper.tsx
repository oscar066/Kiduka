// ===== UTILITY FUNCTIONS =====
// utils/soil-analysis-helpers.ts
import {
  AlertCircle,
  Info,
  Target,
  Clock,
  Activity,
  CheckCircle,
  Star,
  Zap,
  Calendar,
  TrendingUp,
  Leaf,
  BarChart3,
} from "lucide-react";

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

export const getPriorityStyle = (priority: string) => {
  switch (priority.toLowerCase()) {
    case "high":
      return {
        color: "text-blue-900",
        bg: "bg-blue-50",
        border: "border-blue-200",
        icon: <Star className="h-4 w-4 text-blue-600" />,
        badgeClass: "bg-blue-100 text-blue-800 border-blue-300",
      };
    case "medium":
      return {
        color: "text-amber-900",
        bg: "bg-amber-50",
        border: "border-amber-200",
        icon: <AlertCircle className="h-4 w-4 text-amber-600" />,
        badgeClass: "bg-amber-100 text-amber-800 border-amber-300",
      };
    case "low":
      return {
        color: "text-emerald-900",
        bg: "bg-emerald-50",
        border: "border-emerald-200",
        icon: <CheckCircle className="h-4 w-4 text-emerald-600" />,
        badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300",
      };
    default:
      return {
        color: "text-gray-900",
        bg: "bg-gray-50",
        border: "border-gray-200",
        icon: <Target className="h-4 w-4 text-gray-600" />,
        badgeClass: "bg-gray-100 text-gray-800 border-gray-300",
      };
  }
};

export const getTimeframeStyle = (timeframe: string) => {
  switch (timeframe.toLowerCase()) {
    case "immediate":
      return {
        color: "text-orange-600",
        icon: <Zap className="h-3 w-3" />,
        bgClass: "bg-orange-100",
      };
    case "within_week":
    case "weekly":
      return {
        color: "text-blue-600",
        icon: <Calendar className="h-3 w-3" />,
        bgClass: "bg-blue-100",
      };
    case "monthly":
      return {
        color: "text-purple-600",
        icon: <Clock className="h-3 w-3" />,
        bgClass: "bg-purple-100",
      };
    case "seasonal":
      return {
        color: "text-green-600",
        icon: <TrendingUp className="h-3 w-3" />,
        bgClass: "bg-green-100",
      };
    default:
      return {
        color: "text-gray-600",
        icon: <Clock className="h-3 w-3" />,
        bgClass: "bg-gray-100",
      };
  }
};

export const getCategoryIcon = (category: string) => {
  switch (category.toLowerCase()) {
    case "fertilizer":
      return <Leaf className="h-3 w-3" />;
    case "soil_management":
      return <BarChart3 className="h-3 w-3" />;
    case "monitoring":
      return <Activity className="h-3 w-3" />;
    case "soil_improvement":
      return <TrendingUp className="h-3 w-3" />;
    default:
      return <Target className="h-3 w-3" />;
  }
};
