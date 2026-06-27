"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  TrendingUp,
  Sparkles,
  FileText,
  ArrowLeft,
  LogOut,
  Loader2,
  AlertCircle,
  Briefcase,
  Layers,
  Percent,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

interface AnalyticsSummary {
  dailyGoal: {
    id: string;
    date: string | Date;
    applyTarget: number;
    applyDone: number;
    outreachTarget: number;
    outreachDone: number;
  };
  funnel: Record<string, number>;
  rates: {
    totalApplications: number;
    responseRate: number;
    interviewRate: number;
    offerRate: number;
  };
  platformStats: Array<{
    platform: string;
    total: number;
    responses: number;
    rate: number;
  }>;
  staleApplications: Array<{
    id: string;
    company: string;
    role: string;
    lastActivity: string | Date;
  }>;
  thisWeekCount: number;
  lastWeekCount: number;
  weeklyTrend: Array<{
    label: string;
    count: number;
  }>;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchAnalyticsSummary();
  }, []);

  const fetchAnalyticsSummary = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/analytics/summary");
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      } else {
        throw new Error("Failed to fetch analytics summary.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // Format funnel data for Recharts
  const funnelChartData = summary
    ? [
        { name: "Wishlist", count: summary.funnel.WISHLIST },
        { name: "Applied", count: summary.funnel.APPLIED },
        { name: "Screening", count: summary.funnel.SCREENING },
        {
          name: "Interviewing",
          count:
            summary.funnel.INTERVIEW +
            summary.funnel.TECHNICAL +
            summary.funnel.HR_ROUND,
        },
        { name: "Offers", count: summary.funnel.OFFER },
      ]
    : [];

  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Background glowing effects */}
      <div className="absolute top-[-25%] left-[-15%] w-[600px] h-[600px] rounded-full bg-violet-600/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-25%] right-[-15%] w-[600px] h-[600px] rounded-full bg-indigo-600/10 blur-[130px] pointer-events-none" />

      {/* Navigation Header */}
      <header className="w-full border-b border-slate-900 bg-slate-950/40 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center font-bold text-lg text-white shadow-lg shadow-violet-500/20">
              C
            </div>
            <span
              className="font-semibold text-lg tracking-tight bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent cursor-pointer"
              onClick={() => router.push("/")}
            >
              CareerHQ
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-900/30 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-all duration-200 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Applications
            </button>
            <button
              onClick={() => router.push("/outreach")}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-900/30 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-all duration-200 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              AI Outreach Studio
            </button>
            <button
              onClick={() => router.push("/resume")}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-900/30 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-all duration-200 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-violet-400" />
              Resume Vault
            </button>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-900/30 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-all duration-200 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 space-y-8 z-10 relative">
        {/* Intro */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-violet-400" />
              Analytics Command Center
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Visualize your funnel conversions, platform response rates, and application cadence.
            </p>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-3 p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
            <span className="text-sm text-slate-500 font-medium">Compiling dashboard analytics...</span>
          </div>
        ) : summary ? (
          <div className="space-y-8">
            {/* Rates Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                {
                  label: "Response Rate",
                  value: `${summary.rates.responseRate}%`,
                  desc: "Percentage of sent applications that received any answer",
                  icon: Percent,
                  color: "text-violet-400",
                },
                {
                  label: "Interview Rate",
                  value: `${summary.rates.interviewRate}%`,
                  desc: "Percentage of sent applications reaching screening or interview stages",
                  icon: Layers,
                  color: "text-indigo-400",
                },
                {
                  label: "Offer Rate",
                  value: `${summary.rates.offerRate}%`,
                  desc: "Percentage of sent applications resulting in job offers",
                  icon: Briefcase,
                  color: "text-emerald-450",
                },
              ].map((card, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-slate-900/40 border border-slate-900 backdrop-blur-sm space-y-2 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                      {card.label}
                    </span>
                    <card.icon className={`w-4 h-4 ${card.color}`} />
                  </div>
                  <div>
                    <h2 className={`text-4xl font-extrabold tracking-tight ${card.color}`}>
                      {card.value}
                    </h2>
                    <p className="text-[11px] text-slate-500 mt-1">{card.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Recharts Graphical Visuals */}
            {mounted && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 4-Week Volume Trend */}
                <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-900 backdrop-blur-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-violet-400" />
                      <h3 className="font-semibold text-slate-200">Application Volume (Last 4 Weeks)</h3>
                    </div>
                  </div>
                  <div className="h-[280px] w-full mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={summary.weeklyTrend}
                        margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                        <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#0f172a",
                            border: "1px solid #1e293b",
                            borderRadius: "12px",
                            fontSize: "12px",
                            color: "#f8fafc",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="count"
                          stroke="#8b5cf6"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorCount)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Pipeline Funnel breakdown */}
                <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-900 backdrop-blur-sm space-y-4">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-violet-400" />
                    <h3 className="font-semibold text-slate-200">Funnel Conversion Breakdown</h3>
                  </div>
                  <div className="h-[280px] w-full mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={funnelChartData}
                        margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                        <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#0f172a",
                            border: "1px solid #1e293b",
                            borderRadius: "12px",
                            fontSize: "12px",
                            color: "#f8fafc",
                          }}
                        />
                        <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={45} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Platform Effectiveness Chart */}
                <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-900 backdrop-blur-sm space-y-4 lg:col-span-2">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-violet-400" />
                    <h3 className="font-semibold text-slate-200">Platform Performance Comparison</h3>
                  </div>
                  <div className="h-[300px] w-full mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={summary.platformStats}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="platform" stroke="#64748b" fontSize={11} />
                        <YAxis yAxisId="left" stroke="#64748b" fontSize={11} label={{ value: 'Applications', angle: -90, position: 'insideLeft', style: { fill: '#64748b', fontSize: 10 } }} />
                        <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={11} unit="%" label={{ value: 'Response Rate', angle: 90, position: 'insideRight', style: { fill: '#64748b', fontSize: 10 } }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#0f172a",
                            border: "1px solid #1e293b",
                            borderRadius: "12px",
                            fontSize: "12px",
                            color: "#f8fafc",
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                        <Bar yAxisId="left" dataKey="total" name="Total Applications" fill="#312e81" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        <Bar yAxisId="left" dataKey="responses" name="Responses" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        <Bar yAxisId="right" dataKey="rate" name="Response Rate (%)" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={15} opacity={0.8} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
            <AlertCircle className="w-8 h-8" />
            <span className="text-sm font-medium">No analytics data could be compiled.</span>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-900 bg-slate-950/20 py-6 text-center text-xs text-slate-500 z-10 relative">
        &copy; {new Date().getFullYear()} CareerHQ. All rights reserved.
      </footer>
    </div>
  );
}
