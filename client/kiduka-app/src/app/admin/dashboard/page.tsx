// app/admin/dashboard/page.tsx
"use client";

import React from "react";
import { ProtectedPage } from "../../components/auth/roleBasedGaurd";
import { AdminLayout } from "../../components/layout/roleBasedLayout";
import { AdminDashboard } from "../../components/dashboard/adminDashboard";
import { UserRole } from "@/lib/api-client";

export default function AdminDashboardPage() {
  return (
    <ProtectedPage requiredRole={UserRole.ADMIN}>
      <AdminLayout>
        <AdminDashboard />
      </AdminLayout>
    </ProtectedPage>
  );
}
