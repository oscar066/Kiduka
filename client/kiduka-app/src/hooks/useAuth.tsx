// hooks/useAuth.ts
import { useState, useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { UserRole } from "@/types/auth";
import type { UserResponse } from "@/types/auth";

import { useRouter } from "next/navigation";

interface AuthPermissions {
  can_access_admin: boolean;
  can_view_admin_panel: boolean;
  can_manage_users: boolean;
  can_view_all_predictions: boolean;
  can_view_audit_logs: boolean;
  can_manage_agrovets: boolean;
  can_create_admin_users: boolean;
  can_delete_admin_users: boolean;
}

interface AuthState {
  user: UserResponse | null;
  permissions: AuthPermissions | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  token: string | null;
}

const defaultPermissions: AuthPermissions = {
  can_access_admin: false,
  can_view_admin_panel: false,
  can_manage_users: false,
  can_view_all_predictions: false,
  can_view_audit_logs: false,
  can_manage_agrovets: false,
  can_create_admin_users: false,
  can_delete_admin_users: false,
};

export function useAuth(): AuthState & {
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  checkAdminAccess: () => Promise<boolean>;
} {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [user, setUser] = useState<UserResponse | null>(null);
  const [permissions, setPermissions] = useState<AuthPermissions | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const token = session?.accessToken || null;
  const isAuthenticated = !!session && !!user;
  const isAdmin =
    user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN;
  const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN;

  // Load user data when session is available
  const loadUserData = useCallback(async () => {
    if (!token) {
      setUser(null);
      setPermissions(defaultPermissions);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const userData = await apiClient.getCurrentUser(token);
      setUser(userData);

      // Set permissions based on role
      const userPermissions: AuthPermissions = {
        can_access_admin:
          userData.role === UserRole.ADMIN ||
          userData.role === UserRole.SUPER_ADMIN,
        can_view_admin_panel:
          userData.role === UserRole.ADMIN ||
          userData.role === UserRole.SUPER_ADMIN,
        can_manage_users:
          userData.role === UserRole.ADMIN ||
          userData.role === UserRole.SUPER_ADMIN,
        can_view_all_predictions:
          userData.role === UserRole.ADMIN ||
          userData.role === UserRole.SUPER_ADMIN,
        can_view_audit_logs:
          userData.role === UserRole.ADMIN ||
          userData.role === UserRole.SUPER_ADMIN,
        can_manage_agrovets:
          userData.role === UserRole.ADMIN ||
          userData.role === UserRole.SUPER_ADMIN,
        can_create_admin_users: userData.role === UserRole.SUPER_ADMIN,
        can_delete_admin_users: userData.role === UserRole.SUPER_ADMIN,
      };

      setPermissions(userPermissions);
    } catch (error) {
      console.error("Failed to load user data:", error);
      setUser(null);
      setPermissions(defaultPermissions);
      // Don't sign out automatically - the session might still be valid
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // Effect to load user data when session changes
  useEffect(() => {
    if (status === "loading") return;

    if (status === "authenticated" && token) {
      loadUserData();
    } else {
      setUser(null);
      setPermissions(defaultPermissions);
      setIsLoading(false);
    }
  }, [status, token, loadUserData]);

  // Logout function
  const logout = useCallback(async () => {
    try {
      await signOut({ redirect: false });
      setUser(null);
      setPermissions(defaultPermissions);
      router.push("/auth/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  }, [router]);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    await loadUserData();
  }, [loadUserData]);

  // Check admin access specifically
  const checkAdminAccess = useCallback(async (): Promise<boolean> => {
    if (!token || !isAdmin) return false;

    try {
      await apiClient.checkAdminAccess(token);
      return true;
    } catch (error) {
      console.error("Admin access check failed:", error);
      return false;
    }
  }, [token, isAdmin]);

  return {
    user,
    permissions: permissions || defaultPermissions,
    isLoading: status === "loading" || isLoading,
    isAuthenticated,
    isAdmin,
    isSuperAdmin,
    token,
    logout,
    refreshUser,
    checkAdminAccess,
  };
}

// Role-based route protection hook
export function useRoleGuard(requiredRole?: UserRole, redirectTo?: string) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.push(redirectTo || "/auth/login");
      return;
    }

    if (requiredRole && user?.role !== requiredRole) {
      // Check if user has sufficient role
      const roleHierarchy = {
        [UserRole.USER]: 0,
        [UserRole.ADMIN]: 1,
        [UserRole.SUPER_ADMIN]: 2,
      };

      const userLevel = user?.role ? roleHierarchy[user.role] : -1;
      const requiredLevel = roleHierarchy[requiredRole];

      if (userLevel < requiredLevel) {
        router.push("/unauthorized");
        return;
      }
    }
  }, [
    isLoading,
    isAuthenticated,
    user?.role,
    requiredRole,
    router,
    redirectTo,
  ]);

  return {
    isLoading,
    isAuthenticated,
    hasRequiredRole: user?.role
      ? requiredRole
        ? user.role === requiredRole ||
          (requiredRole === UserRole.ADMIN &&
            user.role === UserRole.SUPER_ADMIN)
        : true
      : false,
  };
}

// Permission-based component access
export function usePermission(permission: keyof AuthPermissions) {
  const { permissions } = useAuth();
  return permissions?.[permission] || false;
}

// Admin-only hook
export function useAdminAuth() {
  const auth = useAuth();
  const hasAdminAccess = usePermission("can_access_admin");

  return {
    ...auth,
    hasAdminAccess,
    requiresAdmin: !hasAdminAccess,
  };
}

// Custom hook for role-based component rendering
export function useRoleBasedAccess() {
  const { user, permissions, isAuthenticated } = useAuth();

  return {
    isUser: user?.role === UserRole.USER,
    isAdmin: user?.role === UserRole.ADMIN,
    isSuperAdmin: user?.role === UserRole.SUPER_ADMIN,
    isAuthenticated,
    permissions,
    canAccess: (requiredPermission: keyof AuthPermissions) =>
      permissions?.[requiredPermission] || false,
  };
}
