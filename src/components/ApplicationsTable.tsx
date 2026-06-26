"use client";

import { Application, ApplicationStatus } from "@/types";
import { ExternalLink, Eye, Trash2, AlertCircle } from "lucide-react";

interface ApplicationsTableProps {
  applications: Application[];
  onSelect: (app: Application) => void;
  onUpdateStatus: (id: string, newStatus: ApplicationStatus) => void;
  onDelete: (id: string) => void;
}

const statusColors: Record<ApplicationStatus, string> = {
  WISHLIST: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  APPLIED: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  SCREENING: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  INTERVIEW: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  TECHNICAL: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  HR_ROUND: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  OFFER: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  REJECTED: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  GHOSTED: "bg-zinc-600/10 text-zinc-400 border-zinc-650/20",
  WITHDRAWN: "bg-zinc-700/10 text-zinc-500 border-zinc-700/20",
};

export default function ApplicationsTable({
  applications,
  onSelect,
  onUpdateStatus,
  onDelete,
}: ApplicationsTableProps) {
  const getDaysSinceActivity = (dateString: string | Date) => {
    const elapsed = Date.now() - new Date(dateString).getTime();
    return Math.floor(elapsed / (1000 * 60 * 60 * 24));
  };

  const formatDate = (dateString: string | Date) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  if (applications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-slate-900/30 border border-slate-800/80 rounded-2xl text-center">
        <AlertCircle className="w-12 h-12 text-slate-600 mb-4 animate-pulse" />
        <h3 className="text-lg font-semibold text-slate-350">No applications found</h3>
        <p className="text-sm text-slate-500 mt-1 max-w-sm">
          Try adjusting your search filters or add a new application to populate your board.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/20 backdrop-blur-sm">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-850 bg-slate-900/40 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <th className="py-4 px-5">Company & Role</th>
            <th className="py-4 px-5">Status</th>
            <th className="py-4 px-5">Platform</th>
            <th className="py-4 px-5">Applied Date</th>
            <th className="py-4 px-5">Last Activity</th>
            <th className="py-4 px-5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-850/60 text-sm text-slate-300">
          {applications.map((app) => {
            const daysSinceActivity = getDaysSinceActivity(app.lastActivity);
            const isStale = app.status === "APPLIED" && daysSinceActivity >= 5;

            return (
              <tr
                key={app.id}
                className="group hover:bg-slate-900/40 transition-colors duration-150 align-middle"
              >
                {/* Company & Role */}
                <td className="py-4 px-5">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-100 group-hover:text-violet-400 transition-colors">
                        {app.company}
                      </span>
                      {app.jobUrl && (
                        <a
                          href={app.jobUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-500 hover:text-slate-300 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {isStale && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-sm shadow-amber-500/5 animate-pulse">
                          <span className="w-1 h-1 rounded-full bg-amber-400" />
                          Going Cold ({daysSinceActivity}d)
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500 mt-0.5">{app.role}</span>
                  </div>
                </td>

                {/* Status Dropdown */}
                <td className="py-4 px-5">
                  <select
                    value={app.status}
                    onChange={(e) => onUpdateStatus(app.id, e.target.value as ApplicationStatus)}
                    onClick={(e) => e.stopPropagation()}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                      statusColors[app.status]
                    } bg-slate-950/80 outline-none cursor-pointer focus:ring-1 focus:ring-violet-500/20`}
                  >
                    <option value="WISHLIST">Wishlist</option>
                    <option value="APPLIED">Applied</option>
                    <option value="SCREENING">Screening</option>
                    <option value="INTERVIEW">Interview</option>
                    <option value="TECHNICAL">Technical</option>
                    <option value="HR_ROUND">HR Round</option>
                    <option value="OFFER">Offer</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="GHOSTED">Ghosted</option>
                    <option value="WITHDRAWN">Withdrawn</option>
                  </select>
                </td>

                {/* Platform Badge */}
                <td className="py-4 px-5">
                  <span className="inline-flex px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800/80 text-slate-300 border border-slate-750">
                    {app.platform}
                  </span>
                </td>

                {/* Applied Date */}
                <td className="py-4 px-5 text-slate-400 text-xs">
                  {formatDate(app.appliedDate)}
                </td>

                {/* Last Activity */}
                <td className="py-4 px-5">
                  <div className="flex flex-col">
                    <span className="text-slate-300 text-xs">
                      {formatDate(app.lastActivity)}
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5">
                      {daysSinceActivity === 0
                        ? "Active today"
                        : daysSinceActivity === 1
                        ? "Active yesterday"
                        : `${daysSinceActivity} days ago`}
                    </span>
                  </div>
                </td>

                {/* Actions */}
                <td className="py-4 px-5 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onSelect(app)}
                      className="p-1.5 text-slate-400 hover:text-violet-400 hover:bg-slate-800/60 rounded-lg transition-all duration-150"
                      title="View Details"
                    >
                      <Eye className="w-4.5 h-4.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Are you sure you want to delete this application to ${app.company}?`)) {
                          onDelete(app.id);
                        }
                      }}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all duration-150"
                      title="Delete Application"
                    >
                      <Trash2 className="w-4.5 h-4.5" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
