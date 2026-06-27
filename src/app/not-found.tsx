"use client";

import { Map, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-100 overflow-hidden font-sans p-6">
      {/* Background glowing effects */}
      <div className="absolute top-[-25%] left-[-15%] w-[600px] h-[600px] rounded-full bg-violet-650/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-25%] right-[-15%] w-[600px] h-[600px] rounded-full bg-indigo-650/10 blur-[130px] pointer-events-none" />

      <div className="max-w-md w-full p-8 rounded-2xl bg-slate-900/40 border border-slate-900 backdrop-blur-md text-center space-y-6 z-10 relative">
        <div className="w-16 h-16 mx-auto rounded-full bg-violet-500/10 flex items-center justify-center shadow-lg shadow-violet-500/10 border border-violet-500/20">
          <Map className="w-8 h-8 text-violet-400 animate-bounce" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            404 — Page Not Found
          </h2>
          <p className="text-sm text-slate-450 leading-relaxed">
            The page you are looking for does not exist or has been moved. Check the URL or click below to return.
          </p>
        </div>

        <div className="pt-2">
          <button
            onClick={() => router.push("/")}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm shadow-lg shadow-violet-500/20 active:scale-[0.98] transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
