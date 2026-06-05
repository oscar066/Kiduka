"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { ProtectedPage } from "../../components/auth/roleBasedGaurd";
import { AdminLayout } from "../../components/layout/roleBasedLayout";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api-client";
import { UserRole } from "@/types/auth";
import type { AdminUserResponse } from "@/types/auth";
import type { PaginatedResponse } from "@/types/api";
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
  X,
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// ----- Create User Sheet -----
interface CreateUserSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string;
  onSuccess: () => void;
}

function CreateUserSheet({ open, onOpenChange, token, onSuccess }: CreateUserSheetProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    full_name: "",
    username: "",
    email: "",
    password: "",
    phone_number: "",
    role: UserRole.USER as UserRole,
    notes: "",
  });

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await apiClient.createUser(
        {
          full_name: form.full_name || undefined,
          username: form.username,
          email: form.email,
          password: form.password,
          phone_number: form.phone_number || undefined,
          role: form.role,
          notes: form.notes || undefined,
        },
        token
      );
      setForm({ full_name: "", username: "", email: "", password: "", phone_number: "", role: UserRole.USER, notes: "" });
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      console.error("Error creating user:", err);
      setError(err?.message || "Failed to create user");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto border-amber-200">
        <SheetHeader className="pb-4 border-b border-amber-100">
          <SheetTitle className="text-xl font-serif font-bold text-green-800">Add New User</SheetTitle>
          <SheetDescription className="text-green-600 font-serif">
            Create a new user account with the specified details.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-green-800 font-medium">Full Name</Label>
              <Input
                value={form.full_name}
                onChange={(e) => handleChange("full_name", e.target.value)}
                placeholder="John Doe"
                className="border-amber-200 focus-visible:ring-green-500"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-green-800 font-medium">Username *</Label>
              <Input
                required
                value={form.username}
                onChange={(e) => handleChange("username", e.target.value)}
                placeholder="johndoe"
                className="border-amber-200 focus-visible:ring-green-500"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-green-800 font-medium">Email *</Label>
            <Input
              required
              type="email"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder="john@example.com"
              className="border-amber-200 focus-visible:ring-green-500"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-green-800 font-medium">Password *</Label>
            <Input
              required
              type="password"
              value={form.password}
              onChange={(e) => handleChange("password", e.target.value)}
              placeholder="Min 8 characters"
              minLength={8}
              className="border-amber-200 focus-visible:ring-green-500"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-green-800 font-medium">Phone Number</Label>
            <Input
              value={form.phone_number}
              onChange={(e) => handleChange("phone_number", e.target.value)}
              placeholder="+254700000000"
              className="border-amber-200 focus-visible:ring-green-500"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-green-800 font-medium">Role</Label>
            <Select value={form.role} onValueChange={(v) => handleChange("role", v)}>
              <SelectTrigger className="border-amber-200 focus:ring-green-500">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UserRole.USER}>User</SelectItem>
                <SelectItem value={UserRole.CDC}>CDC</SelectItem>
                <SelectItem value={UserRole.ADMIN}>Admin (requires super admin)</SelectItem>
                <SelectItem value={UserRole.SUPER_ADMIN}>Super Admin (requires super admin)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-green-800 font-medium">Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              placeholder="Optional internal notes..."
              className="border-amber-200 focus-visible:ring-green-500 resize-none"
              rows={3}
            />
          </div>
          <SheetFooter className="pt-4 border-t border-amber-100 flex gap-3">
            <SheetClose asChild>
              <Button type="button" variant="outline" className="border-amber-200 text-green-700 hover:bg-green-50">
                Cancel
              </Button>
            </SheetClose>
            <Button
              type="submit"
              disabled={saving}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</> : "Create User"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

// ----- Edit User Sheet -----
interface EditUserSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string;
  user: AdminUserResponse | null;
  onSuccess: () => void;
}

