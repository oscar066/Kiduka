"use client";

import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
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
  AlertCircle,
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

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function UserDashboard() {
  const { user, token } = useAuth();

  const { data, error, isLoading, isValidating, mutate } = useSWR<PredictionsData>(
    token ? ["getPredictionHistory", token, 1, 5] : null,
    swrFetcher
  );

  const stats = useMemo(() => (data ? deriveStats(data) : null), [data]);
  const recentPredictions = data?.predictions ?? [];

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md space-y-4">
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-red-800">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="text-sm font-medium">Failed to load dashboard data. Please try again.</span>
          </div>
          <Button variant="outline" className="w-full border-amber-200" onClick={() => mutate()}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isValidating ? "animate-spin" : ""}`} />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7">

      {/* Welcome header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          {isLoading && !user ? (
            <>
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-72" />
            </>
          ) : (
            <>
              <h1 className="text-2xl font-serif font-bold bg-gradient-to-r from-green-800 via-emerald-600 to-green-700 bg-clip-text text-transparent">
                {getGreeting()}, {user?.full_name ?? user?.username}!
              </h1>
              <p className="text-sm text-green-600 font-serif mt-0.5">
                Ready to analyze your soil and get personalized recommendations?
              </p>
            </>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-gray-400 hover:text-green-600 mt-0.5 border border-amber-200 h-8 w-8"
          title="Refresh dashboard"
          onClick={() => mutate()}
        >
          <RefreshCw className={`h-4 w-4 ${isValidating ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          loading={isLoading}
          iconBg="from-green-100 to-emerald-100"
          icon={<BarChart3 className="h-6 w-6 text-green-600" />}
          badge={<TrendingUp className="h-4 w-4 text-green-400" />}
          value={stats?.totalPredictions ?? 0}
          label="Total Predictions"
        />
        <StatCard
          loading={isLoading}
          iconBg="from-amber-100 to-yellow-100"
          icon={<Calendar className="h-6 w-6 text-amber-600" />}
          badge={<Sparkles className="h-4 w-4 text-amber-400" />}
          value={stats?.thisMonthPredictions ?? 0}
          label="This Month"
        />
        <StatCard
          loading={isLoading}
          iconBg="from-green-100 to-lime-100"
          icon={<Leaf className="h-6 w-6 text-green-600" />}
          badge={
            <span className="px-1.5 py-0.5 bg-amber-100 rounded text-[10px] font-semibold text-amber-700">
              AVG
            </span>
          }
          value={stats?.averageFertility ?? "--"}
          label="Avg. Fertility"
        />
        <StatCard
          loading={isLoading}
          iconBg="from-emerald-100 to-green-100"
          icon={<MapPin className="h-6 w-6 text-emerald-600" />}
          badge={<TrendingUp className="h-4 w-4 text-emerald-500" />}
          value={stats?.averageSHI ?? "--"}
          label="Avg. SHI Score"
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-serif font-semibold text-green-800 mb-3">Quick Actions</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              href: "/analysis",
              iconBg: "from-green-100 to-emerald-100",
              icon: <Beaker className="h-6 w-6 text-green-600" />,
              title: "New Soil Analysis",
              desc: "Analyze your soil and get fertilizer recommendations",
              cta: "Start analysis",
              ctaColor: "text-green-600",
            },
            {
              href: "/optimization",
              iconBg: "from-amber-100 to-yellow-100",
              icon: <Zap className="h-6 w-6 text-amber-600" />,
              title: "Fertilizer Optimization",
              desc: "Maximize yield within your budget.",
              cta: "Optimize now",
              ctaColor: "text-amber-600",
            },
            {
              href: "/chat",
              iconBg: "from-emerald-100 to-green-100",
              icon: <MessageCircle className="h-6 w-6 text-emerald-600" />,
              title: "Chat with AI",
              desc: "Get instant agricultural advice and analysis insights",
              cta: "Open Chat",
              ctaColor: "text-emerald-600",
            },
          ].map(({ href, iconBg, icon, title, desc, cta, ctaColor }) => (
            <Link
              key={href}
              href={href}
              className="group block bg-white rounded-xl border border-amber-200 shadow-sm hover:border-green-300 hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200 p-5"
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 bg-gradient-to-br ${iconBg} rounded-xl group-hover:scale-105 transition-transform duration-200 shrink-0`}>
                  {icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold font-serif text-green-900 text-sm mb-1">{title}</h3>
                  <p className="text-gray-500 text-xs mb-3 leading-relaxed">{desc}</p>
                  <div className={`flex items-center ${ctaColor} text-xs font-medium`}>
                    {cta}
                    <ArrowRight className="ml-1 h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Predictions */}
      {isLoading ? (
        <div>
          <Skeleton className="h-5 w-40 mb-3" />
          <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-gradient-to-r from-green-50 to-amber-50 border-b border-amber-200">
              <Skeleton className="h-4 w-36" />
            </div>
            <div className="p-4 space-y-2.5">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3.5 rounded-xl border border-amber-100">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-3.5 w-24" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                  <div className="space-y-1.5 text-right">
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-3 w-14" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : recentPredictions.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-serif font-semibold text-green-800">Recent Predictions</h2>
            <Link href="/reports">
              <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700 hover:bg-green-50 h-8 text-xs">
                View All
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
          <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-gradient-to-r from-green-50 to-amber-50 border-b border-amber-200 flex items-center gap-2">
              <History className="h-4 w-4 text-green-600" />
              <span className="text-sm font-serif font-semibold text-green-800">Latest Analysis Results</span>
            </div>
            <div className="p-4 space-y-2.5">
              {recentPredictions.map((prediction, index) => (
                <PredictionRow key={prediction.created_at ?? index} prediction={prediction} index={index} />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-amber-200 shadow-sm">
          <div className="p-12 text-center">
            <div className="max-w-sm mx-auto space-y-4">
              <div className="p-4 bg-green-100 rounded-full w-fit mx-auto">
                <Leaf className="h-9 w-9 text-green-600" />
              </div>
              <h3 className="text-lg font-serif font-semibold text-green-900">
                Start Your First Analysis
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                You haven't analyzed any soil samples yet. Get started to receive personalized fertilizer recommendations.
              </p>
              <Link href="/analysis">
                <Button className="mt-2 bg-green-600 hover:bg-green-700 text-white font-semibold font-serif shadow-sm">
                  <Leaf className="mr-2 h-4 w-4" />
                  Start Analysis
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
