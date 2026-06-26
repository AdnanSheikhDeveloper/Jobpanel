"use client";

import { useState } from "react";
import { Application, ApplicationStatus } from "@/types";
import { Briefcase, MapPin, Calendar, AlertTriangle } from "lucide-react";

interface ApplicationsKanbanProps {
  applications: Application[];
  onSelect: (app: Application) => void;
  onUpdateStatus: (id: string, newStatus: ApplicationStatus) => void;
}

const columns: { label: string; status: ApplicationStatus; colorClass: string }[] = [
  { label: "Wishlist", status: "WISHLIST", colorClass: "border-t-slate-500" },
  { label: "Applied", status: "APPLIED", colorClass: "border-t-blue-500" },
  { label: "Screening", status: "SCREENING", colorClass: "border-t-amber-500" },
  { label: "Interview", status: "INTERVIEW", colorClass: "border-t-violet-500" },
  { label: "Technical", status: "TECHNICAL", colorClass: "border-t-indigo-500" },
  { label: "HR Round", status: "HR_ROUND", colorClass: "border-t-pink-500" },
  { label: "Offer", status: "OFFER", colorClass: "border-t-emerald-500" },
  { label: "Rejected", status: "REJECTED", colorClass: "border-t-rose-500" },
  { label: "Ghosted", status: "GHOSTED", colorClass: "border-t-zinc-650" },
  { label: "Withdrawn", status: "WITHDRAWN", colorClass: "border-t-zinc-700" },
];

export default function ApplicationsKanban({
  applications,
  onSelect,
  onUpdateStatus,
}: ApplicationsKanbanProps) {
  const [activeColumn, setActiveColumn] = useState<ApplicationStatus | null>(null);

  const getDaysSinceActivity = (dateString: string | Date) => {
    const elapsed = Date.now() - new Date(dateString).getTime();
    return Math.floor(elapsed / (1000 * 60 * 60 * 24));
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, status: ApplicationStatus) => {
    e.preventDefault();
    if (activeColumn !== status) {
      setActiveColumn(status);
    }
  };

  const handleDragLeave = () => {
    setActiveColumn(null);
  };

  const handleDrop = (e: React.DragEvent, status: ApplicationStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (id) {
      onUpdateStatus(id, status);
    }
    setActiveColumn(null);
  };

  return (
    <div className="w-full overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-slate-950">
      <div className="flex gap-4 min-w-[1800px] h-[70vh] items-stretch">
        {columns.map((col) => {
          const colApps = applications.filter((app) => app.status === col.status);
          const isOver = activeColumn === col.status;

          return (
            <div
              key={col.status}
              onDragOver={(e) => handleDragOver(e, col.status)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.status)}
              className={`flex-1 flex flex-col min-w-[280px] bg-slate-900/10 border ${
                isOver ? "border-violet-500/40 bg-slate-900/40" : "border-slate-850"
              } rounded-2xl p-4 transition-all duration-200 ${col.colorClass} border-t-2`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-850/60">
                <span className="font-semibold text-sm text-slate-350">{col.label}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-750">
                  {colApps.length}
                </span>
              </div>

              {/* Column Cards Container */}
              <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-1">
                {colApps.map((app) => {
                  const daysSinceActivity = getDaysSinceActivity(app.lastActivity);
                  const isStale = app.status === "APPLIED" && daysSinceActivity >= 5;

                  return (
                    <div
                      key={app.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, app.id)}
                      onClick={() => onSelect(app)}
                      className="p-4 rounded-xl bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800 hover:border-slate-700/80 cursor-grab active:cursor-grabbing transition-all duration-200 group relative select-none shadow-md shadow-slate-950/20"
                    >
                      <div className="flex flex-col gap-2">
                        {/* Company & Platform */}
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-semibold text-slate-200 group-hover:text-violet-400 transition-colors truncate">
                            {app.company}
                          </span>
                          <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-750 shrink-0">
                            {app.platform}
                          </span>
                        </div>

                        {/* Role */}
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <Briefcase className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span className="truncate">{app.role}</span>
                        </div>

                        {/* Location */}
                        {app.location && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <MapPin className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{app.location}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between border-t border-slate-850/60 pt-2 mt-1">
                          {/* Activity date */}
                          <div className="flex items-center gap-1 text-[10px] text-slate-500">
                            <Calendar className="w-3 h-3 shrink-0" />
                            <span>{daysSinceActivity === 0 ? "Active today" : `${daysSinceActivity}d ago`}</span>
                          </div>

                          {/* Salary display */}
                          {(app.salaryMin || app.salaryMax) && (
                            <span className="text-[10px] font-medium text-slate-400">
                              {app.salaryMin ? `${app.salaryMin / 1000}k` : "0"}-
                              {app.salaryMax ? `${app.salaryMax / 1000}k` : "0"} {app.salaryCurrency}
                            </span>
                          )}
                        </div>

                        {/* Stale Going Cold badge */}
                        {isStale && (
                          <div className="mt-2 flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-sm animate-pulse w-fit">
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            <span>Going Cold ({daysSinceActivity}d)</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {colApps.length === 0 && (
                  <div className="h-full flex items-center justify-center border-2 border-dashed border-slate-850 rounded-xl p-6 text-center text-xs text-slate-600 pointer-events-none select-none min-h-[100px]">
                    Drag cards here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
