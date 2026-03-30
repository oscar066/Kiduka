// types/admin.ts

import type { AdminUserResponse } from './auth';

export interface AdminDashboardStats {
  total_users: number;
  active_users: number;
  total_predictions: number;
  flagged_predictions: number;
  recent_users: number;
  recent_predictions: number;
  users_by_role: Record<string, number>;
  predictions_by_status: Record<string, number>;
}

export interface AdminDashboardResponse {
  stats: AdminDashboardStats;
  recent_users: AdminUserResponse[];
  recent_predictions: any[];
  recent_audit_logs: any[];
}
