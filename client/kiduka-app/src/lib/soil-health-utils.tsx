import { CheckCircle, AlertTriangle, XCircle, Info, HelpCircle } from "lucide-react";

export const getStatusIcon = (status: string) => {
  switch (status.toLowerCase()) {
    case "healthy":
      return <CheckCircle className="h-6 w-6 text-green-600" />;
    case "moderately healthy":
      return <Info className="h-6 w-6 text-yellow-600" />;
    case "poor":
      return <XCircle className="h-6 w-6 text-orange-600" />;
    case "very poor":
      return <XCircle className="h-6 w-6 text-red-600" />;
    default:
      return <HelpCircle className="h-6 w-6 text-gray-600" />;
  }
};

export const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case "healthy":
      return "bg-green-100 text-green-800 border-green-200";
    case "moderately healthy":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "poor":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "very poor":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

export const getSHIColor = (shi: number) => {
  if (shi >= 3.5) return "text-green-600";
  if (shi >= 2.5) return "text-yellow-600";
  if (shi >= 1.5) return "text-orange-600";
  return "text-red-600";
};

export const getPhStatus = (ph: number) => {
  if (ph < 6.0) return { text: "Acidic", color: "text-orange-600" };
  if (ph > 7.5) return { text: "Alkaline", color: "text-blue-600" };
  return { text: "Neutral", color: "text-green-600" };
};

export const getNutrientStatusColor = (isMLEstimate: boolean, status: string, mlLabel?: string) => {
  if (isMLEstimate && mlLabel) {
    const s = mlLabel.toLowerCase();
    if (s.includes("very poor")) return "text-red-700";
    if (s.includes("poor")) return "text-red-500";
    if (s.includes("moderately")) return "text-yellow-600";
    if (s.includes("healthy")) return "text-green-600";
  }

  switch (status) {
    case "low": return "text-red-600";
    case "high": return "text-blue-600";
    case "optimal": return "text-green-600";
    default: return "text-gray-600";
  }
};

export const getNutrientProgressColor = (isMLEstimate: boolean, status: string, mlLabel?: string) => {
  if (isMLEstimate && mlLabel) {
    const s = mlLabel.toLowerCase();
    if (s.includes("very poor")) return "[&>div]:bg-red-700";
    if (s.includes("poor")) return "[&>div]:bg-red-500";
    if (s.includes("moderately")) return "[&>div]:bg-yellow-500";
    if (s.includes("healthy")) return "[&>div]:bg-green-500";
  }

  switch (status) {
    case "low": return "[&>div]:bg-red-500";
    case "high": return "[&>div]:bg-blue-500";
    case "optimal": return "[&>div]:bg-green-500";
    default: return "[&>div]:bg-gray-500";
  }
};

export const getNutrientStatusText = (isMLEstimate: boolean, status: string, mlLabel?: string) => {
  if (isMLEstimate && mlLabel) return mlLabel;
  
  switch (status) {
    case "low": return "Below Optimal";
    case "high": return "High / Excess";
    case "optimal": return "Optimal Range";
    default: return "Unknown";
  }
};
