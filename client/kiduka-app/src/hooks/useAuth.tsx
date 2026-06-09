// hooks/useAuth.tsx
"use client";

import {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
  ReactNode,
} from "react";
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
  can_access_cdc: boolean;
}

interface AuthState {
  user: UserResponse | null;
  permissions: AuthPermissions | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isCDC: boolean;
  token: string | null;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  checkAdminAccess: () => Promise<boolean>;
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
  can_access_cdc: false,
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
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
  const isCDC = user?.role === UserRole.CDC;

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
        can_access_cdc:
          userData.role === UserRole.CDC ||
          userData.role === UserRole.SUPER_ADMIN,
      };

      setPermissions(userPermissions);
    } catch (error) {
      console.error("Failed to load user data:", error);
      setUser(null);
      setPermissions(defaultPermissions);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

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

  const refreshUser = useCallback(async () => {
    await loadUserData();
  }, [loadUserData]);

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

  return (
    <AuthContext.Provider
      value={{
        user,
        permissions: permissions || defaultPermissions,
        isLoading: status === "loading" || isLoading,
        isAuthenticated,
        isAdmin,
        isSuperAdmin,
        isCDC,
        token,
        logout,
        refreshUser,
        checkAdminAccess,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
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
      let allowed = false;
      const userRole = user?.role;

      if (requiredRole === UserRole.CDC) {
        allowed = userRole === UserRole.CDC || userRole === UserRole.SUPER_ADMIN;
      } else if (requiredRole === UserRole.ADMIN) {
        allowed = userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN;
      } else if (requiredRole === UserRole.SUPER_ADMIN) {
        allowed = userRole === UserRole.SUPER_ADMIN;
      } else if (requiredRole === UserRole.USER) {
        allowed = !!userRole;
      }

      if (!allowed) {
        router.push("/unauthorized");
        return;
      }
    }
  }, [isLoading, isAuthenticated, user?.role, requiredRole, router, redirectTo]);

  const computeHasRequiredRole = () => {
    if (!user?.role) return false;
    if (!requiredRole) return true;
    if (user.role === requiredRole) return true;
    if (requiredRole === UserRole.CDC) {
      return user.role === UserRole.CDC || user.role === UserRole.SUPER_ADMIN;
    }
    if (requiredRole === UserRole.ADMIN) {
      return user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;
    }
    if (requiredRole === UserRole.USER) return true;
    return false;
  };

  return {
    isLoading,
    isAuthenticated,
    hasRequiredRole: computeHasRequiredRole(),
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
    isCDC: user?.role === UserRole.CDC,
    isAuthenticated,
    permissions,
    canAccess: (requiredPermission: keyof AuthPermissions) =>
      permissions?.[requiredPermission] || false,
  };
}
