"use client";

import React from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import UnifiedSidebar from "../../layout/UnifiedSidebar";
import { Navbar } from "../../layout/navbar";
import { SessionGuard } from "../../shared/SessionGuard";
import { MapPin, Pickaxe } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function FieldsPage() {
  return (
    <SessionGuard message="You need to be logged in to access Field Management.">
      <SidebarProvider>
        <UnifiedSidebar />
        <SidebarInset>
          <Navbar />

          <main className="flex-1 space-y-6 p-6 bg-gradient-to-br from-green-25 via-amber-25 to-green-25 min-h-screen flex flex-col">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-serif font-bold text-green-800 flex items-center gap-2">
                  <MapPin className="h-8 w-8 text-green-600" />
                  Field Management
                </h1>
                <p className="text-green-600 font-serif mt-1">
                  Manage your farm plots and track soil history by location
                </p>
              </div>
            </div>

            <Card className="flex-1 border-amber-200 shadow-lg bg-white/80 backdrop-blur-sm flex items-center justify-center min-h-[500px]">
              <CardContent className="flex flex-col items-center justify-center p-12 text-center space-y-4">
                <div className="h-20 w-20 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                  <Pickaxe className="h-10 w-10 text-amber-600" />
                </div>
                <h2 className="text-2xl font-serif font-bold text-gray-900">
                  Coming Soon
                </h2>
                <p className="text-gray-500 max-w-md text-lg">
                  We are hard at work building features to help you define GPS boundaries, group soil analyses by specific farm plots, and visualize your soil health geographically. Check back later!
                </p>
              </CardContent>
            </Card>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </SessionGuard>
  );
}
