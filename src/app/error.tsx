"use client";

import { useEffect } from "react";
import { AlertOctagon, RefreshCw, Home } from "lucide-react";
import { useRouter } from "next/navigation";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // Log the error to telemetry/console
    console.error("Application runtime error caught:", error);
  }, [error]);

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-100 overflow-hidden font-sans p-6">
      {/* Background glowing effects */}
      <div className="absolute top-[-25%] left-[-15%] w-[600px] h-[600px] rounded-full bg-rose-600/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-25%] right-[-15%] w-[600px] h-[600px] rounded-full bg-violet-600/10 blur-[130px] pointer-events-none" />

      <div className="max-w-md w-full p-8 rounded-2xl bg-slate-900/40 border border-slate-900 backdrop-blur-md text-center space-y-6 z-10 relative">
        <div className="w-16 h-16 mx-auto rounded-full bg-rose-500/10 flex items-center justify-center shadow-lg shadow-rose-500/10 border border-rose-500/20">
          <AlertOctagon className="w-8 h-8 text-rose-500 animate-pulse" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            Something went wrong!
          </h2>
          <p className="text-sm text-slate-450 leading-relaxed">
            An unexpected error occurred in the application. We have logged this error and will review it.
          </p>
          {error.message && (
            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg text-left text-xs text-rose-450 font-mono overflow-auto max-h-[100px]">
              {error.message}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm shadow-md active:scale-[0.98] transition cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          <button
            onClick={() => router.push("/")}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold bg-slate-900 border border-slate-850 hover:border-slate-750 text-slate-300 hover:text-slate-100 text-sm transition cursor-pointer"
          >
            <Home className="w-4 h-4" />
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
}
