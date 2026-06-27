"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  Sparkles,
  CheckCircle2,
  FileText,
  Loader2,
  AlertCircle,
  FileCheck2,
  LogOut,
  ArrowLeft,
  Plus,
  BarChart3,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface ResumeVersion {
  id: string;
  label: string;
  fileUrl: string;
  targetRole: string | null;
  atsScore: number | null;
  feedback: string | null;
  isActive: boolean;
  createdAt: string | Date;
}

export default function ResumeVaultPage() {
  const router = useRouter();
  const supabase = createClient();

  const [resumes, setResumes] = useState<ResumeVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [mounted, setMounted] = useState(false);

  // Upload Form State
  const [file, setFile] = useState<File | null>(null);
  const [label, setLabel] = useState("");
  const [uploading, setUploading] = useState(false);

  // Score Form State
  const [jobDescription, setJobDescription] = useState("");
  const [scoring, setScoring] = useState(false);
  const [scanResult, setScanResult] = useState<{ score: number; feedback: string } | null>(null);

  // Tailored Assets State
  const [tailoring, setTailoring] = useState(false);
  const [tailoredAssets, setTailoredAssets] = useState<{
    tailoredResume: string;
    coverLetter: string;
    coldEmail: string;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<"resume" | "coverLetter" | "coldEmail">("resume");

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchResumes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/resume/active");
      if (res.ok) {
        const data = await res.json();
        setResumes(data);
      } else {
        throw new Error("Failed to load resumes.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResumes();
  }, [fetchResumes]);

  const activeResume = resumes.find((r) => r.isActive);

  // File selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== "application/pdf") {
        setError("Only PDF files are supported.");
        return;
      }
      setFile(selectedFile);
      setError("");
    }
  };

  // Upload Resume handler
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setError("");
    setSuccess("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("label", label);

    try {
      const res = await fetch("/api/resume/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to upload resume.");
      }

      setSuccess("Resume version successfully uploaded!");
      setFile(null);
      setLabel("");
      fetchResumes();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to upload.");
    } finally {
      setUploading(false);
    }
  };

  // Toggle active version
  const handleToggleActive = async (id: string) => {
    try {
      // Optimistic state update
      setResumes((prev) => prev.map((r) => ({ ...r, isActive: r.id === id })));

      const res = await fetch("/api/resume/active", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) {
        throw new Error("Failed to toggle active status.");
      }

      fetchResumes();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update active resume.");
      fetchResumes();
    }
  };

  // Run ATS Scorer
  const handleScoreResume = async () => {
    if (!activeResume || !jobDescription) return;

    setScoring(true);
    setError("");
    setSuccess("");
    setScanResult(null);
    setTailoredAssets(null);

    try {
      const res = await fetch("/api/resume/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeId: activeResume.id,
          jobDescription,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to score resume.");
      }

      const data = await res.json();
      setScanResult({
        score: data.atsScore,
        feedback: data.feedback,
      });
      setSuccess("ATS scan completed successfully!");
      fetchResumes(); // Update list to show new score
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to score resume.");
    } finally {
      setScoring(false);
    }
  };

  // Run Auto-Tailoring
  const handleAutoTailor = async () => {
    if (!activeResume || !jobDescription) return;

    setTailoring(true);
    setError("");
    setSuccess("");
    setTailoredAssets(null);

    try {
      const res = await fetch("/api/resume/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeId: activeResume.id,
          jobDescription,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to tailor assets.");
      }

      const data = await res.json();
      setTailoredAssets({
        tailoredResume: data.tailoredResume,
        coverLetter: data.coverLetter,
        coldEmail: data.coldEmail,
      });
      setSuccess("Tailored application assets generated successfully!");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to tailor assets.");
    } finally {
      setTailoring(false);
    }
  };

  // Copy Active Asset
  const handleCopyActiveAsset = () => {
    if (!tailoredAssets) return;
    let text = "";
    if (activeTab === "resume") text = tailoredAssets.tailoredResume;
    else if (activeTab === "coverLetter") text = tailoredAssets.coverLetter;
    else if (activeTab === "coldEmail") text = tailoredAssets.coldEmail;

    navigator.clipboard.writeText(text);
    setSuccess("Copied to clipboard!");
    setTimeout(() => setSuccess(""), 2000);
  };

  // Download Active Asset
  const handleDownloadActiveAsset = () => {
    if (!tailoredAssets) return;
    let text = "";
    let filename = "";

    if (activeTab === "resume") {
      text = tailoredAssets.tailoredResume;
      filename = `Tailored_Resume_${activeResume?.label.replace(/\s+/g, "_") || "version"}.md`;
    } else if (activeTab === "coverLetter") {
      text = tailoredAssets.coverLetter;
      filename = "Cover_Letter.md";
    } else if (activeTab === "coldEmail") {
      text = tailoredAssets.coldEmail;
      filename = "Cold_Email_Pitch.txt";
    }

    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setSuccess(`Downloaded ${filename}!`);
    setTimeout(() => setSuccess(""), 2000);
  };

  // Export active asset to PDF using browser printing
  const handleExportPDF = () => {
    if (!tailoredAssets) return;

    let contentHtml = "";
    let title = "";

    const parseMarkdown = (md: string) => {
      // Basic markdown parser for professional styling
      return md
        // Headers
        .replace(/^# (.*$)/gim, '<h1 style="font-size: 22px; font-weight: 800; text-align: center; margin-bottom: 2px; text-transform: uppercase; color: #0f172a;">$1</h1>')
        .replace(/^## (.*$)/gim, '<h2 style="font-size: 13px; font-weight: bold; margin-top: 14px; margin-bottom: 6px; border-bottom: 1.5px solid #0f172a; padding-bottom: 2px; text-transform: uppercase; letter-spacing: 0.5px; color: #0f172a;">$1</h2>')
        .replace(/^### (.*$)/gim, '<h3 style="font-size: 11px; font-weight: bold; margin-top: 8px; margin-bottom: 4px; display: flex; justify-content: space-between; color: #1e293b;"><span>$1</span></h3>')
        // Bold
        .replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: bold; color: #0f172a;">$1</strong>')
        // Lists (group consecutive items)
        .replace(/^\s*[-*]\s+(.*$)/gim, '<li style="margin-bottom: 4px; font-size: 10.5px; line-height: 1.45; color: #334155;">$1</li>')
        // Linebreaks
        .split('\n').map(line => {
          if (line.trim().startsWith('<li') || line.trim().startsWith('<h') || line.trim() === '') {
            return line;
          }
          return line + '<br/>';
        }).join('\n');
    };

    if (activeTab === "resume") {
      title = `Tailored_Resume_${activeResume?.label.replace(/\s+/g, "_") || "version"}`;
      contentHtml = `
        <div class="resume-container">
          ${parseMarkdown(tailoredAssets.tailoredResume)}
        </div>
      `;
    } else if (activeTab === "coverLetter") {
      title = "Tailored_Cover_Letter";
      contentHtml = `
        <div class="cover-letter-container" style="max-width: 600px; margin: 0 auto; padding-top: 20px;">
          ${parseMarkdown(tailoredAssets.coverLetter)}
        </div>
      `;
    } else {
      return; // Email pitch doesn't need PDF export
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      setError("Pop-up blocker prevented opening print window. Please allow pop-ups for this site.");
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            @page {
              size: letter;
              margin: 18mm 20mm;
            }
            body {
              font-family: 'Calibri', 'Arial', sans-serif;
              color: #334155;
              line-height: 1.4;
              font-size: 10.5px;
              background: #ffffff;
              margin: 0;
              padding: 0;
            }
            h1, h2, h3, strong {
              color: #0f172a;
            }
            ul {
              margin-top: 4px;
              margin-bottom: 6px;
              padding-left: 18px;
            }
            li {
              margin-bottom: 3px;
            }
            .resume-container h3 span {
              display: flex;
              width: 100%;
              justify-content: space-between;
            }
            p {
              margin-top: 0;
              margin-bottom: 8px;
            }
            @media print {
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          \${contentHtml}
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 300);
            };
          </script>
        </body>
      </html>
    `.replace("\\${contentHtml}", contentHtml));
    printWindow.document.close();
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // Prepare chart data (resumes with scores, sorted chronologically)
  const chartData = resumes
    .filter((r) => r.atsScore !== null)
    .map((r) => ({
      name: r.label.substring(0, 10),
      score: r.atsScore,
    }))
    .reverse();

  const formatDate = (dateString: string | Date) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
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
              onClick={() => router.push("/outreach")}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-900/30 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-all duration-200 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              AI Outreach Studio
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
            <FileText className="w-6 h-6 text-violet-400" />
            Resume Vault
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage your resume versions and analyze them with Gemini against target job postings.
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-3 p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 text-sm animate-fade-in">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-start gap-3 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-sm animate-fade-in">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {/* Left panel: Upload Form & Version List */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            {/* Upload form */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-900 backdrop-blur-sm space-y-4">
              <h2 className="text-md font-bold text-slate-200 border-b border-slate-850 pb-2">
                Upload New Version
              </h2>

              <form onSubmit={handleUpload} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Resume File (PDF only) *
                  </label>
                  <div className="relative border border-dashed border-slate-800 rounded-xl p-4 bg-slate-950/40 hover:border-slate-700 transition-colors flex flex-col items-center justify-center text-center cursor-pointer min-h-[100px]">
                    <input
                      type="file"
                      required
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <Upload className="w-6 h-6 text-slate-600 mb-2" />
                    <span className="text-xs text-slate-400 font-semibold truncate max-w-[200px]">
                      {file ? file.name : "Select PDF resume"}
                    </span>
                    <span className="text-[10px] text-slate-500 mt-1">PDF up to 5MB</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Version Label *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. v3 — UAE Fintech Focus"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl outline-none text-xs text-slate-200 placeholder-slate-650 focus:border-violet-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={uploading || !file || !label}
                  className="w-full py-2.5 rounded-xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Upload Resume
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* List of resumes */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-900 backdrop-blur-sm space-y-4 flex-1 flex flex-col justify-between">
              <h2 className="text-md font-bold text-slate-200 border-b border-slate-850 pb-2">
                Versions Directory
              </h2>

              <div className="space-y-3 overflow-y-auto max-h-[40vh] pr-1 flex-1">
                {loading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
                  </div>
                ) : resumes.length === 0 ? (
                  <p className="text-xs text-slate-600 italic">No resumes uploaded yet.</p>
                ) : (
                  resumes.map((res) => (
                    <div
                      key={res.id}
                      className={`p-4 rounded-xl border transition-colors flex items-center justify-between gap-4 ${
                        res.isActive
                          ? "bg-violet-900/10 border-violet-500/30"
                          : "bg-slate-950/40 border-slate-850/60"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-xs text-slate-200 truncate">{res.label}</p>
                        <p className="text-[9px] text-slate-550 mt-1">Uploaded {formatDate(res.createdAt)}</p>
                        {res.atsScore !== null && (
                          <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-800 text-slate-400 border border-slate-750 mt-2">
                            ATS Score: {res.atsScore}
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => handleToggleActive(res.id)}
                        disabled={res.isActive}
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all border ${
                          res.isActive
                            ? "bg-violet-600 border-violet-500 text-white cursor-default"
                            : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-750 cursor-pointer"
                        }`}
                      >
                        {res.isActive ? "Active" : "Activate"}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right panel: ATS Scorer & Feedback */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/40 border border-slate-900 backdrop-blur-sm flex flex-col justify-between space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-200 border-b border-slate-850 pb-2 flex items-center gap-1.5">
                <Sparkles className="w-5 h-5 text-violet-400 animate-pulse" />
                ATS suitablility scanner
              </h2>
              <p className="text-xs text-slate-500 mt-1.5">
                Scans the currently active resume against your pasted job description.
              </p>
            </div>

            {/* Scorer control */}
            <div className="space-y-4 flex-1 flex flex-col justify-between">
              {activeResume ? (
                <div className="space-y-4 flex-1 flex flex-col">
                  <div className="p-3 bg-violet-950/20 border border-violet-900/40 rounded-xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <FileCheck2 className="w-5 h-5 text-violet-400 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">
                          Active Scanning Target
                        </span>
                        <span className="text-xs font-semibold text-slate-300 truncate block">
                          {activeResume.label}
                        </span>
                      </div>
                    </div>
                    <a
                      href={activeResume.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-semibold text-violet-400 hover:text-violet-300 transition-colors shrink-0"
                    >
                      View PDF
                    </a>
                  </div>

                  <div className="space-y-2 flex-1 flex flex-col">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Paste Target Job Description *
                    </label>
                    <textarea
                      required
                      placeholder="Paste the job description keywords and requirements here..."
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      className="w-full flex-1 min-h-[160px] p-3 bg-slate-950/60 border border-slate-850 rounded-xl outline-none text-xs text-slate-200 placeholder-slate-650 focus:border-violet-500/50 resize-y"
                    />
                  </div>

                  <button
                    onClick={handleScoreResume}
                    disabled={scoring || !jobDescription}
                    className="w-full py-3 rounded-xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                  >
                    {scoring ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Analyzing Suitability Gaps...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Score Active Resume
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 border border-dashed border-slate-850 rounded-xl text-center text-slate-600 min-h-[250px] bg-slate-950/10">
                  <FileText className="w-8 h-8 text-slate-700 mb-2" />
                  <p className="text-xs font-semibold">Please upload and activate a resume</p>
                  <p className="text-[10px] text-slate-650 mt-1 max-w-[200px] mx-auto">
                    We need a scanning target. Upload a PDF version and toggle it to Active.
                  </p>
                </div>
              )}
            </div>

            {/* Results Drawer */}
            {(scanResult || activeResume?.atsScore !== null) && (
              <div className="border-t border-slate-850 pt-4 space-y-4 max-h-[35vh] overflow-y-auto pr-1 scrollbar-thin">
                <div className="flex items-center gap-4">
                  {/* Score circle */}
                  <div className="w-16 h-16 rounded-full bg-slate-950 border-2 border-violet-500/30 flex flex-col items-center justify-center shadow-lg shadow-violet-500/5 shrink-0">
                    <span className="text-xl font-extrabold text-violet-400">
                      {scanResult ? scanResult.score : activeResume?.atsScore}
                    </span>
                    <span className="text-[8px] uppercase tracking-wider text-slate-500 font-bold">
                      ATS
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-200">Analysis Feedback</h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Suitability scanner result and missing keywords breakdown.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-850 text-xs text-slate-400 leading-relaxed whitespace-pre-wrap font-sans max-h-[200px] overflow-y-auto">
                  {scanResult ? scanResult.feedback : activeResume?.feedback}
                </div>
              </div>
            )}

            {/* Tailored Match Assistant */}
            {scanResult && jobDescription && (
              <div className="mt-4 p-4 rounded-xl bg-slate-900/40 border border-slate-850 space-y-4">
                {scanResult.score < 85 ? (
                  <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10 text-amber-300 text-xs">
                    <AlertCircle className="w-4 h-4 text-amber-450 shrink-0 mt-0.5 animate-pulse" />
                    <div>
                      <span className="font-bold">Recommendation:</span> Your score is below 85%. We recommend tailoring your resume specifically for this job description to hit &gt;85-90% ATS score.
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2.5 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10 text-emerald-300 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">ATS Score Strong!</span> Your resume is well-suited for this job description. You can still generate tailored assets to optimize your application package.
                    </div>
                  </div>
                )}

                {!tailoredAssets && !tailoring && (
                  <button
                    onClick={handleAutoTailor}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-xs hover:from-violet-500 hover:to-indigo-500 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-violet-500/10 active:scale-[0.98]"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Tailor Resume &amp; Generate Assets
                  </button>
                )}

                {tailoring && (
                  <div className="flex flex-col items-center justify-center p-6 text-center space-y-2">
                    <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
                    <p className="text-xs font-bold text-slate-350">AI is tailoring your resume &amp; drafts...</p>
                    <p className="text-[10px] text-slate-500 max-w-xs mx-auto">
                      Gemini is rewriting your experience bullets with target keywords and metrics, drafting a custom cover letter, and generating an email pitch template.
                    </p>
                  </div>
                )}

                {tailoredAssets && (
                  <div className="space-y-3">
                    <div className="flex border-b border-slate-800">
                      {(["resume", "coverLetter", "coldEmail"] as const).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          className={`px-3 py-1.5 text-xs font-bold capitalize transition border-b-2 cursor-pointer -mb-[1px] ${
                            activeTab === tab
                              ? "border-violet-500 text-violet-400"
                              : "border-transparent text-slate-500 hover:text-slate-300"
                          }`}
                        >
                          {tab === "resume" ? "Tailored Resume" : tab === "coverLetter" ? "Cover Letter" : "Email Pitch"}
                        </button>
                      ))}
                    </div>

                    <div className="relative p-3 rounded-lg bg-slate-950/80 border border-slate-850 max-h-[220px] overflow-y-auto font-mono text-[10px] text-slate-300 whitespace-pre-wrap leading-relaxed scrollbar-thin">
                      {activeTab === "resume" && tailoredAssets.tailoredResume}
                      {activeTab === "coverLetter" && tailoredAssets.coverLetter}
                      {activeTab === "coldEmail" && tailoredAssets.coldEmail}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={handleCopyActiveAsset}
                        className="flex-1 py-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-350 text-[10px] font-bold transition cursor-pointer text-center"
                      >
                        Copy Text
                      </button>
                      <button
                        onClick={handleDownloadActiveAsset}
                        className="flex-1 py-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-350 text-[10px] font-bold transition cursor-pointer text-center"
                      >
                        Download Raw
                      </button>
                      {activeTab !== "coldEmail" && (
                        <button
                          onClick={handleExportPDF}
                          className="flex-1 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-[10px] font-bold transition cursor-pointer text-center"
                        >
                          Save as PDF
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Score Progression Chart */}
        {mounted && chartData.length > 0 && (
          <div className="p-6 rounded-2xl bg-slate-900/20 border border-slate-900 backdrop-blur-sm space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-200">ATS Suitability Score Progression</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Tracks optimization efficiency across different resume versions.
              </p>
            </div>

            <div className="w-full h-[200px] bg-slate-950/40 p-4 rounded-xl border border-slate-850/60">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis domain={[0, 100]} stroke="#64748b" fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderColor: "#1e293b",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "#f1f5f9",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    activeDot={{ r: 6 }}
                    dot={{ strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
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
