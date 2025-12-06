"use client";

import React, { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useRoleBasedAccess, usePermission } from "@/hooks/useAuth";
import { UserRole } from "@/lib/api-client";
import { Loader2, ShieldX, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RoleGuardProps {
  children: ReactNode;
  requiredRole?: UserRole;
  requiredPermission?: string;
  fallback?: ReactNode;
  showError?: boolean;
}

export function RoleGuard({
  children,
  requiredRole,
  requiredPermission,
  fallback,
  showError = true,
}: RoleGuardProps) {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();
  const { canAccess } = useRoleBasedAccess();

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  // Check authentication
  if (!isAuthenticated) {
    if (fallback) return <>{fallback}</>;

    if (showError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center min-h-[50vh]">
          <div className="p-4 bg-red-50 rounded-full mb-4">
            <ShieldX className="h-12 w-12 text-red-500" />
          </div>
          <h3 className="text-2xl font-serif font-bold text-gray-900 mb-2">
            Authentication Required
          </h3>
          <p className="text-gray-600 mb-8 max-w-md">
            Your session has expired or you are not logged in. Please sign in to access this content.
          </p>
          <Button 
            onClick={() => router.push("/auth/login")}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold px-8 py-2 h-12 shadow-lg hover:shadow-xl transition-all"
          >
            Sign In
          </Button>
        </div>
      );
    }

    return null;
  }

  // Check role-based access
  if (requiredRole) {
    const roleHierarchy = {
      [UserRole.USER]: 0,
      [UserRole.ADMIN]: 1,
      [UserRole.SUPER_ADMIN]: 2,
    };

    const userLevel = user?.role ? roleHierarchy[user.role] : -1;
    const requiredLevel = roleHierarchy[requiredRole];

    if (userLevel < requiredLevel) {
      if (fallback) return <>{fallback}</>;

      if (showError) {
        return (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Insufficient Permissions
            </h3>
            <p className="text-gray-600">
              You don't have the required role to access this content.
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Required: {requiredRole}, Your role: {user?.role}
            </p>
          </div>
        );
      }

      return null;
    }
  }

  // Check permission-based access
  if (requiredPermission) {
    const hasPermission = canAccess(requiredPermission as any);

    if (!hasPermission) {
      if (fallback) return <>{fallback}</>;

      if (showError) {
        return (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Access Denied
            </h3>
            <p className="text-gray-600">
              You don't have permission to access this content.
            </p>
          </div>
        );
      }

      return null;
    }
  }

  return <>{children}</>;
}

// Admin-only component wrapper
interface AdminOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
  showError?: boolean;
}

export function AdminOnly({
  children,
  fallback,
  showError = true,
}: AdminOnlyProps) {
  return (
    <RoleGuard
      requiredRole={UserRole.ADMIN}
      fallback={fallback}
      showError={showError}
    >
      {children}
    </RoleGuard>
  );
}

// Super Admin only component wrapper
export function SuperAdminOnly({
  children,
  fallback,
  showError = true,
}: AdminOnlyProps) {
  return (
    <RoleGuard
      requiredRole={UserRole.SUPER_ADMIN}
      fallback={fallback}
      showError={showError}
    >
      {children}
    </RoleGuard>
  );
}

// Permission-based component wrapper
interface PermissionGuardProps {
  children: ReactNode;
  permission: string;
  fallback?: ReactNode;
  showError?: boolean;
}

export function PermissionGuard({
  children,
  permission,
  fallback,
  showError = true,
}: PermissionGuardProps) {
  return (
    <RoleGuard
      requiredPermission={permission}
      fallback={fallback}
      showError={showError}
    >
      {children}
    </RoleGuard>
  );
}

// Conditional rendering based on role
interface ConditionalRenderProps {
  condition: "isUser" | "isAdmin" | "isSuperAdmin" | "isAuthenticated";
  children: ReactNode;
  fallback?: ReactNode;
}

export function ConditionalRender({
  condition,
  children,
  fallback = null,
}: ConditionalRenderProps) {
  const { isUser, isAdmin, isSuperAdmin, isAuthenticated } =
    useRoleBasedAccess();

  const conditionMap = {
    isUser,
    isAdmin,
    isSuperAdmin,
    isAuthenticated,
  };

  return conditionMap[condition] ? <>{children}</> : <>{fallback}</>;
}

// Role-based navigation wrapper
interface RoleBasedNavProps {
  children: ReactNode;
  userContent?: ReactNode;
  adminContent?: ReactNode;
  superAdminContent?: ReactNode;
  guestContent?: ReactNode;
}

export function RoleBasedNav({
  children,
  userContent,
  adminContent,
  superAdminContent,
  guestContent,
}: RoleBasedNavProps) {
  const { isUser, isAdmin, isSuperAdmin, isAuthenticated } =
    useRoleBasedAccess();

  return (
    <div>
      {children}

      {!isAuthenticated && guestContent && (
        <div className="role-content guest-content">{guestContent}</div>
      )}

      {isUser && userContent && (
        <div className="role-content user-content">{userContent}</div>
      )}

      {isAdmin && adminContent && (
        <div className="role-content admin-content">{adminContent}</div>
      )}

      {isSuperAdmin && superAdminContent && (
        <div className="role-content super-admin-content">
          {superAdminContent}
        </div>
      )}
    </div>
  );
}

// Page wrapper with role protection
interface ProtectedPageProps {
  children: ReactNode;
  requiredRole?: UserRole;
  requiredPermission?: string;
  loading?: ReactNode;
  unauthorized?: ReactNode;
}

export function ProtectedPage({
  children,
  requiredRole,
  requiredPermission,
  loading,
  unauthorized,
}: ProtectedPageProps) {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      loading || (
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )
    );
  }

  return (
    <RoleGuard
      requiredRole={requiredRole}
      requiredPermission={requiredPermission}
      fallback={unauthorized}
    >
      {children}
    </RoleGuard>
  );
}
