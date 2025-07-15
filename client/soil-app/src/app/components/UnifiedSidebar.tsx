"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import navigationItems, { NavItem } from "./navigation/navigationItems";
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
import { UserRole } from "@/lib/api-client";

function filterNavItems(
  items: NavItem[],
  userRole: UserRole | undefined
): NavItem[] {
  return items
    .filter(
      (item) => !item.roles || (userRole && item.roles.includes(userRole))
    )
    .map((item) => ({
      ...item,
      children: item.children
        ? filterNavItems(item.children, userRole)
        : undefined,
    }));
}

export default function UnifiedSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});

  const userRole = user?.role as UserRole | undefined;
  const filteredNav = filterNavItems(navigationItems, userRole);

  const isActiveRoute = (url: string) => {
    if (url === "/dashboard") {
      return pathname === "/dashboard" || pathname === "/";
    }
    return pathname.startsWith(url);
  };

  const handleToggleSubmenu = (title: string) => {
    setOpenSubmenus((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <Sidebar className="border-r border-amber-200 bg-gradient-to-b from-green-50 to-amber-50">
      <SidebarHeader className="border-b border-amber-200 p-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-600">
            {/* App logo/icon */}
            {filteredNav[0]?.icon}
          </div>
          <div>
            <h2 className="text-lg font-serif font-semibold text-green-800">
              Kiduka
            </h2>
            <p className="text-xs text-green-600">Agricultural Analytics</p>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="p-2">
        {filteredNav.map((item) =>
          item.children && item.children.length > 0 ? (
            <SidebarGroup key={item.label}>
              <SidebarGroupLabel
                className="text-green-700 font-medium flex items-center justify-between cursor-pointer"
                onClick={() => handleToggleSubmenu(item.label)}
              >
                <span className="flex items-center gap-2">
                  {item.icon} {item.label}
                </span>
                <span
                  className={`transition-transform ${
                    openSubmenus[item.label] ? "rotate-180" : ""
                  }`}
                >
                  ▼
                </span>
              </SidebarGroupLabel>
              {openSubmenus[item.label] &&
                item.children &&
                item.children.length > 0 && (
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {item.children.map((child) => (
                        <SidebarMenuItem key={child.label}>
                          <SidebarMenuButton
                            asChild
                            isActive={isActiveRoute(child.href)}
                            className="data-[active=true]:bg-green-100 data-[active=true]:text-green-800 hover:bg-green-50"
                          >
                            <Link
                              href={child.href}
                              className="flex items-center gap-2"
                            >
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
          ) : (
            <SidebarGroup key={item.label}>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={isActiveRoute(item.href)}
                      className="data-[active=true]:bg-green-100 data-[active=true]:text-green-800 hover:bg-green-50"
                    >
                      <Link href={item.href} className="flex items-center gap-2">
                        {item.icon}
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-amber-200 p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              onClick={logout}
              className="hover:bg-green-50 text-green-700"
            >
              <button className="flex items-center gap-2 w-full" type="button">
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
