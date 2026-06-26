"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Table, Kanban, LogOut, Loader2, AlertCircle, Sparkles } from "lucide-react";
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
  }, [statusFilter, searchQuery, selectedApp]);

  // Load on mount and filter changes
  useEffect(() => {
    fetchApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

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
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              Applications Command Center
            </h1>
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
