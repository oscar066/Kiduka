"use client";

export const dynamic = "force-dynamic";

import React from "react";
import { ProtectedPage } from "../components/auth/roleBasedGaurd";
import { RoleBasedLayout } from "../components/layout/roleBasedLayout";
import { RoleBasedDashboard } from "../components/dashboard/roleBasedDashboard";

export default function DashboardPage() {
  return (
    <ProtectedPage>
      <RoleBasedLayout>
        <RoleBasedDashboard />
      </RoleBasedLayout>
    </ProtectedPage>
  );
}
