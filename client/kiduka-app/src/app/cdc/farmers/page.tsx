"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ProtectedPage } from "../../components/auth/roleBasedGaurd";
import { CDCLayout } from "../../components/layout/roleBasedLayout";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api-client";
import { UserRole } from "@/types/auth";
import {
  Search,
  MoreVertical,
  Beaker,
  Eye,
  Mail,
  Phone,
  Loader2,
  Calendar,
  BarChart3,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Farmer {
  id: string;
  username: string;
  full_name: string | null;
  email: string;
  phone_number?: string | null;
  prediction_count?: number | null;
  last_analysis_date?: string | null;
  created_at: string;
}

interface PaginatedFarmers {
  farmers?: Farmer[];
  total: number;
  pages: number;
}

export default function CDCFarmersPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const loadFarmers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response: PaginatedFarmers = await apiClient.getCDCFarmers(
        token,
        currentPage,
        20,
        searchTerm || undefined
      );
      setFarmers(response.farmers || []);
      setTotal(response.total || 0);
      setTotalPages(response.pages || 1);
    } catch (error) {
      console.error("Error loading farmers:", error);
    } finally {
      setLoading(false);
    }
  }, [token, currentPage, searchTerm]);

  useEffect(() => {
    loadFarmers();
  }, [loadFarmers]);

  return (
    <ProtectedPage requiredRole={UserRole.CDC}>
      <CDCLayout>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-serif font-bold text-green-800">Farmers</h1>
            <p className="mt-1 text-green-600 font-serif">
              View and manage the farmers you serve
            </p>
          </div>

          {/* Search */}
          <Card className="border-amber-200 shadow-sm bg-white/80 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-400" />
                <Input
                  placeholder="Search farmers by name or email..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10 border-amber-200 focus-visible:ring-green-500"
                />
              </div>
            </CardContent>
          </Card>

          {/* Farmers Table */}
          <Card className="border-amber-200 shadow-md overflow-hidden bg-white/90 backdrop-blur-sm">
            <CardContent className="p-0">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <Loader2 className="h-10 w-10 animate-spin text-green-600" />
                  <p className="text-green-600 font-medium">Loading farmers...</p>
                </div>
              ) : farmers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-3">
                  <div className="p-4 bg-green-50 rounded-full">
                    <Search className="h-8 w-8 text-green-400" />
                  </div>
                  <p className="text-green-700 font-medium font-serif">No farmers found</p>
                  <p className="text-sm text-gray-500">Try adjusting your search criteria.</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-amber-100">
                      <thead className="bg-gradient-to-r from-green-50 to-emerald-50">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-green-800 uppercase tracking-wider">Farmer</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-green-800 uppercase tracking-wider">Phone</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-green-800 uppercase tracking-wider">Analyses</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-green-800 uppercase tracking-wider">Last Analysis</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-green-800 uppercase tracking-wider">Joined</th>
                          <th className="relative px-6 py-4"><span className="sr-only">Actions</span></th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-amber-50">
                        {farmers.map((farmer) => (
                          <tr
                            key={farmer.id}
                            className="hover:bg-green-50/30 transition-colors group cursor-pointer"
                            onClick={() => router.push(`/cdc/farmers/${farmer.id}`)}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                                  <AvatarFallback className="bg-green-100 text-green-700 font-bold">
                                    {(farmer.full_name || farmer.username).charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="ml-4">
                                  <div className="text-sm font-semibold text-gray-900 group-hover:text-green-700 transition-colors">
                                    {farmer.full_name || farmer.username}
                                  </div>
                                  <div className="flex items-center text-xs text-gray-500 mt-0.5">
                                    <Mail className="h-3 w-3 mr-1" />
                                    {farmer.email}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center text-sm text-gray-500">
                                <Phone className="h-3.5 w-3.5 mr-2 text-green-400" />
                                {farmer.phone_number || "-"}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center text-sm text-gray-500">
                                <BarChart3 className="h-3.5 w-3.5 mr-2 text-green-400" />
                                {farmer.prediction_count || 0}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-500">
                                {farmer.last_analysis_date
                                  ? new Date(farmer.last_analysis_date).toLocaleDateString()
                                  : "-"}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center text-sm text-gray-500">
                                <Calendar className="h-3.5 w-3.5 mr-2 text-green-400" />
                                {new Date(farmer.created_at).toLocaleDateString()}
                              </div>
                            </td>
                            <td
                              className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"
                              onClick={(e) => e.stopPropagation()}
                            >
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
                                    onClick={() => router.push(`/cdc/farmers/${farmer.id}`)}
                                  >
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Predictions
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-blue-600 focus:text-blue-700 focus:bg-blue-50 cursor-pointer"
                                    onClick={() => router.push(`/cdc/analyze?farmer_id=${farmer.id}`)}
                                  >
                                    <Beaker className="mr-2 h-4 w-4" />
                                    Run Analysis
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
                      <span className="font-medium text-green-700">{total}</span> farmers
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
      </CDCLayout>
    </ProtectedPage>
  );
}
