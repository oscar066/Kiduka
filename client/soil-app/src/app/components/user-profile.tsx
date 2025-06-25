"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { Navbar } from "./navbar";
import {
  User,
  Mail,
  Calendar,
  MapPin,
  Phone,
  Briefcase,
  Edit,
  Save,
  X,
  Camera,
  Verified,
  Shield,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface UserProfile {
  id: string;
  username: string;
  email: string;
  full_name: string;
  phone?: string;
  location?: string;
  bio?: string;
  occupation?: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  last_login?: string;
}

export default function UserProfileComponent() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [editedData, setEditedData] = useState<Partial<UserProfile>>({});

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  // Fetch user profile data
  useEffect(() => {
    if (session?.accessToken) {
      fetchUserProfile();
    }
  }, [session]);

  const fetchUserProfile = async () => {
    if (!session?.accessToken) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/me`,
        {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch profile data");
      }

      const userData = await response.json();
      setProfileData(userData);
      setEditedData(userData);
    } catch (err) {
      console.error("Error fetching profile:", err);
      setError("Failed to load profile data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!session?.accessToken || !profileData) return;

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/me`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.accessToken}`,
          },
          body: JSON.stringify({
            full_name: editedData.full_name,
            phone: editedData.phone,
            location: editedData.location,
            bio: editedData.bio,
            occupation: editedData.occupation,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update profile");
      }

      const updatedUser = await response.json();
      setProfileData(updatedUser);
      setEditedData(updatedUser);
      setIsEditing(false);
      setSuccess("Profile updated successfully!");

      // Update session data
      await update({
        ...session,
        user: {
          ...session.user,
          name: updatedUser.full_name,
        },
      });
    } catch (err) {
      console.error("Error updating profile:", err);
      setError("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedData(profileData || {});
    setIsEditing(false);
    setError(null);
    setSuccess(null);
  };

  const getUserInitials = () => {
    if (profileData?.full_name) {
      return profileData.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return profileData?.username?.slice(0, 2).toUpperCase() || "U";
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-green-25 via-amber-25 to-green-25">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          <div className="text-center">
            <h3 className="text-lg font-medium text-green-800">
              Loading Profile...
            </h3>
            <p className="text-green-600">
              Please wait while we fetch your information
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Navbar />

        <main className="flex-1 space-y-6 p-6 bg-gradient-to-br from-green-25 via-amber-25 to-green-25 min-h-screen">
          <div className="space-y-2">
            <h1 className="text-3xl font-serif font-bold text-green-800">
              Profile Settings
            </h1>
            <p className="text-green-600 font-serif">
              Manage your account information and preferences
            </p>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">{error}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {success && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-green-800">
                  <Verified className="h-4 w-4" />
                  <span className="text-sm font-medium">{success}</span>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Profile Overview */}
            <div className="lg:col-span-1">
              <Card className="border-amber-200 bg-white shadow-lg">
                <CardHeader className="bg-gradient-to-r from-green-50 to-amber-50 border-b border-amber-200 text-center">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="relative">
                      <Avatar className="h-24 w-24">
                        <AvatarImage
                          src={session?.user?.image || undefined}
                          alt={profileData?.full_name || "User"}
                        />
                        <AvatarFallback className="bg-green-100 text-green-700 text-xl font-medium">
                          {getUserInitials()}
                        </AvatarFallback>
                      </Avatar>
                      <Button
                        size="icon"
                        variant="outline"
                        className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full border-2 border-white bg-green-600 text-white hover:bg-green-700"
                      >
                        <Camera className="h-4 w-4" />
                      </Button>
                    </div>

                    <div>
                      <CardTitle className="text-green-800 flex items-center gap-2">
                        {profileData?.full_name || profileData?.username}
                        {profileData?.is_verified && (
                          <Verified className="h-4 w-4 text-blue-600" />
                        )}
                      </CardTitle>
                      <CardDescription className="text-green-600">
                        @{profileData?.username}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Status</span>
                    <Badge
                      variant={profileData?.is_active ? "default" : "secondary"}
                      className={profileData?.is_active ? "bg-green-600" : ""}
                    >
                      {profileData?.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Verification</span>
                    <Badge
                      variant={profileData?.is_verified ? "default" : "outline"}
                      className={profileData?.is_verified ? "bg-blue-600" : ""}
                    >
                      {profileData?.is_verified ? "Verified" : "Unverified"}
                    </Badge>
                  </div>

                  <Separator />

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Joined{" "}
                        {new Date(
                          profileData?.created_at || ""
                        ).toLocaleDateString()}
                      </span>
                    </div>

                    {profileData?.last_login && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Shield className="h-4 w-4" />
                        <span>
                          Last login{" "}
                          {new Date(
                            profileData.last_login
                          ).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Profile Details */}
            <div className="lg:col-span-2">
              <Card className="border-amber-200 bg-white shadow-lg">
                <CardHeader className="bg-gradient-to-r from-green-50 to-amber-50 border-b border-amber-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-green-800">
                        <User className="h-5 w-5" />
                        Account Information
                      </CardTitle>
                      <CardDescription className="text-green-600">
                        Update your personal information and preferences
                      </CardDescription>
                    </div>

                    {!isEditing ? (
                      <Button
                        onClick={() => setIsEditing(true)}
                        variant="outline"
                        className="border-green-200 text-green-700 hover:bg-green-50"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          onClick={handleSave}
                          disabled={isSaving}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {isSaving ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4 mr-2" />
                          )}
                          Save
                        </Button>
                        <Button
                          onClick={handleCancel}
                          variant="outline"
                          disabled={isSaving}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="p-6 space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Full Name */}
                    <div className="space-y-2">
                      <Label
                        htmlFor="fullName"
                        className="text-green-700 font-medium"
                      >
                        Full Name
                      </Label>
                      {isEditing ? (
                        <Input
                          id="fullName"
                          value={editedData.full_name || ""}
                          onChange={(e) =>
                            setEditedData((prev) => ({
                              ...prev,
                              full_name: e.target.value,
                            }))
                          }
                          className="border-amber-200 focus:border-green-500"
                        />
                      ) : (
                        <p className="text-gray-900">
                          {profileData?.full_name || "Not set"}
                        </p>
                      )}
                    </div>

                    {/* Email (Read-only) */}
                    <div className="space-y-2">
                      <Label className="text-green-700 font-medium flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email Address
                      </Label>
                      <p className="text-gray-900">{profileData?.email}</p>
                      <p className="text-xs text-gray-500">
                        Email cannot be changed
                      </p>
                    </div>

                    {/* Phone */}
                    <div className="space-y-2">
                      <Label
                        htmlFor="phone"
                        className="text-green-700 font-medium flex items-center gap-2"
                      >
                        <Phone className="h-4 w-4" />
                        Phone Number
                      </Label>
                      {isEditing ? (
                        <Input
                          id="phone"
                          value={editedData.phone || ""}
                          onChange={(e) =>
                            setEditedData((prev) => ({
                              ...prev,
                              phone: e.target.value,
                            }))
                          }
                          placeholder="+254 700 000 000"
                          className="border-amber-200 focus:border-green-500"
                        />
                      ) : (
                        <p className="text-gray-900">
                          {profileData?.phone || "Not set"}
                        </p>
                      )}
                    </div>

                    {/* Location */}
                    <div className="space-y-2">
                      <Label
                        htmlFor="location"
                        className="text-green-700 font-medium flex items-center gap-2"
                      >
                        <MapPin className="h-4 w-4" />
                        Location
                      </Label>
                      {isEditing ? (
                        <Input
                          id="location"
                          value={editedData.location || ""}
                          onChange={(e) =>
                            setEditedData((prev) => ({
                              ...prev,
                              location: e.target.value,
                            }))
                          }
                          placeholder="Nairobi, Kenya"
                          className="border-amber-200 focus:border-green-500"
                        />
                      ) : (
                        <p className="text-gray-900">
                          {profileData?.location || "Not set"}
                        </p>
                      )}
                    </div>

                    {/* Occupation */}
                    <div className="space-y-2 md:col-span-2">
                      <Label
                        htmlFor="occupation"
                        className="text-green-700 font-medium flex items-center gap-2"
                      >
                        <Briefcase className="h-4 w-4" />
                        Occupation
                      </Label>
                      {isEditing ? (
                        <Input
                          id="occupation"
                          value={editedData.occupation || ""}
                          onChange={(e) =>
                            setEditedData((prev) => ({
                              ...prev,
                              occupation: e.target.value,
                            }))
                          }
                          placeholder="Farmer, Agricultural Consultant, etc."
                          className="border-amber-200 focus:border-green-500"
                        />
                      ) : (
                        <p className="text-gray-900">
                          {profileData?.occupation || "Not set"}
                        </p>
                      )}
                    </div>

                    {/* Bio */}
                    <div className="space-y-2 md:col-span-2">
                      <Label
                        htmlFor="bio"
                        className="text-green-700 font-medium"
                      >
                        Bio
                      </Label>
                      {isEditing ? (
                        <Textarea
                          id="bio"
                          value={editedData.bio || ""}
                          onChange={(e) =>
                            setEditedData((prev) => ({
                              ...prev,
                              bio: e.target.value,
                            }))
                          }
                          placeholder="Tell us about yourself and your farming interests..."
                          className="border-amber-200 focus:border-green-500 min-h-[100px]"
                        />
                      ) : (
                        <p className="text-gray-900 whitespace-pre-wrap">
                          {profileData?.bio || "No bio added yet"}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
