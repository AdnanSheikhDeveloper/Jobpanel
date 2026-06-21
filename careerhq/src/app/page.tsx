export default function Home() {
  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Background glowing effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none" />

      {/* Main Header / Navigation */}
      <header className="w-full max-w-5xl mx-auto px-6 py-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center font-bold text-lg text-white shadow-lg shadow-violet-500/20">
            C
          </div>
          <span className="font-semibold text-lg tracking-tight bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
            CareerHQ
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            System Live
          </span>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center z-10 max-w-3xl mx-auto">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 bg-gradient-to-b from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
          CareerHQ
        </h1>
        <p className="text-lg md:text-xl text-slate-400 max-w-xl mx-auto mb-10 leading-relaxed">
          Your personal career command center. Under development.
        </p>

        {/* Feature Preview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-2xl mt-4">
          {[
            { label: "Applications", desc: "Pipeline tracking" },
            { label: "AI Outreach", desc: "Tailored messages" },
            { label: "Resume Vault", desc: "ATS optimization" },
            { label: "Analytics", desc: "Success metrics" },
          ].map((item) => (
            <div
              key={item.label}
              className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-sm transition-all duration-300 hover:border-violet-500/30 hover:bg-slate-900/80 group"
            >
              <div className="font-semibold text-slate-200 text-sm group-hover:text-violet-400 transition-colors">
                {item.label}
              </div>
              <div className="text-xs text-slate-500 mt-1">{item.desc}</div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 border-t border-slate-900 z-10 gap-4">
        <div>&copy; {new Date().getFullYear()} CareerHQ. All rights reserved.</div>
        <div className="flex items-center gap-4">
          <span>Phase 0 — Scaffold & Deploy Verification</span>
        </div>
      </footer>
    </div>
  );
}
