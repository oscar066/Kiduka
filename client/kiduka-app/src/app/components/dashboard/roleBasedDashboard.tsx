// components/dashboard/RoleBasedDashboard.tsx
"use client";

import React from "react";
import { useRoleBasedAccess } from "@/hooks/useAuth";
import { UserRole } from "@/lib/api-client";
import { UserDashboard } from "./userDashboard";
import { AdminDashboard } from "./adminDashboard";
import { Loader2 } from "lucide-react";

export function RoleBasedDashboard() {
  const { isUser, isAdmin, isSuperAdmin } = useRoleBasedAccess();

  // Render admin dashboard for admin and super admin users
  if (isAdmin || isSuperAdmin) {
    return <AdminDashboard />;
  }

  // Render user dashboard for regular users (or loading/empty state will be handled by the dashboard itself)
  return <UserDashboard />;
}
