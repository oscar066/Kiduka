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
  BarChart3,
  ShieldCheck,
  RefreshCw,
  UserPlus,
  X,
} from "lucide-react";
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
      setError(err?.message || "Failed to create user");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto border-amber-200 px-6">
        <SheetHeader className="pb-4 border-b border-amber-100">
          <SheetTitle className="text-xl font-serif font-bold text-green-800">Add New User</SheetTitle>
          <SheetDescription className="text-green-600 font-serif">
            Create a new user account with the specified details.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-5 py-6">
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
          <SheetFooter className="pt-5 border-t border-amber-100 flex gap-3">
            <SheetClose asChild>
              <Button type="button" variant="outline" className="flex-1 border-amber-200 text-green-700 hover:bg-green-50">
                Cancel
              </Button>
            </SheetClose>
            <Button type="submit" disabled={saving} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
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
      setError(err?.message || "Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto border-amber-200 px-6">
        <SheetHeader className="pb-4 border-b border-amber-100">
          <SheetTitle className="text-xl font-serif font-bold text-green-800">Edit User</SheetTitle>
          <SheetDescription className="text-green-600 font-serif">
            Update details for {user?.full_name || user?.username}.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-6">
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
          <SheetFooter className="pt-5 border-t border-amber-100 flex gap-3">
            <SheetClose asChild>
              <Button type="button" variant="outline" className="flex-1 border-amber-200 text-green-700 hover:bg-green-50">
                Cancel
              </Button>
            </SheetClose>
            <Button type="submit" disabled={saving} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : "Save Changes"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

// ----- Reset Password Sheet -----
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
      setError(err?.message || "Failed to reset password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md border-amber-200 px-6">
        <SheetHeader className="pb-4 border-b border-amber-100">
          <SheetTitle className="text-xl font-serif font-bold text-green-800">Reset Password</SheetTitle>
          <SheetDescription className="text-green-600 font-serif">
            Set a new password for {user?.full_name || user?.username}.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-6">
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
          <SheetFooter className="pt-5 border-t border-amber-100 flex gap-3">
            <SheetClose asChild>
              <Button type="button" variant="outline" className="flex-1 border-amber-200 text-green-700 hover:bg-green-50">
                Cancel
              </Button>
            </SheetClose>
            <Button type="submit" disabled={saving} className="flex-1 bg-amber-600 hover:bg-amber-700 text-white">
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Resetting...</> : "Reset Password"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

// ----- Assign CDC Sheet -----
interface AssignCDCSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  farmer: AdminUserResponse | null;
  token: string;
  onSuccess: () => void;
}

function AssignCDCSheet({ open, onOpenChange, farmer, token, onSuccess }: AssignCDCSheetProps) {
  const [cdcUsers, setCdcUsers] = useState<AdminUserResponse[]>([]);
  const [selectedCdcId, setSelectedCdcId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !token) return;
    apiClient.getAllUsers(token, 1, 100, undefined, UserRole.CDC)
      .then((res: any) => setCdcUsers(res.users || []))
      .catch((err: any) => setError(err?.message || "Failed to load CDC users"));
    setSelectedCdcId(farmer?.assigned_cdc_id ?? "");
    setError(null);
  }, [open, token, farmer]);

  const handleAssign = async () => {
    if (!farmer || !selectedCdcId) return;
    setSaving(true);
    setError(null);
    try {
      await apiClient.assignFarmerToCDC(farmer.id, selectedCdcId, token);
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      setError(err?.message || "Failed to assign CDC");
    } finally {
      setSaving(false);
    }
  };

  const handleUnassign = async () => {
    if (!farmer) return;
    setSaving(true);
    setError(null);
    try {
      await apiClient.unassignFarmerFromCDC(farmer.id, token);
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      setError(err?.message || "Failed to remove assignment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto border-amber-200 px-6">
        <SheetHeader className="pb-4 border-b border-amber-100">
          <SheetTitle className="text-xl font-serif font-bold text-green-800">Assign CDC Officer</SheetTitle>
          <SheetDescription className="text-green-600 font-serif">
            Assign a CDC officer to <span className="font-medium">{farmer?.full_name || farmer?.username}</span>.
            Only assigned farmers will appear on the CDC&apos;s dashboard.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 py-6">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          {farmer?.assigned_cdc_username && (
            <div className="flex items-center justify-between rounded-lg bg-blue-50 border border-blue-200 px-4 py-3">
              <div>
                <p className="text-xs text-blue-500 font-medium uppercase tracking-wide">Current Assignment</p>
                <p className="text-sm font-semibold text-blue-800">{farmer.assigned_cdc_username}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleUnassign}
                disabled={saving}
                className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 px-2"
              >
                <X className="h-4 w-4 mr-1" />
                Remove
              </Button>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-green-800 font-medium">Select CDC Officer</Label>
            <Select value={selectedCdcId} onValueChange={setSelectedCdcId}>
              <SelectTrigger className="border-amber-200 focus:ring-green-500">
                <SelectValue placeholder="Choose a CDC officer..." />
              </SelectTrigger>
              <SelectContent>
                {cdcUsers.map((cdc) => (
                  <SelectItem key={cdc.id} value={cdc.id}>
                    {cdc.full_name ? `${cdc.full_name} (${cdc.username})` : cdc.username}
                  </SelectItem>
                ))}
                {cdcUsers.length === 0 && (
                  <SelectItem value="__none__" disabled>No CDC officers found</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        <SheetFooter className="pt-5 border-t border-amber-100 flex gap-3">
          <SheetClose asChild>
            <Button type="button" variant="outline" className="flex-1 border-amber-200 text-green-700 hover:bg-green-50">
              Cancel
            </Button>
          </SheetClose>
          <Button
            onClick={handleAssign}
            disabled={saving || !selectedCdcId}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          >
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : "Assign CDC"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ----- Role badge helper -----
function getRoleBadgeStyle(role: UserRole) {
  switch (role) {
    case UserRole.SUPER_ADMIN: return "bg-red-100 text-red-800 border-red-200";
    case UserRole.ADMIN:       return "bg-amber-100 text-amber-800 border-amber-200";
    case UserRole.CDC:         return "bg-blue-100 text-blue-800 border-blue-200";
    default:                   return "bg-green-100 text-green-800 border-green-200";
  }
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

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [assignCDCOpen, setAssignCDCOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUserResponse | null>(null);

  useEffect(() => {
    if (token) loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, currentPage, searchTerm, filterRole]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response: PaginatedResponse<AdminUserResponse> = await apiClient.getAllUsers(
        token!,
        currentPage,
        20,
        searchTerm || undefined,
        filterRole === "ALL" ? undefined : filterRole
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
    } catch {
      alert("Failed to delete user");
    }
  };

  return (
    <ProtectedPage requiredRole={UserRole.ADMIN}>
      <AdminLayout>
        <div className="space-y-6 p-1">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-serif font-bold bg-gradient-to-r from-green-800 via-emerald-600 to-green-700 bg-clip-text text-transparent">
                User Management
              </h1>
              <p className="mt-0.5 text-sm text-green-600 font-serif">
                Manage accounts, roles, and permissions
              </p>
            </div>
            <Button
              onClick={() => setCreateOpen(true)}
              className="bg-green-600 hover:bg-green-700 text-white shadow-sm shrink-0"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </div>

          {/* Table card — filters live in the header */}
          <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">

            {/* Card header: title + filters */}
            <div className="px-4 py-3 bg-gradient-to-r from-green-50 to-amber-50 border-b border-amber-200 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm font-serif font-semibold text-green-800">All Users</span>
                {!loading && (
                  <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full font-medium">
                    {total}
                  </span>
                )}
              </div>
              <div className="flex flex-1 gap-2 sm:justify-end">
                <div className="relative flex-1 sm:max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-green-400" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="pl-9 h-8 text-sm border-amber-200 focus-visible:ring-green-500 bg-white"
                  />
                </div>
                <Select value={filterRole} onValueChange={(v) => { setFilterRole(v as UserRole | "ALL"); setCurrentPage(1); }}>
                  <SelectTrigger className="h-8 w-36 text-sm border-amber-200 focus:ring-green-500 bg-white">
                    <div className="flex items-center gap-1.5">
                      <Filter className="h-3.5 w-3.5 text-green-400 shrink-0" />
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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadUsers}
                  disabled={loading}
                  className="h-8 w-8 p-0 text-green-600 hover:bg-green-50 border border-amber-200"
                  aria-label="Refresh"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </div>

            {/* Table body */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-green-500" />
                <p className="text-sm text-green-600 font-medium">Loading users...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="p-4 bg-green-50 rounded-full">
                  <Search className="h-7 w-7 text-green-400" />
                </div>
                <p className="text-green-800 font-serif font-medium">No users found</p>
                <p className="text-sm text-gray-500">Try adjusting your search or filter.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-amber-100">
                    <thead className="bg-gradient-to-r from-green-50 to-amber-50">
                      <tr>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-green-800 uppercase tracking-wider">User</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-green-800 uppercase tracking-wider">Role</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-green-800 uppercase tracking-wider">Status</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-green-800 uppercase tracking-wider">Joined</th>
                        <th className="relative px-5 py-3"><span className="sr-only">Actions</span></th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-amber-50">
                      {users.map((user) => (
                        <tr key={user.id} className="hover:bg-green-50/30 transition-colors group">
                          {/* User cell */}
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8 border border-amber-100 shrink-0">
                                <AvatarFallback className="bg-green-100 text-green-700 text-xs font-bold">
                                  {user.username.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-sm font-semibold text-gray-900 group-hover:text-green-700 transition-colors truncate">
                                    {user.full_name || user.username}
                                  </p>
                                  {user.is_verified && (
                                    <ShieldCheck className="h-3.5 w-3.5 text-green-500 shrink-0" aria-label="Verified" />
                                  )}
                                </div>
                                <div className="flex items-center gap-3 mt-0.5">
                                  <span className="flex items-center gap-1 text-xs text-gray-500">
                                    <Mail className="h-3 w-3" />
                                    <span className="truncate max-w-[180px]">{user.email}</span>
                                  </span>
                                  {(user.prediction_count ?? 0) > 0 && (
                                    <span className="flex items-center gap-1 text-xs text-amber-600">
                                      <BarChart3 className="h-3 w-3" />
                                      {user.prediction_count}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Role */}
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <div className="flex flex-col gap-1">
                              <Badge variant="outline" className={`text-xs w-fit ${getRoleBadgeStyle(user.role)}`}>
                                {user.role.replace("_", " ")}
                              </Badge>
                              {user.role === UserRole.USER && (
                                <span className="text-xs text-gray-400">
                                  {user.assigned_cdc_username
                                    ? <span className="text-blue-600">CDC: {user.assigned_cdc_username}</span>
                                    : <span className="italic">Unassigned</span>
                                  }
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                user.is_active
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-red-50 text-red-700 border-red-200"
                              }`}
                            >
                              {user.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </td>

                          {/* Joined */}
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <span className="flex items-center gap-1.5 text-xs text-gray-500">
                              <Calendar className="h-3 w-3 text-green-400" />
                              {new Date(user.created_at).toLocaleDateString()}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-3.5 whitespace-nowrap text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-gray-400 hover:text-green-700 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <span className="sr-only">Open menu</span>
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="border-amber-100">
                                <DropdownMenuItem
                                  className="text-green-700 focus:text-green-800 focus:bg-green-50 cursor-pointer"
                                  onClick={() => { setSelectedUser(user); setEditOpen(true); }}
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit Details
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-amber-700 focus:text-amber-800 focus:bg-amber-50 cursor-pointer"
                                  onClick={() => { setSelectedUser(user); setResetOpen(true); }}
                                >
                                  <Key className="mr-2 h-4 w-4" />
                                  Reset Password
                                </DropdownMenuItem>
                                {user.role === UserRole.USER && (
                                  <DropdownMenuItem
                                    className="text-blue-700 focus:text-blue-800 focus:bg-blue-50 cursor-pointer"
                                    onClick={() => { setSelectedUser(user); setAssignCDCOpen(true); }}
                                  >
                                    <UserPlus className="mr-2 h-4 w-4" />
                                    Assign CDC
                                  </DropdownMenuItem>
                                )}
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
                <div className="px-5 py-3 border-t border-amber-100 bg-gradient-to-r from-green-50/50 to-amber-50/50 flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    Showing{" "}
                    <span className="font-medium text-green-700">{(currentPage - 1) * 20 + 1}</span>–
                    <span className="font-medium text-green-700">{Math.min(currentPage * 20, total)}</span>{" "}
                    of <span className="font-medium text-green-700">{total}</span> users
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="h-7 text-xs border-amber-200 hover:bg-green-50 text-green-700"
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="h-7 text-xs border-amber-200 hover:bg-green-50 text-green-700"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Sheets */}
        <CreateUserSheet open={createOpen} onOpenChange={setCreateOpen} token={token!} onSuccess={loadUsers} />
        <EditUserSheet open={editOpen} onOpenChange={setEditOpen} token={token!} user={selectedUser} onSuccess={loadUsers} />
        <ResetPasswordSheet open={resetOpen} onOpenChange={setResetOpen} token={token!} user={selectedUser} onSuccess={loadUsers} />
        <AssignCDCSheet open={assignCDCOpen} onOpenChange={setAssignCDCOpen} farmer={selectedUser} token={token!} onSuccess={loadUsers} />
      </AdminLayout>
    </ProtectedPage>
  );
}
