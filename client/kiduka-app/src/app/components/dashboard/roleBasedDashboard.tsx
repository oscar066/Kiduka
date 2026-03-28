"use client";

import React from "react";
import { useRoleBasedAccess } from "@/hooks/useAuth";
import { UserDashboard } from "./userDashboard";
import { AdminDashboard } from "./adminDashboard";

export function RoleBasedDashboard() {
  const { isAdmin, isSuperAdmin } = useRoleBasedAccess();

  // Render admin dashboard for admin and super admin users
  if (isAdmin || isSuperAdmin) {
    return <AdminDashboard />;
  }
  // Render user dashboard for regular users
  return <UserDashboard />;
}
