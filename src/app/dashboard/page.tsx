"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { analyticsAPI, designCardsAPI } from "@/lib/api";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import {
  Users,
  Palette,
  FileSpreadsheet,
  TrendingUp,
  Instagram,
  Gem,
  Upload,
  Clock,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import Link from "next/link";

// ============ Types ============

interface DashboardData {
  leads: {
    total: number;
    high_interest: number;
    medium_interest: number;
    low_interest: number;
    conversion_rate: number;
  };
  status_distribution: Record<string, number>;
  most_asked_products: { product: string; count: number }[];
  designs: {
    total: number;
    reference: number;
    cad_in_progress: number;
    cad_uploaded: number;
    final_uploaded: number;
    completed: number;
  };
  designer_upload_counts: { designer: string; count: number }[];
  price_lists_count: number;
}

interface DesignerStats {
  total: number;
  reference: number;
  cad_in_progress: number;
  cad_uploaded: number;
  final_uploaded: number;
  completed: number;
  recent_designs: {
    id: string;
    title: string;
    stage: string;
    created_at: string;
  }[];
}

// ============ Designer Dashboard ============

function DesignerDashboard({ userName }: { userName: string }) {
  const [stats, setStats] = useState<DesignerStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    designCardsAPI
      .myStats()
      .then((res) => setStats(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Welcome back,{" "}
          <span className="text-indigo-600 dark:text-indigo-400">
            {userName}
          </span>
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Here&apos;s an overview of your design portfolio
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-[#12142a]/80 rounded-2xl border border-slate-200 dark:border-white/6 p-5 h-36 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
            <StatCard
              title="Total Designs"
              value={stats?.total || 0}
              subtitle="Assigned to you"
              icon={<Palette className="w-6 h-6 text-white" />}
              gradient="from-violet-500 to-purple-600"
            />
            <StatCard
              title="CAD Phase"
              value={(stats?.cad_in_progress || 0) + (stats?.cad_uploaded || 0)}
              subtitle="Design in progress"
              icon={<Clock className="w-6 h-6 text-white" />}
              gradient="from-amber-500 to-orange-600"
            />
            <StatCard
              title="Ready"
              value={stats?.final_uploaded || 0}
              subtitle="Final design uploaded"
              icon={<CheckCircle2 className="w-6 h-6 text-white" />}
              gradient="from-emerald-500 to-teal-600"
            />
            <StatCard
              title="Completed"
              value={stats?.completed || 0}
              subtitle="Product finished"
              icon={<Gem className="w-6 h-6 text-white" />}
              gradient="linear-to-r from-pink-500 to-rose-600"
            />
          </div>

          {/* Grid sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Design Pipeline */}
            <div className="bg-white dark:bg-[#12142a]/80 rounded-2xl border border-slate-200 dark:border-white/6 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Palette className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                Your Design Pipeline
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { stage: "reference", count: stats?.reference || 0 },
                  { stage: "cad_in_progress", count: stats?.cad_in_progress || 0 },
                  { stage: "cad_uploaded", count: stats?.cad_uploaded || 0 },
                  { stage: "final_uploaded", count: stats?.final_uploaded || 0 },
                ].map((item) => (
                  <div
                    key={item.stage}
                    className="bg-slate-50 dark:bg-white/5 rounded-xl p-4 border border-slate-200 dark:border-transparent"
                  >
                    <StatusBadge status={item.stage} />
                    <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                      {item.count}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Designs */}
            <div className="bg-white dark:bg-[#12142a]/80 rounded-2xl border border-slate-200 dark:border-white/6 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                Recent Uploads
              </h2>
              {stats?.recent_designs && stats.recent_designs.length > 0 ? (
                <div className="space-y-3">
                  {stats.recent_designs.map((design) => (
                    <div
                      key={design.id}
                      className="flex items-center justify-between py-2.5 border-b border-slate-100 dark:border-white/6 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
                          <Palette className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">
                            {design.title}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {new Date(design.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={design.stage} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Palette className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    No designs uploaded yet
                  </p>
                </div>
              )}
            </div>

            {/* Quick Action */}
            <div className="lg:col-span-2 bg-linear-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-lg">
                    Ready to track a new project?
                  </h3>
                  <p className="text-indigo-100 text-sm mt-1">
                    Head to the Design Hub to manage pipelines and track every stage of your work.
                  </p>
                </div>
                <Link
                  href="/pipelines"
                  className="px-5 py-2.5 bg-white/20 hover:bg-white/30 rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-2 backdrop-blur-sm"
                >
                  <Upload className="w-4 h-4" />
                  Design Hub
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ============ Analytics Dashboard (Owner / Staff / Superadmin) ============

function AnalyticsDashboard({ userName }: { userName: string }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsAPI
      .dashboard()
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Welcome back,{" "}
          <span className="text-indigo-600 dark:text-indigo-400">
            {userName}
          </span>
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Here&apos;s what&apos;s happening at Aurora Jewel Studio
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-[#12142a]/80 rounded-2xl border border-slate-200 dark:border-white/6 p-5 h-36 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
            <StatCard
              title="Total Leads"
              value={data?.leads.total || 0}
              subtitle="Instagram inquiries"
              icon={<Instagram className="w-6 h-6 text-white" />}
              gradient="linear-to-r from-pink-500 to-rose-600"
            />
            <StatCard
              title="Active Designs"
              value={data?.designs.total || 0}
              subtitle={`${data?.designs.completed || 0} completed`}
              icon={<Palette className="w-6 h-6 text-white" />}
              gradient="linear-to-r from-violet-500 to-purple-600"
            />
            <StatCard
              title="Conversion Rate"
              value={`${data?.leads.conversion_rate || 0}%`}
              subtitle="Leads to customers"
              icon={<TrendingUp className="w-6 h-6 text-white" />}
              gradient="linear-to-r from-emerald-500 to-teal-600"
            />
            <StatCard
              title="Price Hub"
              value={data?.price_lists_count || 0}
              subtitle="PDF conversions"
              icon={<FileSpreadsheet className="w-6 h-6 text-white" />}
              gradient="linear-to-r from-amber-500 to-orange-600"
            />
          </div>

          {/* Grid sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Interest Level Breakdown */}
            <div className="bg-white dark:bg-[#12142a]/80 rounded-2xl border border-slate-200 dark:border-white/6 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                Lead Interest Levels
              </h2>
              <div className="space-y-4">
                {[
                  {
                    label: "High Interest",
                    value: data?.leads.high_interest || 0,
                    color: "bg-rose-500",
                    total: data?.leads.total || 1,
                  },
                  {
                    label: "Medium Interest",
                    value: data?.leads.medium_interest || 0,
                    color: "bg-amber-500",
                    total: data?.leads.total || 1,
                  },
                  {
                    label: "Low Interest",
                    value: data?.leads.low_interest || 0,
                    color: "bg-slate-500",
                    total: data?.leads.total || 1,
                  },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-slate-500 dark:text-slate-400">
                        {item.label}
                      </span>
                      <span className="text-slate-900 dark:text-white font-medium">
                        {item.value}
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${item.color} rounded-full transition-all duration-700`}
                        style={{ width: `${(item.value / item.total) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Most Asked Products */}
            <div className="bg-white dark:bg-[#12142a]/80 rounded-2xl border border-slate-200 dark:border-white/6 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Gem className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                Most Asked Products
              </h2>
              {data?.most_asked_products &&
              data.most_asked_products.length > 0 ? (
                <div className="space-y-3">
                  {data.most_asked_products.map((product, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-white/6 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center justify-center">
                          {i + 1}
                        </span>
                        <span className="text-sm text-slate-700 dark:text-slate-300 capitalize">
                          {product.product}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-slate-900 dark:text-white">
                        {product.count} asks
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No product data yet
                </p>
              )}
            </div>

            {/* Design Status */}
            <div className="bg-white dark:bg-[#12142a]/80 rounded-2xl border border-slate-200 dark:border-white/6 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Palette className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                Design Hub Overview
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { stage: "reference", count: data?.designs.reference || 0 },
                  { stage: "cad_in_progress", count: data?.designs.cad_in_progress || 0 },
                  { stage: "cad_uploaded", count: data?.designs.cad_uploaded || 0 },
                  { stage: "completed", count: data?.designs.completed || 0 },
                ].map((item) => (
                  <div
                    key={item.stage}
                    className="bg-slate-50 dark:bg-white/5 rounded-xl p-4 border border-slate-200 dark:border-transparent"
                  >
                    <StatusBadge status={item.stage} />
                    <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                      {item.count}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Lead Status Distribution */}
            <div className="bg-white dark:bg-[#12142a]/80 rounded-2xl border border-slate-200 dark:border-white/6 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Instagram className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                Lead Status
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {["new", "interested", "ghosted", "bought"].map((status) => (
                  <div
                    key={status}
                    className="bg-slate-50 dark:bg-white/5 rounded-xl p-4 border border-slate-200 dark:border-transparent"
                  >
                    <StatusBadge status={status} type="lead" />
                    <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                      {data?.status_distribution?.[status] || 0}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ============ Main Dashboard Page ============

export default function DashboardPage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (user.role === "designer") {
    return <DesignerDashboard userName={user.name || "Designer"} />;
  }

  return <AnalyticsDashboard userName={user.name || "User"} />;
}
