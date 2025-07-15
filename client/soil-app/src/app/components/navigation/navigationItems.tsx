import React from "react";
import {
  BarChart3,
  Beaker,
  FileText,
  History,
  Leaf,
  MapPin,
  Settings,
  TrendingUp,
  Shield,
  Users,
} from "lucide-react";
import { UserRole } from "@/lib/api-client";


export interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles?: UserRole[];
  permissions?: string[];
  children?: NavItem[];
}

const navigationItems: NavItem[] = [
  {
    label: "Dashboard",
    icon: <BarChart3 className="h-4 w-4" />,
    href: "/dashboard",
  },
  {
    label: "New Soil Analysis",
    icon: <Beaker className="h-4 w-4" />,
    href: "/analysis",
  },
  {
    label: "Field Management",
    icon: <MapPin className="h-4 w-4" />,
    href: "/fields",
  },
  {
    label: "My Reports",
    icon: <FileText className="h-4 w-4" />,
    href: "/reports",
  },
  {
    label: "History",
    icon: <History className="h-4 w-4" />,
    href: "/history",
  },
  {
    label: "Analytics",
    icon: <TrendingUp className="h-4 w-4" />,
    href: "/analytics",
    children: [
      {
        label: "Fertility Trends",
        icon: <TrendingUp className="h-4 w-4" />,
        href: "/analytics/fertility",
      },
      {
        label: "Crop Recommendations",
        icon: <Leaf className="h-4 w-4" />,
        href: "/analytics/crops",
      },
    ],
  },
  {
    label: "Admin",
    icon: <Shield className="h-4 w-4" />,
    href: "/admin",
    roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN],
    children: [
      {
        label: "Admin Dashboard", // void duplicate "Dashboard" title
        icon: <BarChart3 className="h-4 w-4" />,
        href: "/admin/dashboard",
        roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN],
      },
      {
        label: "Users",
        icon: <Users className="h-4 w-4" />,
        href: "/admin/users",
        roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN],
      },
      {
        label: "Predictions",
        icon: <BarChart3 className="h-4 w-4" />,
        href: "/admin/predictions",
        roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN],
      },
      {
        label: "Audit Logs",
        icon: <FileText className="h-4 w-4" />,
        href: "/admin/audit-logs",
        roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN],
      },
      {
        label: "Statistics",
        icon: <TrendingUp className="h-4 w-4" />,
        href: "/admin/statistics",
        roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN],
      },
      {
        label: "Agrovets",
        icon: <MapPin className="h-4 w-4" />,
        href: "/admin/agrovets",
        roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN],
      },
      {
        label: "Admin Settings", // avoid duplicate "Settings" title
        icon: <Settings className="h-4 w-4" />,
        href: "/admin/settings",
        roles: [UserRole.SUPER_ADMIN],
      },
    ],
  },
  {
    label: "Settings",
    icon: <Settings className="h-4 w-4" />,
    href: "/settings",
  },
];

export default navigationItems;
