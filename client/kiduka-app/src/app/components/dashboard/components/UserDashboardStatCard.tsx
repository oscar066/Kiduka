import type React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export interface StatCardProps {
  icon: React.ReactNode;
  iconBg: string;
  badge?: React.ReactNode;
  value: React.ReactNode;
  label: string;
  loading: boolean;
}

export function UserDashboardStatCard({ icon, iconBg, badge, value, label, loading }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-amber-200 shadow-sm hover:shadow-sm transition-all duration-200 hover:-translate-y-0.5">
      <div className="p-5">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className={`p-3 bg-gradient-to-br ${iconBg} rounded-xl`}>{icon}</div>
            {!loading && badge && <span className="text-gray-400">{badge}</span>}
          </div>
          <div className="space-y-1">
            {loading ? (
              <>
                <Skeleton className="h-7 w-20" />
                <Skeleton className="h-4 w-28" />
              </>
            ) : (
              <>
                <div className="text-2xl font-serif font-bold text-green-900 tabular-nums">{value}</div>
                <div className="text-sm text-gray-500 font-medium">{label}</div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
