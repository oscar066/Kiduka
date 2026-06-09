"use client";

import React from "react";
import { useRoleBasedAccess } from "@/hooks/useAuth";
import { UserDashboard } from "./userDashboard";
import { AdminDashboard } from "./adminDashboard";
import { CDCDashboard } from "./cdcDashboard";

export function RoleBasedDashboard() {
  const { isAdmin, isSuperAdmin, isCDC } = useRoleBasedAccess();

  // Render admin dashboard for admin and super admin users
  if (isAdmin || isSuperAdmin) {
    return <AdminDashboard />;
  }
  // Render CDC dashboard for CDC users
  if (isCDC) {
    return <CDCDashboard />;
  }
  // Render user dashboard for regular users
  return <UserDashboard />;
}
