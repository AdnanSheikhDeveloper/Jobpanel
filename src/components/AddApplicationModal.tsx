"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { Platform, ApplicationStatus } from "@/types";

interface AddApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddApplicationModal({ isOpen, onClose, onSuccess }: AddApplicationModalProps) {
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [platform, setPlatform] = useState<Platform>("LINKEDIN");
  const [status, setStatus] = useState<ApplicationStatus>("APPLIED");
  const [location, setLocation] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [salaryCurrency, setSalaryCurrency] = useState("INR");
  const [notes, setNotes] = useState("");
  const [appliedDate, setAppliedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company || !role || !platform) {
      setError("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    setError("");

    const payload = {
      company,
      role,
      platform,
      status,
      location: location || null,
      jobUrl: jobUrl || null,
      salaryMin: salaryMin ? parseInt(salaryMin) : null,
      salaryMax: salaryMax ? parseInt(salaryMax) : null,
      salaryCurrency,
      notes: notes || null,
      appliedDate: new Date(appliedDate).toISOString(),
      lastActivity: new Date().toISOString(),
    };

    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || "Failed to create application");
      }

      onSuccess();
      // Reset form
      setCompany("");
      setRole("");
      setPlatform("LINKEDIN");
      setStatus("APPLIED");
      setLocation("");
      setJobUrl("");
      setSalaryMin("");
      setSalaryMax("");
      setSalaryCurrency("INR");
      setNotes("");
      setAppliedDate(new Date().toISOString().split("T")[0]);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 md:p-8 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 transition-colors p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
          Add New Application
        </h2>
        <p className="text-sm text-slate-400 mb-6">
          Track a new job opportunity in your dashboard.
        </p>

        {error && <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-sm text-rose-400 mb-6">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Company Name *
              </label>
              <input
                type="text"
                required
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Google"
                className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl focus:border-violet-500/80 focus:ring-1 focus:ring-violet-500/30 outline-none text-slate-100 placeholder-slate-600 transition-all duration-200"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Role *
              </label>
              <input
                type="text"
                required
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Fullstack Developer"
                className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl focus:border-violet-500/80 focus:ring-1 focus:ring-violet-500/30 outline-none text-slate-100 placeholder-slate-600 transition-all duration-200"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Platform *
              </label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as Platform)}
                className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl focus:border-violet-500/80 focus:ring-1 focus:ring-violet-500/30 outline-none text-slate-100 transition-all duration-200"
              >
                <option value="LINKEDIN">LinkedIn</option>
                <option value="NAUKRI">Naukri</option>
                <option value="INDEED">Indeed</option>
                <option value="WELLFOUND">Wellfound</option>
                <option value="REFERRAL">Referral</option>
                <option value="DIRECT_EMAIL">Direct Email</option>
                <option value="COMPANY_SITE">Company Site</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Status *
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ApplicationStatus)}
                className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl focus:border-violet-500/80 focus:ring-1 focus:ring-violet-500/30 outline-none text-slate-100 transition-all duration-200"
              >
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

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Remote, Dubai"
                className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl focus:border-violet-500/80 focus:ring-1 focus:ring-violet-500/30 outline-none text-slate-100 placeholder-slate-600 transition-all duration-200"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Applied Date
              </label>
              <input
                type="date"
                value={appliedDate}
                onChange={(e) => setAppliedDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl focus:border-violet-500/80 focus:ring-1 focus:ring-violet-500/30 outline-none text-slate-100 transition-all duration-200"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Job Posting URL
              </label>
              <input
                type="url"
                value={jobUrl}
                onChange={(e) => setJobUrl(e.target.value)}
                placeholder="e.g. https://linkedin.com/jobs/..."
                className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl focus:border-violet-500/80 focus:ring-1 focus:ring-violet-500/30 outline-none text-slate-100 placeholder-slate-600 transition-all duration-200"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2 space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Salary Range
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={salaryMin}
                    onChange={(e) => setSalaryMin(e.target.value)}
                    placeholder="Min"
                    className="w-full px-3 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl focus:border-violet-500/80 focus:ring-1 focus:ring-violet-500/30 outline-none text-slate-100 placeholder-slate-600 transition-all duration-200 text-sm"
                  />
                  <span className="text-slate-600">—</span>
                  <input
                    type="number"
                    value={salaryMax}
                    onChange={(e) => setSalaryMax(e.target.value)}
                    placeholder="Max"
                    className="w-full px-3 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl focus:border-violet-500/80 focus:ring-1 focus:ring-violet-500/30 outline-none text-slate-100 placeholder-slate-600 transition-all duration-200 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Curr
                </label>
                <select
                  value={salaryCurrency}
                  onChange={(e) => setSalaryCurrency(e.target.value)}
                  className="w-full px-2 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl focus:border-violet-500/80 focus:ring-1 focus:ring-violet-500/30 outline-none text-slate-100 transition-all duration-200 text-sm"
                >
                  <option value="INR">INR (₹)</option>
                  <option value="AED">AED (د.إ)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Notes / Key Details
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Reached out to HM directly. Tech stack is React Native + NestJS."
              rows={3}
              className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl focus:border-violet-500/80 focus:ring-1 focus:ring-violet-500/30 outline-none text-slate-100 placeholder-slate-600 transition-all duration-200 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-slate-800 hover:border-slate-700 rounded-xl font-semibold text-slate-300 hover:text-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 active:scale-[0.98] transition-all duration-200 flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Save Application"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
