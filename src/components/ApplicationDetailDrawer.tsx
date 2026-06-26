"use client";

import { useState, useEffect } from "react";
import { X, Calendar, UserPlus, Bell, Check, Loader2, Link, Mail } from "lucide-react";
import { Application, Contact, FollowUp } from "@/types";

interface ApplicationDetailDrawerProps {
  application: Application | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export default function ApplicationDetailDrawer({
  application,
  isOpen,
  onClose,
  onRefresh,
}: ApplicationDetailDrawerProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);

  // Add Contact Form State
  const [cName, setCName] = useState("");
  const [cRole, setCRole] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cLinkedin, setCLinkedin] = useState("");
  const [addingContact, setAddingContact] = useState(false);

  // Add Follow-up Form State
  const [fDate, setFDate] = useState("");
  const [fNote, setFNote] = useState("");
  const [addingFollowUp, setAddingFollowUp] = useState(false);

  const [loadingContacts, setLoadingContacts] = useState(false);
  const [error, setError] = useState("");

  // Load Contacts and Follow-ups
  useEffect(() => {
    if (!application || !isOpen) return;

    // Reset forms
    setCName("");
    setCRole("");
    setCEmail("");
    setCLinkedin("");
    setFDate("");
    setFNote("");
    setError("");

    // Set lists
    setContacts(application.contacts || []);
    setFollowUps(application.followUps || []);

    const fetchDetails = async () => {
      setLoadingContacts(true);
      try {
        const [cRes] = await Promise.all([
          fetch(`/api/contacts?applicationId=${application.id}`),
          // We can fetch follow-ups if we want, but since they are included in application, or we can fetch them. Let's just fetch contacts to be sure.
        ]);

        if (cRes.ok) {
          const cData = await cRes.json();
          setContacts(cData);
        }
      } catch (err: unknown) {
        console.error("Failed to load details:", err);
      } finally {
        setLoadingContacts(false);
      }
    };

    fetchDetails();
  }, [application, isOpen]);

  if (!isOpen || !application) return null;

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cName) return;

    setAddingContact(true);
    setError("");

    try {
      const response = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cName,
          role: cRole || null,
          email: cEmail || null,
          linkedinUrl: cLinkedin || null,
          applicationId: application.id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add contact");
      }

      const newContact = await response.json();
      setContacts((prev) => [newContact, ...prev]);

      // Reset Form
      setCName("");
      setCRole("");
      setCEmail("");
      setCLinkedin("");

      // Notify parent to refresh list (as lastActivity has changed)
      onRefresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save contact");
    } finally {
      setAddingContact(false);
    }
  };

  const handleAddFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fDate) return;

    setAddingFollowUp(true);
    setError("");

    try {
      const response = await fetch("/api/followups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dueDate: new Date(fDate).toISOString(),
          note: fNote || null,
          applicationId: application.id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add follow-up");
      }

      const newFollowUp = await response.json();
      setFollowUps((prev) => [newFollowUp, ...prev]);

      // Reset Form
      setFDate("");
      setFNote("");

      // Notify parent to refresh
      onRefresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save follow-up");
    } finally {
      setAddingFollowUp(false);
    }
  };

  const toggleFollowUp = async (id: string, currentCompleted: boolean) => {
    try {
      // Optimistic Update
      setFollowUps((prev) =>
        prev.map((f) => (f.id === id ? { ...f, completed: !currentCompleted } : f))
      );

      const response = await fetch(`/api/followups/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !currentCompleted }),
      });

      if (!response.ok) {
        throw new Error("Failed to toggle follow-up");
      }

      onRefresh();
    } catch (err: unknown) {
      console.error(err);
      // Revert if error
      setFollowUps((prev) =>
        prev.map((f) => (f.id === id ? { ...f, completed: currentCompleted } : f))
      );
    }
  };

  const formatDate = (dateString: string | Date) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    });
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-950/50 backdrop-blur-sm">
      {/* Click outside overlay */}
      <div className="absolute inset-0 -z-10" onClick={onClose} />

      {/* Drawer Body */}
      <div className="w-full max-w-lg bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl relative animate-slide-in">
        {/* Header */}
        <div className="p-6 border-b border-slate-850 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-100">{application.company}</h2>
            <p className="text-sm text-slate-400 mt-0.5">{application.role}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors p-1.5 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin">
          {error && <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-sm">{error}</div>}

          {/* Details Overview */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Overview</h3>
            <div className="grid grid-cols-2 gap-4 bg-slate-950/40 p-4 rounded-xl border border-slate-850/60">
              <div>
                <span className="text-[10px] text-slate-500 block">Status</span>
                <span className="text-sm font-semibold text-slate-350">{application.status}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Platform</span>
                <span className="text-sm font-semibold text-slate-350">{application.platform}</span>
              </div>
              {application.location && (
                <div>
                  <span className="text-[10px] text-slate-500 block">Location</span>
                  <span className="text-sm text-slate-350">{application.location}</span>
                </div>
              )}
              {(application.salaryMin || application.salaryMax) && (
                <div>
                  <span className="text-[10px] text-slate-500 block">Salary Range</span>
                  <span className="text-sm text-slate-350">
                    {application.salaryMin ? `${application.salaryMin / 1000}k` : "0"}-
                    {application.salaryMax ? `${application.salaryMax / 1000}k` : "0"}{" "}
                    {application.salaryCurrency}
                  </span>
                </div>
              )}
              {application.jobUrl && (
                <div className="col-span-2">
                  <span className="text-[10px] text-slate-500 block">Posting Link</span>
                  <a
                    href={application.jobUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-violet-400 hover:text-violet-300 transition-colors break-all flex items-center gap-1.5 mt-0.5"
                  >
                    <Link className="w-3.5 h-3.5 shrink-0" />
                    Visit Job Post
                  </a>
                </div>
              )}
            </div>

            {application.notes && (
              <div className="bg-slate-950/20 p-4 rounded-xl border border-slate-850/60">
                <span className="text-[10px] text-slate-500 block mb-1">Notes</span>
                <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-wrap">
                  {application.notes}
                </p>
              </div>
            )}
          </div>

          {/* Follow-up Reminders */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Follow-up Checklist
            </h3>

            {/* List */}
            <div className="space-y-2">
              {followUps.map((f) => (
                <div
                  key={f.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
                    f.completed
                      ? "bg-slate-950/20 border-slate-850/40 opacity-55"
                      : "bg-slate-950/50 border-slate-850"
                  }`}
                >
                  <button
                    onClick={() => toggleFollowUp(f.id, f.completed)}
                    className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer ${
                      f.completed
                        ? "bg-emerald-600 border-emerald-500 text-white"
                        : "border-slate-700 hover:border-slate-500 bg-slate-950"
                    }`}
                  >
                    {f.completed && <Check className="w-3.5 h-3.5" />}
                  </button>
                  <div className="flex-1">
                    <p className={`text-sm ${f.completed ? "line-through text-slate-500" : "text-slate-200"}`}>
                      {f.note || "Follow up check-in"}
                    </p>
                    <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-1">
                      <Calendar className="w-3 h-3" />
                      <span>Due {formatDate(f.dueDate)}</span>
                    </div>
                  </div>
                </div>
              ))}

              {followUps.length === 0 && (
                <p className="text-xs text-slate-500 italic p-2">No follow-ups scheduled yet.</p>
              )}
            </div>

            {/* Add Follow-up Form */}
            <form onSubmit={handleAddFollowUp} className="bg-slate-950/40 p-4 rounded-xl border border-slate-850/60 space-y-3">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-violet-400 shrink-0" />
                <span className="text-xs font-semibold text-slate-300">Schedule Reminder</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  required
                  value={fDate}
                  onChange={(e) => setFDate(e.target.value)}
                  className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 outline-none focus:border-violet-500"
                />
                <input
                  type="text"
                  required
                  placeholder="Follow-up note"
                  value={fNote}
                  onChange={(e) => setFNote(e.target.value)}
                  className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 outline-none focus:border-violet-500 placeholder-slate-600"
                />
              </div>
              <button
                type="submit"
                disabled={addingFollowUp}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700/80 rounded-lg text-xs font-semibold text-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {addingFollowUp ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Scheduling...
                  </>
                ) : (
                  "Schedule Follow-up"
                )}
              </button>
            </form>
          </div>

          {/* Linked Contacts */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Recruiter & Hiring Contacts
            </h3>

            {/* List */}
            <div className="space-y-2">
              {loadingContacts ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-violet-500" />
                </div>
              ) : (
                contacts.map((c) => (
                  <div
                    key={c.id}
                    className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-850/60 flex items-start justify-between gap-4"
                  >
                    <div>
                      <div className="font-semibold text-sm text-slate-200">{c.name}</div>
                      {c.role && <div className="text-xs text-slate-500 mt-0.5">{c.role}</div>}
                      <div className="flex items-center gap-3 mt-2">
                        {c.email && (
                          <a
                            href={`mailto:${c.email}`}
                            className="text-[10px] text-slate-400 hover:text-violet-400 flex items-center gap-1 transition-colors"
                          >
                            <Mail className="w-3 h-3" />
                            Email
                          </a>
                        )}
                        {c.linkedinUrl && (
                          <a
                            href={c.linkedinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-slate-400 hover:text-violet-400 flex items-center gap-1 transition-colors"
                          >
                            <Link className="w-3 h-3" />
                            LinkedIn
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}

              {!loadingContacts && contacts.length === 0 && (
                <p className="text-xs text-slate-500 italic p-2">No contacts logged.</p>
              )}
            </div>

            {/* Add Contact Form */}
            <form onSubmit={handleAddContact} className="bg-slate-950/40 p-4 rounded-xl border border-slate-850/60 space-y-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-violet-400 shrink-0" />
                <span className="text-xs font-semibold text-slate-300">Add Recruiter / Contact</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  placeholder="Name *"
                  value={cName}
                  onChange={(e) => setCName(e.target.value)}
                  className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 outline-none focus:border-violet-500 placeholder-slate-600"
                />
                <input
                  type="text"
                  placeholder="Role (e.g. Recruiter)"
                  value={cRole}
                  onChange={(e) => setCRole(e.target.value)}
                  className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 outline-none focus:border-violet-500 placeholder-slate-600"
                />
                <input
                  type="email"
                  placeholder="Email address"
                  value={cEmail}
                  onChange={(e) => setCEmail(e.target.value)}
                  className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 outline-none focus:border-violet-500 placeholder-slate-600"
                />
                <input
                  type="url"
                  placeholder="LinkedIn Profile URL"
                  value={cLinkedin}
                  onChange={(e) => setCLinkedin(e.target.value)}
                  className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 outline-none focus:border-violet-500 placeholder-slate-600"
                />
              </div>
              <button
                type="submit"
                disabled={addingContact}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700/80 rounded-lg text-xs font-semibold text-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {addingContact ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Contact"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
