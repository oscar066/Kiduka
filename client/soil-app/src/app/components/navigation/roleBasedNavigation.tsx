// components/navigation/RoleBasedNavigation.tsx
"use client";

import React, { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth, useRoleBasedAccess } from "@/hooks/useAuth";
import { UserRole } from "@/lib/api-client";
import {
  Home,
  Leaf,
  History,
  User,
  Users,
  BarChart3,
  Settings,
  Shield,
  FileText,
  MapPin,
  TrendingUp,
  Menu,
  X,
  LogOut,
  ChevronDown,
} from "lucide-react";
import navigationItems, { NavItem } from "./navigationItems";


export function RoleBasedNavigation() {
  const { user, logout } = useAuth();
  const { isAdmin, isSuperAdmin, canAccess } = useRoleBasedAccess();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);

  // Filter navigation items based on user role
  const filteredNavItems = navigationItems.filter((item) => {
    if (!item.roles) return true;
    return item.roles.includes(user?.role as UserRole);
  });

  const handleLogout = async () => {
    await logout();
    setMobileMenuOpen(false);
  };

  const isActiveRoute = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard" || pathname === "/";
    }
    return pathname.startsWith(href);
  };

  const NavItemComponent = ({
    item,
    mobile = false,
  }: {
    item: NavItem;
    mobile?: boolean;
  }) => {
    const hasChildren = item.children && item.children.length > 0;
    const isActive = isActiveRoute(item.href);
    const isAdminSection = item.label === "Admin";

    if (hasChildren && isAdminSection) {
      return (
        <div className="relative">
          <button
            onClick={() => setAdminMenuOpen(!adminMenuOpen)}
            className={`
              flex items-center w-full px-3 py-2 text-sm font-medium rounded-md transition-colors
              ${
                isActive
                  ? "bg-indigo-100 text-indigo-700"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }
            `}
          >
            {item.icon}
            <span className="ml-3">{item.label}</span>
            <ChevronDown
              className={`ml-auto h-4 w-4 transition-transform ${
                adminMenuOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {adminMenuOpen && (
            <div
              className={`${
                mobile
                  ? "pl-4 mt-2"
                  : "absolute left-0 top-full mt-1 w-48 bg-white shadow-lg rounded-md border"
              } z-10`}
            >
              {item.children?.map((child) => (
                <a
                  key={child.href}
                  href={child.href}
                  onClick={() => mobile && setMobileMenuOpen(false)}
                  className={`
                    flex items-center px-3 py-2 text-sm rounded-md transition-colors
                    ${
                      isActiveRoute(child.href)
                        ? "bg-indigo-50 text-indigo-700"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }
                  `}
                >
                  {child.icon}
                  <span className="ml-3">{child.label}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <a
        href={item.href}
        onClick={() => mobile && setMobileMenuOpen(false)}
        className={`
          flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
          ${
            isActive
              ? "bg-indigo-100 text-indigo-700"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          }
        `}
      >
        {item.icon}
        <span className="ml-3">{item.label}</span>
      </a>
    );
  };

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:bg-white lg:border-r lg:border-gray-200">
        <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto">
          {/* Logo */}
          <div className="flex items-center flex-shrink-0 px-4">
            <Leaf className="h-8 w-8 text-green-500" />
            <span className="ml-2 text-xl font-bold text-gray-900">
              SoilAnalyzer
            </span>
          </div>

          {/* User Info */}
          <div className="mt-8 px-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-indigo-500 flex items-center justify-center">
                  <span className="text-sm font-medium text-white">
                    {user?.username?.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">
                  {user?.full_name || user?.username}
                </p>
                <p className="text-xs text-gray-500">
                  {user?.role?.replace("_", " ")}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="mt-8 flex-1 px-4 space-y-1">
            {filteredNavItems.map((item) => (
              <NavItemComponent key={item.href} item={item} />
            ))}
          </nav>

          {/* Logout Button */}
          <div className="px-4 py-4 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-600 rounded-md hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span className="ml-3">Sign Out</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <div className="lg:hidden">
        {/* Mobile Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <Leaf className="h-6 w-6 text-green-500" />
            <span className="ml-2 text-lg font-bold text-gray-900">
              SoilAnalyzer
            </span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="fixed inset-0 bg-black bg-opacity-25"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="fixed top-0 left-0 bottom-0 w-64 bg-white border-r border-gray-200 overflow-y-auto">
              <div className="flex flex-col h-full">
                {/* Mobile Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                  <div className="flex items-center">
                    <Leaf className="h-6 w-6 text-green-500" />
                    <span className="ml-2 text-lg font-bold text-gray-900">
                      SoilAnalyzer
                    </span>
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 rounded-md text-gray-600 hover:text-gray-900"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                {/* User Info */}
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-indigo-500 flex items-center justify-center">
                        <span className="text-sm font-medium text-white">
                          {user?.username?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">
                        {user?.full_name || user?.username}
                      </p>
                      <p className="text-xs text-gray-500">
                        {user?.role?.replace("_", " ")}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Mobile Navigation Items */}
                <nav className="flex-1 p-4 space-y-1">
                  {filteredNavItems.map((item) => (
                    <NavItemComponent key={item.href} item={item} mobile />
                  ))}
                </nav>

                {/* Mobile Logout */}
                <div className="p-4 border-t border-gray-200">
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-600 rounded-md hover:text-gray-900 hover:bg-gray-100 transition-colors"
                  >
                    <LogOut className="h-5 w-5" />
                    <span className="ml-3">Sign Out</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
