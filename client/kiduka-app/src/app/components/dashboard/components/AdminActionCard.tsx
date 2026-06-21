import type React from "react";

export interface AdminActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  color: "green" | "amber" | "blue" | "purple" | "orange" | "gray";
  disabled?: boolean;
}

const iconBg: Record<AdminActionCardProps["color"], string> = {
  green: "bg-green-100 text-green-700",
  amber: "bg-amber-100 text-amber-700",
  blue: "bg-blue-100 text-blue-700",
  purple: "bg-purple-100 text-purple-700",
  orange: "bg-orange-100 text-orange-700",
  gray: "bg-gray-100 text-gray-600",
};

export function AdminActionCard({
  title,
  description,
  icon,
  href,
  color,
  disabled,
}: AdminActionCardProps) {
  return (
    <a
      href={disabled ? undefined : href}
      aria-disabled={disabled}
      className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
        disabled
          ? "opacity-50 cursor-not-allowed bg-white border-amber-100"
          : "bg-white border-amber-200 hover:bg-amber-50 hover:border-amber-300 hover:shadow-sm cursor-pointer"
      }`}
    >
      <div className={`p-2 rounded-lg shrink-0 ${iconBg[color]}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-sm font-medium font-serif text-green-800 leading-tight">{title}</p>
        <p className="text-xs text-green-600 truncate">{description}</p>
      </div>
    </a>
  );
}
