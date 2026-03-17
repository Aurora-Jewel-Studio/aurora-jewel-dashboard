"use client";

import { useEffect, useState } from "react";
import { analyticsAPI } from "@/lib/api";
import {
  BarChart3,
  TrendingUp,
  Users,
  Gem,
  Palette,
  ArrowUpRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface AnalyticsData {
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
    uploaded: number;
    pending: number;
    approved: number;
    ready_for_production: number;
  };
  designer_upload_counts: { designer: string; count: number }[];
  price_lists_count: number;
}

const COLORS = [
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#10b981",
  "#3b82f6",
  "#ec4899",
];

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsAPI
      .dashboard()
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-slate-200 dark:bg-[#12142a]/80 rounded-lg w-48 animate-pulse shadow-sm" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-[#12142a]/80 border border-slate-200 dark:border-white/6 rounded-2xl h-80 animate-pulse shadow-sm"
            />
          ))}
        </div>
      </div>
    );
  }

  const interestData = [
    { name: "High", value: data?.leads.high_interest || 0, color: "#ef4444" },
    {
      name: "Medium",
      value: data?.leads.medium_interest || 0,
      color: "#f59e0b",
    },
    { name: "Low", value: data?.leads.low_interest || 0, color: "#64748b" },
  ];

  const statusData = data?.status_distribution
    ? Object.entries(data.status_distribution).map(([key, value]) => ({
        name: key.charAt(0).toUpperCase() + key.slice(1),
        value,
      }))
    : [];

  const designPipelineData = data?.designs
    ? [
        { name: "Uploaded", count: data.designs.uploaded, color: "#3b82f6" },
        { name: "Pending", count: data.designs.pending, color: "#f59e0b" },
        { name: "Approved", count: data.designs.approved, color: "#10b981" },
        {
          name: "Production",
          count: data.designs.ready_for_production,
          color: "#8b5cf6",
        },
      ]
    : [];

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
          <BarChart3 className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
          Analytics
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Business insights and performance metrics
        </p>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: "Total Leads",
            value: data?.leads.total || 0,
            icon: <Users className="w-5 h-5" />,
            color: "text-pink-400",
            bg: "bg-pink-500/10",
          },
          {
            label: "Conversion Rate",
            value: `${data?.leads.conversion_rate || 0}%`,
            icon: <TrendingUp className="w-5 h-5" />,
            color: "text-emerald-400",
            bg: "bg-emerald-500/10",
          },
          {
            label: "Total Designs",
            value: data?.designs.total || 0,
            icon: <Palette className="w-5 h-5" />,
            color: "text-violet-400",
            bg: "bg-violet-500/10",
          },
          {
            label: "Price Lists",
            value: data?.price_lists_count || 0,
            icon: <Gem className="w-5 h-5" />,
            color: "text-amber-400",
            bg: "bg-amber-500/10",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white dark:bg-[#12142a]/80 rounded-2xl border border-slate-200 dark:border-white/6 p-5 shadow-sm"
          >
            <div
              className={`w-10 h-10 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center mb-3`}
            >
              {stat.icon}
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {stat.value}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Interest Level Distribution (Pie Chart) */}
        <div className="bg-white dark:bg-[#12142a]/80 rounded-2xl border border-slate-200 dark:border-white/6 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">
            Interest Level Distribution
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={interestData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {interestData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      stroke="transparent"
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    color: "#0f172a",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-2">
            {interestData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ background: item.color }}
                />
                <span className="text-xs text-slate-600 dark:text-slate-400">
                  {item.name} ({item.value})
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Lead Status (Bar Chart) */}
        <div className="bg-white dark:bg-[#12142a]/80 rounded-2xl border border-slate-200 dark:border-white/6 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">
            Lead Status Breakdown
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData} barSize={40}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f1f5f9"
                  className="dark:opacity-10"
                />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  axisLine={{ stroke: "#e2e8f0" }}
                />
                <YAxis
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  axisLine={{ stroke: "#e2e8f0" }}
                />
                <Tooltip
                  contentStyle={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    color: "#0f172a",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {statusData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Design Pipeline (Bar Chart) */}
        <div className="bg-white dark:bg-[#12142a]/80 rounded-2xl border border-slate-200 dark:border-white/6 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">
            Design Pipeline
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={designPipelineData} barSize={40}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f1f5f9"
                  className="dark:opacity-10"
                />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  axisLine={{ stroke: "#e2e8f0" }}
                />
                <YAxis
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  axisLine={{ stroke: "#e2e8f0" }}
                />
                <Tooltip
                  contentStyle={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    color: "#0f172a",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {designPipelineData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Products & Designers */}
        <div className="bg-white dark:bg-[#12142a]/80 rounded-2xl border border-slate-200 dark:border-white/6 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">
            Top Products & Designers
          </h2>

          <div className="space-y-6">
            {/* Most Asked Products */}
            <div>
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                Most Asked Products
              </h3>
              {data?.most_asked_products &&
              data.most_asked_products.length > 0 ? (
                <div className="space-y-2">
                  {data.most_asked_products.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold flex items-center justify-center">
                          {i + 1}
                        </span>
                        <span className="text-sm text-slate-700 dark:text-slate-300 capitalize">
                          {item.product}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                        {item.count}
                        <ArrowUpRight className="w-3 h-3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  No product data yet
                </p>
              )}
            </div>

            {/* Designer Upload Counts */}
            <div>
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                Designer Uploads
              </h3>
              {data?.designer_upload_counts &&
              data.designer_upload_counts.length > 0 ? (
                <div className="space-y-2">
                  {data.designer_upload_counts.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-2"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-[10px] font-bold text-indigo-700 dark:text-indigo-400">
                          {item.designer.charAt(0)}
                        </div>
                        <span className="text-sm text-slate-700 dark:text-slate-300">
                          {item.designer}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {item.count} designs
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  No upload data yet
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
