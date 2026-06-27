"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Table, Kanban, LogOut, Loader2, AlertCircle, Sparkles, FileText, BarChart3, Target, TrendingUp, ArrowUpRight, ChevronDown, ChevronUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Application, ApplicationStatus } from "@/types";

// Components
import ApplicationsTable from "@/components/ApplicationsTable";
import ApplicationsKanban from "@/components/ApplicationsKanban";
import AddApplicationModal from "@/components/AddApplicationModal";
import ApplicationDetailDrawer from "@/components/ApplicationDetailDrawer";

export default function HomePage() {
  const router = useRouter();
  const supabase = createClient();

  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Views & Filters State
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Modal & Drawer State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);

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

  // Dashboard Overview States
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [showDashboard, setShowDashboard] = useState(true);
  const [showGoalEdit, setShowGoalEdit] = useState(false);
  const [newApplyTarget, setNewApplyTarget] = useState(5);
  const [newOutreachTarget, setNewOutreachTarget] = useState(10);
  const [updatingGoal, setUpdatingGoal] = useState(false);

  // Fetch summary callback
  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch("/api/analytics/summary");
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
        setNewApplyTarget(data.dailyGoal.applyTarget);
        setNewOutreachTarget(data.dailyGoal.outreachTarget);
      }
    } catch (err) {
      console.error("Failed to load summary stats:", err);
    }
  }, []);

  // Fetch Applications
  const fetchApplications = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") {
        params.append("status", statusFilter);
      }
      if (searchQuery) {
        params.append("search", searchQuery);
      }

      const response = await fetch(`/api/applications?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch applications.");
      }

      const data = await response.json();
      setApplications(data);

      // Refresh Summary
      fetchSummary();

      // If drawer is open, update selectedApp reference with fresh data
      if (selectedApp) {
        const freshApp = data.find((app: Application) => app.id === selectedApp.id);
        if (freshApp) {
          setSelectedApp(freshApp);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery, selectedApp, fetchSummary]);

  // Load on mount and filter changes
  useEffect(() => {
    fetchApplications();
    fetchSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const handleMarkFollowedUp = async (id: string) => {
    try {
      const response = await fetch(`/api/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lastActivity: new Date().toISOString() }),
      });
      if (response.ok) {
        fetchApplications();
      } else {
        throw new Error("Failed to update activity");
      }
    } catch (err) {
      console.error("Failed to mark followed up:", err);
    }
  };

  const handleSaveGoals = async () => {
    setUpdatingGoal(true);
    try {
      const res = await fetch("/api/analytics/summary", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applyTarget: Number(newApplyTarget),
          outreachTarget: Number(newOutreachTarget),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSummary((prev) =>
          prev
            ? {
                ...prev,
                dailyGoal: data,
              }
            : null
        );
        setShowGoalEdit(false);
      }
    } catch (err) {
      console.error("Failed to save goals:", err);
    } finally {
      setUpdatingGoal(false);
    }
  };

  // Handle Search Input on Enter or debounce-like effect
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchApplications();
  };

  // Inline update handler
  const handleUpdateStatus = async (id: string, newStatus: ApplicationStatus) => {
    // Optimistic Update
    setApplications((prev) =>
      prev.map((app) =>
        app.id === id
          ? {
              ...app,
              status: newStatus,
              lastActivity: new Date().toISOString(),
            }
          : app
      )
    );

    try {
      const response = await fetch(`/api/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update status");
      }

      // Refresh applications lists
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      if (searchQuery) params.append("search", searchQuery);
      const res = await fetch(`/api/applications?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setApplications(data);
      }
    } catch (err: unknown) {
      console.error(err);
      setError("Failed to update status. Please try again.");
      fetchApplications(); // Revert on failure
    }
  };

  // Delete Handler
  const handleDeleteApplication = async (id: string) => {
    try {
      const response = await fetch(`/api/applications/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete application");
      }

      // Close drawer if deleted app was open
      if (selectedApp?.id === id) {
        setSelectedApp(null);
      }

      setApplications((prev) => prev.filter((app) => app.id !== id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete application");
    }
  };

  // Logout Handler
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

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
            <span className="font-semibold text-lg tracking-tight bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
              CareerHQ
            </span>
          </div>

          <div className="flex items-center gap-4">
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
              onClick={() => router.push("/analytics")}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-900/30 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-all duration-200 cursor-pointer"
            >
              <BarChart3 className="w-3.5 h-3.5 text-violet-400" />
              Analytics
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-900/30 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-all duration-200 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Panel */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 space-y-6 z-10 relative">
        {/* Page title and top actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                Applications Command Center
              </h1>
              <button
                onClick={() => setShowDashboard(!showDashboard)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900/30 text-[10px] font-semibold text-slate-400 hover:text-slate-200 transition cursor-pointer mt-1"
              >
                {showDashboard ? (
                  <>
                    <ChevronUp className="w-3 h-3 text-violet-400" />
                    Hide Summary
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3 h-3 text-violet-400" />
                    Show Summary
                  </>
                )}
              </button>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Track and manage all your job postings, stages, contacts, and follow-ups.
            </p>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-650/15 active:scale-[0.98] transition-all duration-250 cursor-pointer text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Application
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-3 p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Dashboard Section */}
        {showDashboard && summary && (
          <div className="space-y-6 animate-fade-in">
            {/* Stale Applications Banner */}
            {summary.staleApplications && summary.staleApplications.length > 0 && (
              <div className="p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 text-amber-300 text-sm space-y-3">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertCircle className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span>{summary.staleApplications.length} Application{summary.staleApplications.length > 1 ? "s" : ""} require attention (stale for 5+ days)</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {summary.staleApplications.map((app) => (
                    <div key={app.id} className="p-3 rounded-xl bg-slate-950/80 border border-slate-900 flex flex-col justify-between gap-2.5">
                      <div>
                        <div className="font-bold text-slate-200 text-xs sm:text-sm">{app.company}</div>
                        <div className="text-xs text-slate-400">{app.role}</div>
                        <div className="text-[10px] text-slate-500 mt-1">Stale since {new Date(app.lastActivity).toLocaleDateString()}</div>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <button
                          onClick={() => handleMarkFollowedUp(app.id)}
                          className="flex-1 text-center py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-[11px] font-semibold text-slate-350 transition cursor-pointer"
                        >
                          Followed Up
                        </button>
                        <button
                          onClick={() =>
                            router.push(
                              `/outreach?appId=${app.id}&company=${encodeURIComponent(app.company)}&role=${encodeURIComponent(app.role)}&type=FOLLOW_UP`
                            )
                          }
                          className="flex-1 text-center py-1.5 rounded-lg bg-violet-600/20 border border-violet-500/30 hover:border-violet-500/50 text-[11px] font-semibold text-violet-300 transition cursor-pointer"
                        >
                          Draft Follow Up
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dashboard Cards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Daily Goals Tracking */}
              <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-900 backdrop-blur-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-violet-400" />
                    <h3 className="font-semibold text-slate-200">Today&apos;s Habits</h3>
                  </div>
                  <button
                    onClick={() => setShowGoalEdit(!showGoalEdit)}
                    className="text-xs text-violet-400 hover:text-violet-300 font-medium cursor-pointer"
                  >
                    {showGoalEdit ? "Cancel" : "Edit Targets"}
                  </button>
                </div>

                {showGoalEdit ? (
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-900 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-1">Apply Target</label>
                        <input
                          type="number"
                          value={newApplyTarget}
                          onChange={(e) => setNewApplyTarget(Number(e.target.value))}
                          className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 outline-none text-xs"
                          min="0"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-1">Outreach Target</label>
                        <input
                          type="number"
                          value={newOutreachTarget}
                          onChange={(e) => setNewOutreachTarget(Number(e.target.value))}
                          className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 outline-none text-xs"
                          min="0"
                        />
                      </div>
                    </div>
                    <button
                      onClick={handleSaveGoals}
                      disabled={updatingGoal}
                      className="w-full py-1.5 rounded-lg bg-violet-650 hover:bg-violet-550 text-xs font-semibold transition cursor-pointer text-white"
                    >
                      {updatingGoal ? "Saving..." : "Save Targets"}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* App Progress */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-400">Applications Sent</span>
                        <span className="text-slate-200">
                          {summary.dailyGoal.applyDone} / {summary.dailyGoal.applyTarget}
                        </span>
                      </div>
                      <div className="w-full bg-slate-950 rounded-full h-2 border border-slate-900 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-violet-600 to-indigo-500 h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(
                              100,
                              (summary.dailyGoal.applyDone / summary.dailyGoal.applyTarget) * 100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Outreach Progress */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-400">Outreach Sent</span>
                        <span className="text-slate-200">
                          {summary.dailyGoal.outreachDone} / {summary.dailyGoal.outreachTarget}
                        </span>
                      </div>
                      <div className="w-full bg-slate-950 rounded-full h-2 border border-slate-900 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-violet-600 to-indigo-500 h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(
                              100,
                              (summary.dailyGoal.outreachDone / summary.dailyGoal.outreachTarget) * 100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Pipeline funnel overview */}
              <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-900 backdrop-blur-sm space-y-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-violet-400" />
                  <h3 className="font-semibold text-slate-200">Pipeline Funnel</h3>
                </div>

                <div className="grid grid-cols-5 gap-2 text-center">
                  {[
                    { label: "Wishlist", count: summary.funnel.WISHLIST, color: "text-slate-500" },
                    { label: "Applied", count: summary.funnel.APPLIED, color: "text-indigo-400" },
                    { label: "Screening", count: summary.funnel.SCREENING, color: "text-amber-400" },
                    {
                      label: "Interview",
                      count:
                        summary.funnel.INTERVIEW +
                        summary.funnel.TECHNICAL +
                        summary.funnel.HR_ROUND,
                      color: "text-violet-400",
                    },
                    { label: "Offer", count: summary.funnel.OFFER, color: "text-emerald-500 font-bold" },
                  ].map((stage, idx) => (
                    <div key={idx} className="flex flex-col items-center justify-between p-2 rounded-xl bg-slate-950/40 border border-slate-900/60">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block truncate w-full">
                        {stage.label}
                      </span>
                      <span className={`text-lg font-extrabold mt-1 block ${stage.color}`}>
                        {stage.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Weekly compare stats */}
              <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-900 backdrop-blur-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-violet-400" />
                    <h3 className="font-semibold text-slate-200">Weekly Pace</h3>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-2">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-500 uppercase block tracking-wider">This Week</span>
                    <span className="text-2xl font-extrabold text-slate-200">{summary.thisWeekCount}</span>
                    <span className="text-[10px] text-slate-500 block">applications</span>
                  </div>

                  <div className="h-8 w-px bg-slate-800" />

                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-500 uppercase block tracking-wider">Last Week</span>
                    <span className="text-2xl font-extrabold text-slate-400">{summary.lastWeekCount}</span>
                    <span className="text-[10px] text-slate-500 block">applications</span>
                  </div>

                  <div className="h-8 w-px bg-slate-800" />

                  <div className="flex flex-col items-end justify-center">
                    {summary.thisWeekCount >= summary.lastWeekCount ? (
                      <div className="flex items-center gap-1 text-emerald-450 font-bold text-sm bg-emerald-500/10 px-2 py-1 rounded-lg">
                        <span>+{(summary.thisWeekCount - summary.lastWeekCount)}</span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-rose-450 font-bold text-sm bg-rose-500/10 px-2 py-1 rounded-lg">
                        <span>-{(summary.lastWeekCount - summary.thisWeekCount)}</span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-rose-400 rotate-90" />
                      </div>
                    )}
                    <span className="text-[8px] text-slate-500 uppercase block tracking-wider mt-1 text-right">vs Last Week</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Toolbar (Filters and View Toggles) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/40 border border-slate-900 backdrop-blur-sm">
          {/* Search and Filters */}
          <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search company or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl focus:border-violet-500/85 outline-none text-sm text-slate-200 placeholder-slate-600 transition-all duration-200"
              />
              <button
                type="submit"
                className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 hover:text-slate-300"
              >
                <Search className="w-4 h-4" />
              </button>
            </form>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl outline-none text-sm text-slate-300 focus:border-violet-500 transition-colors cursor-pointer"
            >
              <option value="ALL">All Stages</option>
              <option value="WISHLIST">Wishlist</option>
              <option value="APPLIED">Applied</option>
              <option value="SCREENING">Screening</option>
              <option value="INTERVIEW">Interview</option>
              <option value="TECHNICAL">Technical Round</option>
              <option value="HR_ROUND">HR Round</option>
              <option value="OFFER">Offer</option>
              <option value="REJECTED">Rejected</option>
              <option value="GHOSTED">Ghosted</option>
              <option value="WITHDRAWN">Withdrawn</option>
            </select>
          </div>

          {/* View Toggles */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-850 self-end sm:self-auto">
            <button
              onClick={() => setViewMode("table")}
              className={`p-2 rounded-lg transition-all cursor-pointer ${
                viewMode === "table" ? "bg-slate-800 text-violet-400" : "text-slate-500 hover:text-slate-350"
              }`}
              title="Table View"
            >
              <Table className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("kanban")}
              className={`p-2 rounded-lg transition-all cursor-pointer ${
                viewMode === "kanban" ? "bg-slate-800 text-violet-400" : "text-slate-500 hover:text-slate-350"
              }`}
              title="Kanban Board"
            >
              <Kanban className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Board Contents */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
            <span className="text-sm text-slate-500">Loading your board...</span>
          </div>
        ) : viewMode === "table" ? (
          <ApplicationsTable
            applications={applications}
            onSelect={setSelectedApp}
            onUpdateStatus={handleUpdateStatus}
            onDelete={handleDeleteApplication}
          />
        ) : (
          <ApplicationsKanban
            applications={applications}
            onSelect={setSelectedApp}
            onUpdateStatus={handleUpdateStatus}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-900 bg-slate-950/20 py-6 text-center text-xs text-slate-500 z-10 relative">
        &copy; {new Date().getFullYear()} CareerHQ. All rights reserved.
      </footer>

      {/* Modals and Side Drawers */}
      <AddApplicationModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={fetchApplications}
      />

      <ApplicationDetailDrawer
        application={selectedApp}
        isOpen={selectedApp !== null}
        onClose={() => setSelectedApp(null)}
        onRefresh={fetchApplications}
      />
    </div>
  );
}
