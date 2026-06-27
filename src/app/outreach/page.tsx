"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Copy,
  Check,
  Send,
  Save,
  Search,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  Briefcase,
  ExternalLink,
  ArrowLeft,
  Clock,
  LogOut,
  FileText,
  BarChart3,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Application, OutreachType } from "@/types";

interface OutreachLog {
  id: string;
  type: OutreachType;
  prompt: string;
  output: string;
  sent: boolean;
  applicationId: string | null;
  createdAt: string | Date;
  application?: {
    company: string;
    role: string;
  } | null;
}

const typeLabels: Record<OutreachType, string> = {
  COLD_EMAIL: "Cold Email",
  LINKEDIN_DM: "LinkedIn DM",
  COVER_LETTER: "Cover Letter",
  FOLLOW_UP: "Follow Up",
};

export default function OutreachPage() {
  const router = useRouter();
  const supabase = createClient();

  // Data State
  const [applications, setApplications] = useState<Application[]>([]);
  const [logs, setLogs] = useState<OutreachLog[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Form State
  const [selectedAppId, setSelectedAppId] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [messageType, setMessageType] = useState<OutreachType>("LINKEDIN_DM");
  const [keyRequirement, setKeyRequirement] = useState("");

  // Editor State
  const [draftText, setDraftText] = useState("");
  const [copied, setCopied] = useState(false);

  // History Filter
  const [searchHistory, setSearchHistory] = useState("");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Fetch applications list
  const fetchApplications = async () => {
    setLoadingApps(true);
    try {
      const res = await fetch("/api/applications");
      if (res.ok) {
        const data = await res.json();
        setApplications(data);
      }
    } catch (err) {
      console.error("Failed to load applications:", err);
    } finally {
      setLoadingApps(false);
    }
  };

  // Fetch history logs
  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const params = new URLSearchParams();
      if (searchHistory) {
        params.append("search", searchHistory);
      }
      const res = await fetch(`/api/outreach/log?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error("Failed to load history logs:", err);
    } finally {
      setLoadingHistory(false);
    }
  }, [searchHistory]);

  useEffect(() => {
    fetchApplications();
    fetchHistory();

    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const appIdParam = searchParams.get("appId");
      const companyParam = searchParams.get("company");
      const roleParam = searchParams.get("role");
      const typeParam = searchParams.get("type");

      if (appIdParam) setSelectedAppId(appIdParam);
      if (companyParam) setCompany(companyParam);
      if (roleParam) setRole(roleParam);
      if (
        typeParam &&
        ["COLD_EMAIL", "LINKEDIN_DM", "COVER_LETTER", "FOLLOW_UP"].includes(typeParam)
      ) {
        setMessageType(typeParam as OutreachType);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [searchHistory, fetchHistory]);

  // Handle linking from Application select dropdown
  const handleSelectApplication = (appId: string) => {
    setSelectedAppId(appId);
    if (!appId) {
      setCompany("");
      setRole("");
      return;
    }
    const app = applications.find((a) => a.id === appId);
    if (app) {
      setCompany(app.company);
      setRole(app.role);
    }
  };

  // Generate Message Action
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company || !role || !messageType) {
      setError("Please fill in the Company, Role, and Type fields.");
      return;
    }

    setGenerating(true);
    setError("");
    setSuccessMessage("");

    try {
      const res = await fetch("/api/outreach/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company,
          role,
          messageType,
          keyRequirement: keyRequirement || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate outreach message.");
      }

      const data = await res.json();
      setDraftText(data.draft);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setGenerating(false);
    }
  };

  // Save/Log outreach
  const handleSaveLog = async (sent: boolean) => {
    if (!draftText) return;

    setSaving(true);
    setError("");
    setSuccessMessage("");

    const promptSummary = `Generated ${typeLabels[messageType]} for ${role} at ${company}.${
      keyRequirement ? ` Key req: ${keyRequirement}` : ""
    }`;

    try {
      const res = await fetch("/api/outreach/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: messageType,
          prompt: promptSummary,
          output: draftText,
          sent,
          applicationId: selectedAppId || null,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save outreach log.");
      }

      setSuccessMessage(
        sent ? "Outreach successfully logged as Sent!" : "Draft successfully saved to history."
      );
      fetchHistory();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save log.");
    } finally {
      setSaving(false);
    }
  };

  // Copy to Clipboard
  const handleCopy = () => {
    if (!draftText) return;
    navigator.clipboard.writeText(draftText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Load previous log back into editor
  const handleLoadFromHistory = (log: OutreachLog) => {
    setCompany(log.application?.company || "");
    setRole(log.application?.role || "");
    setMessageType(log.type);
    setSelectedAppId(log.applicationId || "");
    setDraftText(log.output);
    setSuccessMessage("Loaded message from history into editor.");
  };

  const formatDate = (dateString: string | Date) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const handleSignOut = async () => {
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
              onClick={() => router.push("/")}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-900/30 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-all duration-200 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Applications
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
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-violet-400 animate-pulse" />
            AI Outreach Studio
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Generate high-conversion cold outreach DMs, emails, and cover letters matching your real background.
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-3 p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="flex items-start gap-3 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-sm">
            <Check className="w-5 h-5 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Generate and Editor Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-stretch">
          {/* Form Panel */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/40 border border-slate-900 backdrop-blur-sm flex flex-col justify-between space-y-6">
            <h2 className="text-lg font-bold text-slate-200 border-b border-slate-850/60 pb-2">
              Outreach Builder
            </h2>

            <form onSubmit={handleGenerate} className="space-y-4 flex-1">
              {/* Optional Link to App */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Link to Application (Optional)
                </label>
                <select
                  value={selectedAppId}
                  onChange={(e) => handleSelectApplication(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl outline-none text-xs text-slate-300 focus:border-violet-500 cursor-pointer"
                >
                  <option value="">-- No Application Linked --</option>
                  {loadingApps ? (
                    <option disabled>Loading applications...</option>
                  ) : (
                    applications.map((app) => (
                      <option key={app.id} value={app.id}>
                        {app.company} — {app.role} ({app.status})
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Company */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Company Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Google"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl outline-none text-xs text-slate-200 placeholder-slate-600 focus:border-violet-500"
                />
              </div>

              {/* Role */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Target Role *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. React Native Developer"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl outline-none text-xs text-slate-200 placeholder-slate-600 focus:border-violet-500"
                />
              </div>

              {/* Message Type */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Outreach Format *
                </label>
                <select
                  value={messageType}
                  onChange={(e) => setMessageType(e.target.value as OutreachType)}
                  className="w-full px-3 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl outline-none text-xs text-slate-300 focus:border-violet-500 cursor-pointer"
                >
                  <option value="LINKEDIN_DM">LinkedIn DM (Concise)</option>
                  <option value="COLD_EMAIL">Cold Email (with Subject)</option>
                  <option value="COVER_LETTER">Cover Letter (Tailored)</option>
                  <option value="FOLLOW_UP">Follow Up (Brief check-in)</option>
                </select>
              </div>

              {/* Key Job Requirement */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Key Requirement / Skills Requested (Optional)
                </label>
                <textarea
                  placeholder="e.g. Deep integration with calendar APIs, or complex native modules for mobile push notifications"
                  value={keyRequirement}
                  onChange={(e) => setKeyRequirement(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl outline-none text-xs text-slate-200 placeholder-slate-600 focus:border-violet-500 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={generating || !company || !role}
                className="w-full py-3 rounded-xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed pt-4"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating Outreach...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Outreach
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Editor/Output Panel */}
          <div className="lg:col-span-3 p-6 rounded-2xl bg-slate-900/40 border border-slate-900 backdrop-blur-sm flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between border-b border-slate-850/60 pb-2">
              <h2 className="text-lg font-bold text-slate-200">Generated Draft</h2>
              {draftText && (
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 px-2 py-1 rounded bg-slate-800 border border-slate-750 transition-all cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy Text
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="flex-1 flex flex-col items-stretch">
              {draftText ? (
                <textarea
                  value={draftText}
                  onChange={(e) => setDraftText(e.target.value)}
                  className="w-full h-full min-h-[300px] p-4 bg-slate-950/60 border border-slate-850 rounded-xl outline-none text-sm text-slate-200 font-sans leading-relaxed focus:border-violet-500/50 resize-y"
                />
              ) : (
                <div className="h-full min-h-[300px] flex flex-col items-center justify-center border border-dashed border-slate-850 rounded-xl p-8 text-center text-slate-600 bg-slate-950/20">
                  <Sparkles className="w-8 h-8 text-slate-700 mb-2 animate-pulse" />
                  <p className="text-sm font-semibold">Your generated draft will appear here</p>
                  <p className="text-xs text-slate-650 mt-1 max-w-xs">
                    Fill in the form fields on the left and click Generate to run the AI engine.
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            {draftText && (
              <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => handleSaveLog(false)}
                  disabled={saving}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-900/30 text-xs font-bold text-slate-350 hover:text-slate-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  Save as Draft
                </button>
                <button
                  onClick={() => handleSaveLog(true)}
                  disabled={saving}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-lg shadow-violet-650/10"
                >
                  <Send className="w-4 h-4" />
                  Mark as Sent & Save
                </button>
              </div>
            )}
          </div>
        </div>

        {/* History Section */}
        <div className="p-6 rounded-2xl bg-slate-900/20 border border-slate-900 backdrop-blur-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-850/60 pb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-200">Outreach History Logs</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Browse, filter, and review previously generated message drafts.
              </p>
            </div>

            {/* History Search */}
            <div className="relative w-full sm:max-w-xs">
              <input
                type="text"
                placeholder="Search history..."
                value={searchHistory}
                onChange={(e) => setSearchHistory(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl outline-none text-xs text-slate-200 placeholder-slate-650 focus:border-violet-500"
              />
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-550">
                <Search className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>

          {/* History List */}
          {loadingHistory ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-850 rounded-xl text-slate-650 text-xs italic">
              No historical logs match your search.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {logs.map((log) => {
                const isExpanded = expandedLogId === log.id;

                return (
                  <div
                    key={log.id}
                    className="p-4 rounded-xl bg-slate-900/30 border border-slate-850 flex flex-col justify-between gap-3 hover:border-slate-750 transition-colors"
                  >
                    <div>
                      {/* Top labels */}
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-slate-850 text-slate-350 border border-slate-750">
                            {typeLabels[log.type]}
                          </span>
                          <span
                            className={`ml-2 inline-flex px-2 py-0.5 rounded text-[10px] font-bold border ${
                              log.sent
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : "bg-slate-700/10 text-slate-400 border-slate-700/20"
                            }`}
                          >
                            {log.sent ? "Sent" : "Draft"}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-550 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(log.createdAt)}
                        </span>
                      </div>

                      {/* Header details */}
                      <div className="mt-3 flex items-start gap-2">
                        <Briefcase className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-semibold text-sm text-slate-300">
                            {log.application ? log.application.company : "Unlinked Outreach"}
                          </p>
                          {log.application && (
                            <p className="text-xs text-slate-550">{log.application.role}</p>
                          )}
                        </div>
                      </div>

                      {/* Description Summary */}
                      <p className="text-[11px] text-slate-500 italic mt-2 line-clamp-1 border-t border-slate-850/40 pt-2">
                        {log.prompt}
                      </p>

                      {/* Message Preview / Expanded */}
                      <div className="mt-3">
                        {isExpanded ? (
                          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-850 text-xs text-slate-400 leading-relaxed whitespace-pre-wrap font-mono max-h-[250px] overflow-y-auto">
                            {log.output}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-405 line-clamp-3 leading-relaxed">
                            {log.output}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between border-t border-slate-850/40 pt-3 mt-1">
                      <button
                        onClick={() => handleLoadFromHistory(log)}
                        className="text-xs font-semibold text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Load to Editor
                      </button>

                      <button
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        className="text-slate-500 hover:text-slate-300 transition-colors p-1"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4.5 h-4.5" />
                        ) : (
                          <ChevronDown className="w-4.5 h-4.5" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-900 bg-slate-950/20 py-6 text-center text-xs text-slate-500 z-10 relative">
        &copy; {new Date().getFullYear()} CareerHQ. All rights reserved.
      </footer>
    </div>
  );
}
