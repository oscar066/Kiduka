"use client";

import {
  Leaf,
  BarChart3,
  FileText,
  Settings,
  History,
  MapPin,
  Beaker,
  TrendingUp,
} from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";

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

const navigationItems = [
  {
    title: "Dashboard",
    icon: BarChart3,
    url: "/dashboard",
  },
  {
    title: "New Soil Analysis",
    icon: Beaker,
    url: "/analysis",
  },
  {
    title: "Field Management",
    icon: MapPin,
    url: "/fields",
  },
  {
    title: "My Reports",
    icon: FileText,
    url: "/reports",
  },
  {
    title: "History",
    icon: History,
    url: "/history",
  },
];

const analyticsItems = [
  {
    title: "Fertility Trends",
    icon: TrendingUp,
    url: "/analytics/fertility",
  },
  {
    title: "Crop Recommendations",
    icon: Leaf,
    url: "/analytics/crops",
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  const isActiveRoute = (url: string) => {
    if (url === "/dashboard") {
      return pathname === "/dashboard" || pathname === "/";
    }
    return pathname === url;
  };

  return (
    <Sidebar className="border-r border-amber-200 bg-gradient-to-b from-green-50 to-amber-50">
      <SidebarHeader className="border-b border-amber-200 p-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-600">
            <Leaf className="h-5 w-5 text-white" />
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
        <SidebarGroup>
          <SidebarGroupLabel className="text-green-700 font-medium">
            Main Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActiveRoute(item.url)}
                    className="data-[active=true]:bg-green-100 data-[active=true]:text-green-800 hover:bg-green-50"
                  >
                    <Link href={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-green-700 font-medium">
            Analytics
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {analyticsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActiveRoute(item.url)}
                    className="data-[active=true]:bg-green-100 data-[active=true]:text-green-800 hover:bg-green-50"
                  >
                    <Link href={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-amber-200 p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActiveRoute("/settings")}
              className="data-[active=true]:bg-green-100 data-[active=true]:text-green-800 hover:bg-green-50"
            >
              <Link href="/settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
