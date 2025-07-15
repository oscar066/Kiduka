// components/dashboard/RoleBasedDashboard.tsx
"use client";

import React from "react";
import { useRoleBasedAccess } from "@/hooks/useAuth";
import { UserRole } from "@/lib/api-client";
import { UserDashboard } from "./userDashboard";
import { AdminDashboard } from "./adminDashboard";
import { Loader2 } from "lucide-react";

export function RoleBasedDashboard() {
  const { isUser, isAdmin, isSuperAdmin, isAuthenticated } =
    useRoleBasedAccess();

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Render admin dashboard for admin and super admin users
  if (isAdmin || isSuperAdmin) {
    return <AdminDashboard />;
  }

  // Render user dashboard for regular users
  return <UserDashboard />;
}
