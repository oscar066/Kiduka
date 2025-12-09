"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function FieldsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Field Management</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600">
          Field management feature coming soon. This page will allow you to manage your agricultural fields,
          track soil samples, and monitor field-specific data.
        </p>
      </div>
    </div>
  );
}
