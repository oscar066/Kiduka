// app/admin/users/page.tsx
"use client";

import { useState, useEffect } from "react";
import { ProtectedPage } from "../../components/auth/roleBasedGaurd";
import { AdminLayout } from "../../components/layout/roleBasedLayout";
import { useAuth } from "@/hooks/useAuth";
import {
  apiClient,
  AdminUserResponse,
  UserRole,
  PaginatedResponse,
} from "@/lib/api-client";
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Key,
  Loader2,
  Mail,
  Calendar,
  Activity,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function AdminUsersPage() {
  const { token } = useAuth();
  const [users, setUsers] = useState<AdminUserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<UserRole | "ALL">("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (token) {
      loadUsers();
    }
  }, [token, currentPage, searchTerm, filterRole]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const roleFilter = filterRole === "ALL" ? undefined : filterRole;
      const response: PaginatedResponse<AdminUserResponse> =
        await apiClient.getAllUsers(
          token!,
          currentPage,
          20,
          searchTerm || undefined,
          roleFilter
        );

      setUsers(response.users || []);
      setTotal(response.total);
      setTotalPages(response.pages);
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
      await apiClient.deleteUserById(userId, token!);
      await loadUsers(); // Reload the list
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Failed to delete user");
    }
  };
  
  const getRoleBadgeStyle = (role: UserRole) => {
      switch (role) {
        case UserRole.SUPER_ADMIN:
          return "bg-red-100 text-red-800 border-red-200";
        case UserRole.ADMIN:
          return "bg-amber-100 text-amber-800 border-amber-200";
        default:
          return "bg-green-100 text-green-800 border-green-200";
      }
  };

  return (
    <ProtectedPage requiredRole={UserRole.ADMIN}>
      <AdminLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-serif font-bold text-green-800">
                User Management
              </h1>
              <p className="mt-1 text-green-600 font-serif">
                Manage user accounts, roles, and permissions
              </p>
            </div>
            <Button className="bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg transition-all">
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </div>

          {/* Filters */}
          <Card className="border-amber-200 shadow-sm bg-white/80 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-400" />
                  <Input
                    placeholder="Search users by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-amber-200 focus-visible:ring-green-500"
                  />
                </div>
                <div className="w-full sm:w-48">
                  <Select
                    value={filterRole}
                    onValueChange={(value) => setFilterRole(value as UserRole | "ALL")}
                  >
                    <SelectTrigger className="border-amber-200 focus:ring-green-500">
                      <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-green-400" />
                        <SelectValue placeholder="All Roles" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Roles</SelectItem>
                      <SelectItem value={UserRole.USER}>User</SelectItem>
                      <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
                      <SelectItem value={UserRole.SUPER_ADMIN}>Super Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Users Table */}
          <Card className="border-amber-200 shadow-md overflow-hidden bg-white/90 backdrop-blur-sm">
            <CardContent className="p-0">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <Loader2 className="h-10 w-10 animate-spin text-green-600" />
                  <p className="text-green-600 font-medium">Loading users...</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-amber-100">
                      <thead className="bg-gradient-to-r from-green-50 to-emerald-50">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-green-800 uppercase tracking-wider">
                            User
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-green-800 uppercase tracking-wider">
                            Role
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-green-800 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-green-800 uppercase tracking-wider">
                            Joined
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-green-800 uppercase tracking-wider">
                            Activity
                          </th>
                          <th className="relative px-6 py-4">
                            <span className="sr-only">Actions</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-amber-50">
                        {users.map((user) => (
                          <tr key={user.id} className="hover:bg-green-50/30 transition-colors group">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                                  <AvatarFallback className="bg-green-100 text-green-700 font-bold">
                                    {user.username.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="ml-4">
                                  <div className="text-sm font-semibold text-gray-900 group-hover:text-green-700 transition-colors">
                                    {user.full_name || user.username}
                                  </div>
                                  <div className="flex items-center text-xs text-gray-500 mt-0.5">
                                    <Mail className="h-3 w-3 mr-1" />
                                    {user.email}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge 
                                variant="outline" 
                                className={getRoleBadgeStyle(user.role)}
                              >
                                {user.role.replace("_", " ")}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge
                                variant="outline"
                                className={
                                  user.is_active
                                    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                                    : "bg-red-100 text-red-700 border-red-200"
                                }
                              >
                                {user.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center text-sm text-gray-500">
                                    <Calendar className="h-3.5 w-3.5 mr-2 text-green-400" />
                                    {new Date(user.created_at).toLocaleDateString()}
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center text-sm text-gray-500">
                                    <Activity className="h-3.5 w-3.5 mr-2 text-green-400" />
                                    {user.prediction_count || 0} Predictions
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0 text-gray-400 hover:text-green-600">
                                    <span className="sr-only">Open menu</span>
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="border-amber-100">
                                  <DropdownMenuItem className="text-green-600 focus:text-green-700 focus:bg-green-50 cursor-pointer">
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-amber-600 focus:text-amber-700 focus:bg-amber-50 cursor-pointer">
                                    <Key className="mr-2 h-4 w-4" />
                                    Reset Password
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    className="text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer"
                                    onClick={() => handleDeleteUser(user.id)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete User
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="px-6 py-4 border-t border-amber-100 flex items-center justify-between bg-green-50/30">
                    <p className="text-sm text-gray-500">
                      Showing <span className="font-medium text-green-700">{(currentPage - 1) * 20 + 1}</span> to{" "}
                      <span className="font-medium text-green-700">{Math.min(currentPage * 20, total)}</span> of{" "}
                      <span className="font-medium text-green-700">{total}</span> users
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="border-amber-200 hover:bg-green-50 text-green-700"
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="border-amber-200 hover:bg-green-50 text-green-700"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    </ProtectedPage>
  );
}
