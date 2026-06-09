"use client";

export const dynamic = "force-dynamic";

import { ProtectedPage } from "../../components/auth/roleBasedGaurd";
import { CDCLayout } from "../../components/layout/roleBasedLayout";
import { CDCDashboard } from "../../components/dashboard/cdcDashboard";
import { UserRole } from "@/types/auth";

export default function CDCDashboardPage() {
  return (
    <ProtectedPage requiredRole={UserRole.CDC}>
      <CDCLayout>
        <CDCDashboard />
      </CDCLayout>
    </ProtectedPage>
  );
}