function EditUserSheet({ open, onOpenChange, token, user, onSuccess }: EditUserSheetProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    full_name: "",
    username: "",
    email: "",
    phone_number: "",
    role: UserRole.USER as UserRole,
    is_active: true,
    is_verified: false,
    notes: "",
  });

  useEffect(() => {
    if (user) {
      setForm({
        full_name: user.full_name || "",
        username: user.username,
        email: user.email,
        phone_number: user.phone_number || "",
        role: user.role,
        is_active: user.is_active,
        is_verified: user.is_verified,
        notes: user.notes || "",
      });
      setError(null);
    }
  }, [user]);

  const handleChange = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setSaving(true);
    try {
      await apiClient.updateUserById(
        user.id,
        {
          full_name: form.full_name || undefined,
          username: form.username,
          email: form.email,
          role: form.role,
          is_active: form.is_active,
          is_verified: form.is_verified,
          notes: form.notes || undefined,
        },
        token
      );
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      console.error("Error updating user:", err);
      setError(err?.message || "Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto border-amber-200">
        <SheetHeader className="pb-4 border-b border-amber-100">
          <SheetTitle className="text-xl font-serif font-bold text-green-800">Edit User</SheetTitle>
          <SheetDescription className="text-green-600 font-serif">
            Update details for {user?.full_name || user?.username}.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-green-800 font-medium">Full Name</Label>
              <Input
                value={form.full_name}
                onChange={(e) => handleChange("full_name", e.target.value)}
                className="border-amber-200 focus-visible:ring-green-500"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-green-800 font-medium">Username *</Label>
              <Input
                required
                value={form.username}
                onChange={(e) => handleChange("username", e.target.value)}
                className="border-amber-200 focus-visible:ring-green-500"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-green-800 font-medium">Email *</Label>
            <Input
              required
              type="email"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
              className="border-amber-200 focus-visible:ring-green-500"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-green-800 font-medium">Phone Number</Label>
            <Input
              value={form.phone_number}
              onChange={(e) => handleChange("phone_number", e.target.value)}
              placeholder="+254700000000"
              className="border-amber-200 focus-visible:ring-green-500"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-green-800 font-medium">Role</Label>
            <Select value={form.role} onValueChange={(v) => handleChange("role", v)}>
              <SelectTrigger className="border-amber-200 focus:ring-green-500">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UserRole.USER}>User</SelectItem>
                <SelectItem value={UserRole.CDC}>CDC</SelectItem>
                <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
                <SelectItem value={UserRole.SUPER_ADMIN}>Super Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-green-800 font-medium">Active Status</Label>
              <Select
                value={form.is_active ? "true" : "false"}
                onValueChange={(v) => handleChange("is_active", v === "true")}
              >
                <SelectTrigger className="border-amber-200 focus:ring-green-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-green-800 font-medium">Verified</Label>
              <Select
                value={form.is_verified ? "true" : "false"}
                onValueChange={(v) => handleChange("is_verified", v === "true")}
              >
                <SelectTrigger className="border-amber-200 focus:ring-green-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Verified</SelectItem>
                  <SelectItem value="false">Unverified</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-green-800 font-medium">Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              className="border-amber-200 focus-visible:ring-green-500 resize-none"
              rows={3}
            />
          </div>
          <SheetFooter className="pt-4 border-t border-amber-100 flex gap-3">
            <SheetClose asChild>
              <Button type="button" variant="outline" className="border-amber-200 text-green-700 hover:bg-green-50">
                Cancel
              </Button>
            </SheetClose>
            <Button
              type="submit"
              disabled={saving}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : "Save Changes"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

// ----- Reset Password Dialog -----
interface ResetPasswordSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string;
  user: AdminUserResponse | null;
  onSuccess: () => void;
}

