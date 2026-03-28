import type React from "react";
import { Card, CardContent } from "@/components/ui/card";

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
    <Card className="border-amber-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className={`p-4 bg-gradient-to-br ${iconBg} rounded-2xl`}>{icon}</div>
            {!loading && badge && <span className="text-gray-400">{badge}</span>}
          </div>
          <div>
            {loading ? (
              <>
                <div className="h-7 w-20 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-28 bg-gray-200 rounded animate-pulse mt-2" />
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-gray-900">{value}</div>
                <div className="text-sm text-gray-500 font-medium mt-1">{label}</div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
