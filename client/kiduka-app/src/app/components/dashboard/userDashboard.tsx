"use client";

import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Leaf,
  History,
  TrendingUp,
  MapPin,
  Calendar,
  ArrowRight,
  Sparkles,
  RefreshCw,
  MessageCircle,
  BarChart3,
  Zap,
  Beaker,
} from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import useSWR from "swr";
import { swrFetcher } from "@/lib/swr-config";

import { UserDashboardStatCard as StatCard } from "./components/UserDashboardStatCard";
import { UserDashboardPredictionRow as PredictionRow } from "./components/UserDashboardPredictionRow";
import {
  deriveStats,
  type PredictionsData,
} from "./components/userDashboardUtils";

export function UserDashboard() {
  const { user, token } = useAuth();

  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate
  } = useSWR<PredictionsData>(
    token ? ["getPredictionHistory", token, 1, 5] : null,
    swrFetcher
  );

  const stats = useMemo(() => data ? deriveStats(data) : null, [data]);
  const recentPredictions = data?.predictions ?? [];
  const statsLoading = isLoading;
  const predictionsLoading = isLoading;

  // Handle manual refresh
  const handleRefresh = () => {
    mutate();
  };

  // Error state
  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md space-y-4">
          <Alert variant="destructive" className="border-red-300">
            <AlertTitle className="font-serif">Error</AlertTitle>
            <AlertDescription>Failed to load dashboard data. Please try again.</AlertDescription>
          </Alert>
          <Button
            variant="outline"
            className="w-full"
            onClick={handleRefresh}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome renders immediately, no loading dependency */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          {statsLoading && !user ? (
            <>
              <Skeleton className="h-9 w-64" />
              <Skeleton className="h-6 w-80" />
            </>
          ) : (
            <>
              <h1 className="text-3xl font-serif font-bold bg-gradient-to-r from-green-800 via-emerald-600 to-green-700 bg-clip-text text-transparent">
                Welcome back, {user?.full_name ?? user?.username}!
              </h1>
              <p className="text-lg text-gray-600 font-serif">
                Ready to analyze your soil and get personalized recommendations?
              </p>
            </>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-gray-400 hover:text-green-600 mt-1"
          title="Refresh dashboard"
          onClick={handleRefresh}
        >
          <RefreshCw className="h-5 w-5" />
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          loading={statsLoading}
          iconBg="from-blue-100 to-cyan-100"
          icon={<BarChart3 className="h-8 w-8 text-blue-600" />}
          badge={<TrendingUp className="h-4 w-4 text-blue-400" />}
          value={stats?.totalPredictions ?? 0}
          label="Total Predictions"
        />
        <StatCard
          loading={statsLoading}
          iconBg="from-green-100 to-emerald-100"
          icon={<Calendar className="h-8 w-8 text-green-600" />}
          badge={<Sparkles className="h-4 w-4 text-green-400" />}
          value={stats?.thisMonthPredictions ?? 0}
          label="This Month"
        />
        <StatCard
          loading={statsLoading}
          iconBg="from-amber-100 to-yellow-100"
          icon={<Leaf className="h-8 w-8 text-amber-600" />}
          badge={
            <span className="px-1.5 py-0.5 bg-amber-100 rounded text-[10px] font-semibold text-amber-700">
              AVG
            </span>
          }
          value={stats?.averageFertility ?? "--"}
          label="Avg. Fertility"
        />
        <StatCard
          loading={statsLoading}
          iconBg="from-emerald-100 to-teal-100"
          icon={<MapPin className="h-8 w-8 text-emerald-600" />}
          badge={<TrendingUp className="h-4 w-4 text-emerald-500" />}
          value={stats?.averageSHI ?? "--"}
          label="Avg. SHI Score"
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-2xl font-serif font-bold text-green-800 mb-4">
          Quick Actions
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              href: "/analysis",
              hoverBorder: "hover:border-green-400",
              iconBg: "from-green-100 to-emerald-100",
              icon: <Beaker className="h-8 w-8 text-green-600" />,
              title: "New Soil Analysis",
              desc: "Analyze your soil and get fertilizer recommendations",
              cta: "Start analysis",
              ctaColor: "text-green-600",
            },
            {
              href: "/optimization",
              hoverBorder: "hover:border-blue-400",
              iconBg: "from-blue-100 to-cyan-100",
              icon: <Zap className="h-8 w-8 text-blue-600" />,
              title: "Fertilizer Optimization",
              desc: "Maximize yield within your budget.",
              cta: "Optimize now",
              ctaColor: "text-blue-600",
            },
            {
              href: "/chat",
              hoverBorder: "hover:border-emerald-400",
              iconBg: "from-emerald-100 to-green-100",
              icon: <MessageCircle className="h-8 w-8 text-emerald-600" />,
              title: "Chat with AI",
              desc: "Get instant agricultural advice and analysis insights",
              cta: "Open Chat",
              ctaColor: "text-emerald-600",
            },
          ].map(({ href, hoverBorder, iconBg, icon, title, desc, cta, ctaColor }) => (
            <Link key={href} href={href}>
              <Card
                className={`cursor-pointer group border-amber-200 ${hoverBorder} hover:shadow-xl transition-all duration-300`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div
                      className={`p-4 bg-gradient-to-br ${iconBg} rounded-2xl group-hover:scale-110 transition-transform duration-300`}
                    >
                      {icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold font-serif text-green-900 text-lg mb-1">{title}</h3>
                      <p className="text-gray-600 text-sm mb-3">{desc}</p>
                      <div className={`flex items-center ${ctaColor} text-sm font-medium`}>
                        {cta}
                        <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Predictions */}
      {predictionsLoading ? (
        <Card className="border-amber-200 shadow-lg">
          <CardContent className="p-6 space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-gray-50/50 rounded-xl border border-transparent">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
                <div className="space-y-2 text-right">
                  <Skeleton className="h-6 w-24 rounded-full" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : recentPredictions.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-serif font-bold text-green-800">
              Recent Predictions
            </h2>
            <Link href="/reports">
              <Button
                variant="ghost"
                className="text-green-600 hover:text-green-700 hover:bg-green-50"
              >
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <Card className="border-amber-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-green-50 via-emerald-50 to-green-50 border-b border-amber-200">
              <CardTitle className="flex items-center gap-2 text-green-800">
                <History className="h-5 w-5" />
                Latest Analysis Results
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                {recentPredictions.map((prediction, index) => (
                  <PredictionRow key={prediction.created_at ?? index} prediction={prediction} index={index} />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Empty state */
        <Card className="border-amber-200">
          <CardContent className="p-12 text-center">
            <div className="max-w-md mx-auto space-y-4">
              <div className="p-4 bg-green-100 rounded-full w-fit mx-auto">
                <Leaf className="h-12 w-12 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">
                Start Your First Analysis
              </h3>
              <p className="text-gray-600">
                You haven't analyzed any soil samples yet. Get started now to receive
                personalized fertilizer recommendations!
              </p>
              <Link href="/analysis">
                <Button className="bg-green-600 hover:bg-green-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all mt-4">
                  <Leaf className="mr-2 h-5 w-5" />
                  Start Analysis
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}