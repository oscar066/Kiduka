// components/layout/RoleBasedLayout.tsx
"use client";

import React from "react";
import { useAuth } from "@/hooks/useAuth";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import UnifiedSidebar from "../UnifiedSidebar";
import { Navbar } from "../navbar";
import { Loader2, AlertCircle, Shield, ArrowLeft } from "lucide-react";

interface RoleBasedLayoutProps {
  children: React.ReactNode;
}

export function RoleBasedLayout({ children }: RoleBasedLayoutProps) {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-amber-50">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-green-500 to-amber-500 rounded-full blur-lg opacity-30"></div>
            <Loader2 className="relative h-12 w-12 animate-spin text-green-600 mx-auto" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-serif font-semibold text-green-800">
              Loading Application
            </h3>
            <p className="text-sm text-green-600 font-serif">
              Please wait while we prepare your dashboard...
            </p>
          </div>
        </div>
      </div>
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
      <div className="min-h-screen h-screen bg-gradient-to-br from-green-50 via-white to-amber-50 flex">
        <UnifiedSidebar />
        <SidebarInset className="flex flex-col flex-1 min-h-screen">
          <Navbar />
          <main className="flex-1">
            <div className="py-6">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="relative">
                  {/* Subtle background pattern */}
                  <div className="absolute inset-0 bg-gradient-to-r from-green-100/10 to-amber-100/10 rounded-3xl blur-3xl -z-10"></div>
                  <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-green-100/50">
                    <div className="p-6">{children}</div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

// Alternative layout for admin pages with additional admin context
export function AdminLayout({ children }: RoleBasedLayoutProps) {
  const { isLoading, isAuthenticated, isAdmin } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-indigo-50">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full blur-lg opacity-30"></div>
            <Loader2 className="relative h-12 w-12 animate-spin text-purple-600 mx-auto" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-serif font-semibold text-purple-800">
              Loading Admin Panel
            </h3>
            <p className="text-sm text-purple-600 font-serif">
              Preparing administrative interface...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-orange-50">
        <div className="text-center space-y-6 max-w-md mx-auto p-8">
          <div className="relative">
            <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-red-500 to-orange-500 rounded-full blur-lg opacity-30"></div>
            <AlertCircle className="relative h-16 w-16 text-red-600 mx-auto" />
          </div>
          <div className="space-y-3">
            <h3 className="text-xl font-serif font-bold text-red-800">
              Access Denied
            </h3>
            <p className="text-sm text-red-600 font-serif leading-relaxed">
              Administrative privileges are required to access this area. Please
              contact your system administrator if you believe this is an error.
            </p>
          </div>
          <div className="pt-4">
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center px-4 py-2 border border-red-300 rounded-lg text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 transition-colors duration-200"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex">
        <UnifiedSidebar />
        <SidebarInset className="flex flex-col flex-1 min-h-screen">
          <Navbar />
          {/* Admin Content Area with special styling */}
          <div className="relative overflow-hidden bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 shadow-lg">
            {/* Background pattern */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=&#39;20&#39; height=&#39;20&#39; xmlns=&#39;http://www.w3.org/2000/svg&#39;%3E%3Cdefs%3E%3Cpattern id=&#39;grid&#39; width=&#39;20&#39; height=&#39;20&#39; patternUnits=&#39;userSpaceOnUse&#39;%3E%3Cpath d=&#39;M 20 0 L 0 0 0 20&#39; fill=&#39;none&#39; stroke=&#39;white&#39; stroke-width=&#39;0.5&#39; opacity=&#39;0.1&#39;/%3E%3C/pattern%3E%3C/defs%3E%3Crect width=&#39;100%25&#39; height=&#39;100%25&#39; fill=&#39;url(%23grid)&#39;/%3E%3C/svg%3E')] opacity-20"></div>

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="py-6">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center">
                      <Shield className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div>
                    <h1 className="text-2xl font-serif font-bold text-white">
                      Administrative Panel
                    </h1>
                    <p className="text-purple-100 font-serif text-sm">
                      Manage users, monitor system activity, and configure
                      settings
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <main className="flex-1">
            <div className="py-8">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="relative">
                  {/* Enhanced background pattern for admin */}
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-100/20 to-indigo-100/20 rounded-3xl blur-3xl -z-10"></div>
                  <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-purple-200/50">
                    {/* Admin content indicator */}
                    <div className="border-b border-purple-200/50 bg-gradient-to-r from-purple-50/50 to-indigo-50/50 rounded-t-2xl">
                      <div className="px-6 py-3">
                        <div className="flex items-center space-x-2">
                          <div className="h-2 w-2 rounded-full bg-purple-500 animate-pulse"></div>
                          <span className="text-xs font-medium text-purple-700 uppercase tracking-wider font-serif">
                            Administrative Interface
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-6">{children}</div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
