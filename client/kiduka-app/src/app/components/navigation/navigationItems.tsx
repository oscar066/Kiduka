import React from "react";
import {
  BarChart3,
  Beaker,
  Bell,
  FileText,
  FlaskConical,
  LayoutDashboard,
  Leaf,
  MapPin,
  Settings,
  TrendingUp,
  Users,
  UserCheck,
  MessageCircle,
  Zap,
} from "lucide-react";
import { UserRole } from "@/types/auth";


export interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles?: UserRole[];
  permissions?: string[];
  children?: NavItem[];
}

const navigationItems: NavItem[] = [
  // Farmer (USER) navigation — hidden from Admin and CDC roles
  {
    label: "Dashboard",
    icon: <BarChart3 className="h-4 w-4" />,
    href: "/dashboard",
    roles: [UserRole.USER],
  },
  {
    label: "New Soil Analysis",
    icon: <Beaker className="h-4 w-4" />,
    href: "/analysis",
    roles: [UserRole.USER],
  },
  {
    label: "Chat with AI",
    icon: <MessageCircle className="h-4 w-4" />,
    href: "/chat",
    roles: [UserRole.USER],
  },
  {
    label: "Optimization",
    icon: <Zap className="h-4 w-4" />,
    href: "/optimization",
    roles: [UserRole.USER],
  },
  {
    label: "My Reports",
    icon: <FileText className="h-4 w-4" />,
    href: "/reports",
    roles: [UserRole.USER],
  },
  {
    label: "Analytics",
    icon: <TrendingUp className="h-4 w-4" />,
    href: "#",
    roles: [UserRole.USER],
    children: [
      {
        label: "Fertility Trends",
        icon: <TrendingUp className="h-4 w-4" />,
        href: "#",
      },
      {
        label: "Crop Recommendations",
        icon: <Leaf className="h-4 w-4" />,
        href: "#",
      },
    ],
  },
  // Admin navigation — flat links + one collapsible group for CDC management
  {
    label: "Overview",
    icon: <LayoutDashboard className="h-4 w-4" />,
    href: "/admin/dashboard",
    roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN],
  },
  {
    label: "User Management",
    icon: <Users className="h-4 w-4" />,
    href: "/admin/users",
    roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN],
  },
  {
    label: "Predictions",
    icon: <FlaskConical className="h-4 w-4" />,
    href: "/admin/predictions",
    roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN],
  },
  {
    label: "Audit Logs",
    icon: <FileText className="h-4 w-4" />,
    href: "#",                             // page not built yet
    roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN],
  },
  {
    label: "Agrovets",
    icon: <MapPin className="h-4 w-4" />,
    href: "#",                             // page not built yet
    roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN],
  },
  // CDC Management — collapsible group visible to admin
  {
    label: "CDC Management",
    icon: <UserCheck className="h-4 w-4" />,
    href: "#",
    roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN],
    children: [
      {
        label: "CDC Accounts",
        icon: <UserCheck className="h-4 w-4" />,
        href: "/admin/users?role=cdc",     // filters existing users page
        roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN],
      },
      {
        label: "CDC Activity",
        icon: <TrendingUp className="h-4 w-4" />,
        href: "#",                         // page not built yet
        roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN],
      },
    ],
  },
  {
    label: "Admin Settings",
    icon: <Settings className="h-4 w-4" />,
    href: "#",                             // page not built yet
    roles: [UserRole.SUPER_ADMIN],
  },

  // CDC navigation
  {
    label: "Dashboard",
    icon: <BarChart3 className="h-4 w-4" />,
    href: "/cdc/dashboard",
    roles: [UserRole.CDC],
  },
  {
    label: "Farmers",
    icon: <Users className="h-4 w-4" />,
    href: "/cdc/farmers",
    roles: [UserRole.CDC],
  },
  {
    label: "Run Analysis",
    icon: <Beaker className="h-4 w-4" />,
    href: "/cdc/analyze",
    roles: [UserRole.CDC],
  },
  {
    label: "Notifications",
    icon: <Bell className="h-4 w-4" />,
    href: "/cdc/notifications",
    roles: [UserRole.CDC],
  },
  {
    label: "Settings",
    icon: <Settings className="h-4 w-4" />,
    href: "#",
    roles: [UserRole.USER],
  },
];

export default navigationItems;
