"use client";

import { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import UnifiedSidebar from "./UnifiedSidebar";
import { Navbar } from "./navbar";
import { Loader2, AlertCircle, Shield, ArrowLeft } from "lucide-react";

interface RoleBasedLayoutProps {
  children: ReactNode;
}

// Layout for regular authenticated users
export function RoleBasedLayout({ children }: RoleBasedLayoutProps) {
  const { isLoading, isAuthenticated } = useAuth();
  const { Skeleton } = require("@/components/ui/skeleton");

  if (isLoading) {
    return (
      <SidebarProvider>
        <div className="h-screen w-full flex bg-gradient-to-br from-green-50 via-white to-amber-50">
          <UnifiedSidebar />
          <SidebarInset className="flex-1 flex flex-col">
            <Navbar />
            <main className="flex-1 overflow-y-auto p-6">
              <div className="space-y-8 animate-pulse">
                <div className="space-y-2">
                  <Skeleton className="h-10 w-64" />
                  <Skeleton className="h-6 w-96" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-32 w-full rounded-xl" />
                  ))}
                </div>
                <div className="space-y-4">
                  <Skeleton className="h-8 w-48" />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-48 w-full rounded-xl" />
                    ))}
                  </div>
                </div>
              </div>
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-amber-50">
        <div className="text-center space-y-4 max-w-md mx-auto p-6">
          <div className="relative">
            <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-amber-500 to-red-500 rounded-full blur-lg opacity-30"></div>
            <AlertCircle className="relative h-12 w-12 text-amber-600 mx-auto" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-serif font-semibold text-gray-800">
              Authentication Required
            </h3>
            <p className="text-sm text-gray-600 font-serif">
              Redirecting you to the login page...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="h-screen w-full flex bg-gradient-to-br from-green-50 via-white to-amber-50">
        <UnifiedSidebar />
        <SidebarInset className="flex-1 flex flex-col">
          <Navbar />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

// Layout for Admin and Super Admin users
export function AdminLayout({ children }: RoleBasedLayoutProps) {
  const { isLoading, isAuthenticated, isAdmin } = useAuth();
  const { Skeleton } = require("@/components/ui/skeleton");

  if (isLoading) {
    return (
      <SidebarProvider>
        <div className="h-screen w-full flex bg-gradient-to-br from-green-50 via-white to-amber-50">
          <UnifiedSidebar />
          <SidebarInset className="flex-1 flex flex-col">
            <Navbar />
            <main className="flex-1 overflow-y-auto p-6 lg:p-8">
              <div className="space-y-8 animate-pulse">
                <div className="space-y-2">
                  <Skeleton className="h-10 w-64" />
                  <Skeleton className="h-6 w-96" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-32 w-full rounded-xl" />
                  ))}
                </div>
                <div className="space-y-4">
                  <Skeleton className="h-8 w-48" />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-48 w-full rounded-xl" />
                    ))}
                  </div>
                </div>
              </div>
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-orange-50">
        <div className="text-center space-y-6 max-w-md mx-auto p-8">
          <AlertCircle className="relative h-16 w-16 text-red-600 mx-auto" />
          <h3 className="text-xl font-serif font-bold text-red-800">
            Access Denied
          </h3>
          <p className="text-sm text-red-600 font-serif leading-relaxed">
            Administrative privileges are required to access this area.
          </p>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center px-4 py-2 border border-red-300 rounded-lg text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="h-screen w-full flex bg-gradient-to-br from-green-50 via-white to-amber-50">
        <UnifiedSidebar />
        <SidebarInset className="flex-1 flex flex-col">
          <Navbar />
          <main className="flex-1 overflow-y-auto p-6 lg:p-8">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
