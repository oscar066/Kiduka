"use client";

export const dynamic = "force-dynamic";

import React from "react";
import { ProtectedPage } from "../../components/auth/roleBasedGaurd";
import { AdminLayout } from "../../components/layout/roleBasedLayout";
import { AdminDashboard } from "../../components/dashboard/adminDashboard";
import { UserRole } from "@/types/auth";

export default function AdminDashboardPage() {
  return (
    <ProtectedPage requiredRole={UserRole.ADMIN}>
      <AdminLayout>
        <AdminDashboard />
      </AdminLayout>
    </ProtectedPage>
  );
}