function ResetPasswordSheet({ open, onOpenChange, token, user, onSuccess }: ResetPasswordSheetProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setSaving(true);
    try {
      await apiClient.resetUserPassword(user.id, newPassword, token);
      setNewPassword("");
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      console.error("Error resetting password:", err);
      setError(err?.message || "Failed to reset password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md border-amber-200">
        <SheetHeader className="pb-4 border-b border-amber-100">
          <SheetTitle className="text-xl font-serif font-bold text-green-800">Reset Password</SheetTitle>
          <SheetDescription className="text-green-600 font-serif">
            Set a new password for {user?.full_name || user?.username}.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-green-800 font-medium">New Password *</Label>
            <Input
              required
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 8 characters"
              minLength={8}
              className="border-amber-200 focus-visible:ring-green-500"
            />
            <p className="text-xs text-gray-500">Must be at least 8 characters long.</p>
          </div>
          <SheetFooter className="pt-4 border-t border-amber-100 flex gap-3">
            <SheetClose asChild>
              <Button type="button" variant="outline" className="border-amber-200 text-green-700 hover:bg-green-50">
                Cancel
              </Button>
            </SheetClose>
            <Button
              type="submit"
              disabled={saving}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Resetting...</> : "Reset Password"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

// ----- Main Page -----
export default function AdminUsersPage() {
  const { token } = useAuth();
  const [users, setUsers] = useState<AdminUserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<UserRole | "ALL">("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Sheet state
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUserResponse | null>(null);

  useEffect(() => {
    if (token) {
      loadUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, currentPage, searchTerm, filterRole]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const roleFilter = filterRole === "ALL" ? undefined : filterRole;
      const response: PaginatedResponse<AdminUserResponse> = await apiClient.getAllUsers(
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
      await loadUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Failed to delete user");
    }
  };

  const handleEditClick = (user: AdminUserResponse) => {
    setSelectedUser(user);
    setEditOpen(true);
  };

  const handleResetClick = (user: AdminUserResponse) => {
    setSelectedUser(user);
    setResetOpen(true);
  };

  const getRoleBadgeStyle = (role: UserRole) => {
    switch (role) {
      case UserRole.SUPER_ADMIN:
        return "bg-red-100 text-red-800 border-red-200";
      case UserRole.ADMIN:
        return "bg-amber-100 text-amber-800 border-amber-200";
      case UserRole.CDC:
        return "bg-blue-100 text-blue-800 border-blue-200";
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
              <h1 className="text-3xl font-serif font-bold text-green-800">User Management</h1>
              <p className="mt-1 text-green-600 font-serif">Manage user accounts, roles, and permissions</p>
            </div>
            <Button
              onClick={() => setCreateOpen(true)}
              className="bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg transition-all"
            >
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
                      <SelectItem value={UserRole.CDC}>CDC</SelectItem>
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
              ) : users.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-3">
                  <div className="p-4 bg-green-50 rounded-full">
                    <Search className="h-8 w-8 text-green-400" />
                  </div>
                  <p className="text-green-700 font-medium font-serif">No users found</p>
                  <p className="text-sm text-gray-500">Try adjusting your search or filter criteria.</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-amber-100">
                      <thead className="bg-gradient-to-r from-green-50 to-emerald-50">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-green-800 uppercase tracking-wider">User</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-green-800 uppercase tracking-wider">Role</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-green-800 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-green-800 uppercase tracking-wider">Joined</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-green-800 uppercase tracking-wider">Activity</th>
                          <th className="relative px-6 py-4"><span className="sr-only">Actions</span></th>
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
                              <Badge variant="outline" className={getRoleBadgeStyle(user.role)}>
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
                                  <DropdownMenuItem
                                    className="text-green-600 focus:text-green-700 focus:bg-green-50 cursor-pointer"
                                    onClick={() => handleEditClick(user)}
                                  >
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-amber-600 focus:text-amber-700 focus:bg-amber-50 cursor-pointer"
                                    onClick={() => handleResetClick(user)}
                                  >
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
                      Showing{" "}
                      <span className="font-medium text-green-700">{(currentPage - 1) * 20 + 1}</span> to{" "}
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

        {/* Modals */}
        <CreateUserSheet
          open={createOpen}
          onOpenChange={setCreateOpen}
          token={token!}
          onSuccess={loadUsers}
        />
        <EditUserSheet
          open={editOpen}
          onOpenChange={setEditOpen}
          token={token!}
          user={selectedUser}
          onSuccess={loadUsers}
        />
        <ResetPasswordSheet
          open={resetOpen}
          onOpenChange={setResetOpen}
          token={token!}
          user={selectedUser}
          onSuccess={loadUsers}
        />
      </AdminLayout>
    </ProtectedPage>
  );
}
