import type React from "react";

export interface AdminActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  color: "green" | "amber" | "blue" | "purple" | "orange" | "gray";
}

export function AdminActionCard({
  title,
  description,
  icon,
  href,
  color,
}: AdminActionCardProps) {
  const colorClasses = {
    green: "bg-green-500 hover:bg-green-600",
    amber: "bg-amber-500 hover:bg-amber-600",
    blue: "bg-blue-500 hover:bg-blue-600",
    purple: "bg-purple-500 hover:bg-purple-600",
    orange: "bg-orange-500 hover:bg-orange-600",
    gray: "bg-gray-500 hover:bg-gray-600",
  };

  return (
    <a
      href={href}
      className="block bg-white rounded-lg shadow-lg border border-amber-200 hover:shadow-xl transition-all duration-200 hover:scale-105"
    >
      <div className="p-6">
        <div
          className={`inline-flex p-3 rounded-lg text-white ${colorClasses[color]}`}
        >
          {icon}
        </div>
        <h3 className="mt-4 text-lg font-serif font-medium text-green-800">
          {title}
        </h3>
        <p className="mt-2 text-sm text-green-600">{description}</p>
      </div>
    </a>
  );
}
