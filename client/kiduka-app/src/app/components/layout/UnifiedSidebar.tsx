"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, ChevronDown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSession } from "next-auth/react";
import navigationItems, { NavItem } from "../navigation/navigationItems";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { UserRole } from "@/types/auth";

const ROLE_LABELS: Record<string, string> = {
  [UserRole.USER]: "Farmer",
  [UserRole.ADMIN]: "Admin",
  [UserRole.SUPER_ADMIN]: "Super Admin",
  [UserRole.CDC]: "CDC Officer",
};

function filterNavItems(items: NavItem[], userRole: UserRole | undefined): NavItem[] {
  return items
    .filter((item) => !item.roles || (userRole && item.roles.includes(userRole)))
    .map((item) => ({
      ...item,
      children: item.children ? filterNavItems(item.children, userRole) : undefined,
    }));
}

export default function UnifiedSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { data: session } = useSession();
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});

  const userRole = user?.role as UserRole | undefined;
  const filteredNav = filterNavItems(navigationItems, userRole);

  const flatItems = filteredNav.filter((item) => !item.children || item.children.length === 0);
  const groupItems = filteredNav.filter((item) => item.children && item.children.length > 0);

  const isActiveRoute = (url: string) => {
    if (url === "#") return false;
    if (url === "/dashboard") return pathname === "/dashboard" || pathname === "/";
    return pathname.startsWith(url);
  };

  const handleToggleSubmenu = (label: string) => {
    setOpenSubmenus((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const getUserInitials = () => {
    const name = user?.full_name || session?.user?.name;
    if (name) return name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
    const username = user?.username || session?.user?.username;
    if (username) return username.slice(0, 2).toUpperCase();
    return "U";
  };

  const displayName = user?.full_name || user?.username || session?.user?.name || "User";
  const roleLabel = userRole ? ROLE_LABELS[userRole] ?? userRole : "";

  return (
    <Sidebar className="border-r border-amber-200 bg-gradient-to-b from-green-50 to-amber-50">

      {/* Header */}
      <SidebarHeader className="h-16 flex items-center border-b border-amber-200 px-2">
        <Link
          href="/dashboard"
          className="flex items-center w-full justify-start gap-3 hover:opacity-80 transition-opacity px-2"
        >
          <div className="flex h-8 w-8 bg-white rounded-md items-center justify-center overflow-hidden border border-amber-200">
            <img src="/images/kiduka_logo.png" alt="Kiduka Logo" className="h-full w-full object-cover" />
          </div>
          <div>
            <h2 className="text-lg font-serif font-semibold text-green-800">Kiduka</h2>
            <p className="text-xs text-green-600">Agricultural Analytics</p>
          </div>
        </Link>
      </SidebarHeader>

      {/* Nav */}
      <SidebarContent className="p-2">

        {/* Flat items — single group, no gaps between each item */}
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {flatItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActiveRoute(item.href)}
                    className="h-10 text-green-800 font-semibold data-[active=true]:bg-green-100 data-[active=true]:text-green-800 hover:bg-green-50 hover:text-green-800"
                  >
                    <Link href={item.href} className="flex items-center gap-2">
                      {item.icon}
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Collapsible groups */}
        {groupItems.map((item) => (
          <SidebarGroup key={item.label} className="mt-1">
            <SidebarGroupLabel
              className="text-green-700 font-semibold flex items-center justify-between cursor-pointer hover:text-green-800"
              onClick={() => handleToggleSubmenu(item.label)}
            >
              <span className="flex items-center gap-2">
                {item.icon} {item.label}
              </span>
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform duration-200 ${
                  openSubmenus[item.label] ? "rotate-180" : ""
                }`}
              />
            </SidebarGroupLabel>

            {openSubmenus[item.label] && item.children && item.children.length > 0 && (
              <SidebarGroupContent className="ml-2 pl-3 border-l border-amber-200">
                <SidebarMenu>
                  {item.children.map((child) => (
                    <SidebarMenuItem key={child.label}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActiveRoute(child.href)}
                        className="text-green-800 font-semibold data-[active=true]:bg-green-100 data-[active=true]:text-green-800 hover:bg-green-50 hover:text-green-800"
                      >
                        <Link href={child.href} className="flex items-center gap-2">
                          {child.icon}
                          <span>{child.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            )}
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="border-t border-amber-200 p-3">
        {/* User info */}
        <div className="flex items-center gap-2.5 px-2 py-2 mb-2 rounded-lg bg-white/60 border border-amber-100">
          <Avatar className="h-7 w-7 shrink-0">
            <AvatarImage src={session?.user?.image || undefined} alt={displayName} />
            <AvatarFallback className="bg-green-100 text-green-800 text-[10px] font-bold">
              {getUserInitials()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-green-800 truncate leading-tight">{displayName}</p>
            {roleLabel && (
              <span className="text-[10px] font-medium text-green-600">{roleLabel}</span>
            )}
          </div>
        </div>

        {/* Sign out */}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="hover:bg-green-50 text-green-700 hover:text-green-800"
            >
              <button className="flex items-center gap-2 w-full" type="button" onClick={logout}>
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
