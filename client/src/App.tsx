import { useState, useEffect } from 'react';
import { 
  Compass, 
  MapPin, 
  Sparkles, 
  Route, 
  Server, 
  Activity, 
  CheckCircle2, 
  AlertCircle,
  Clock
} from 'lucide-react';

interface BackendHealth {
  status: string;
  message: string;
  version: string;
  demoMode: boolean;
  timestamp: string;
}

export default function App() {
  const [health, setHealth] = useState<BackendHealth | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Server returned ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        setHealth(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to connect to backend server');
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-950 text-slate-100 flex flex-col justify-between selection:bg-brand-500 selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-slate-700/60 backdrop-blur-md bg-slate-900/40 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-brand-500/20">
              <Compass className="w-6 h-6 text-white animate-spin-slow" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-brand-200 bg-clip-text text-transparent">
                Smart Travel Companion
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20 font-medium">
                Phase 1 Live
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {loading ? (
              <div className="flex items-center space-x-2 text-xs text-amber-400 bg-amber-400/10 px-3 py-1.5 rounded-full border border-amber-400/20">
                <Activity className="w-3.5 h-3.5 animate-spin" />
                <span>Connecting to API...</span>
              </div>
            ) : error ? (
              <div className="flex items-center space-x-2 text-xs text-rose-400 bg-rose-400/10 px-3 py-1.5 rounded-full border border-rose-400/20">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Backend Offline</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-xs text-emerald-400 bg-emerald-400/10 px-3 py-1.5 rounded-full border border-emerald-400/20">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>API Online (Port 5000)</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Hero Container */}
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-12 flex flex-col justify-center items-center text-center">
        {/* Subtle pill tag */}
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/80 text-brand-400 text-xs font-medium mb-6 shadow-sm">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Next-Generation AI Travel Architecture</span>
        </div>

        {/* Hero Headlines */}
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-3xl leading-[1.15]">
          Explore Every City Like a{' '}
          <span className="bg-gradient-to-r from-brand-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
            Local
          </span>
        </h1>

        <p className="mt-6 text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
          Discover hidden gems, plan smarter routes, compare transport costs, and build a personalized trip in minutes powered by real-time location and AI.
        </p>

        {/* System Connectivity Card (Verification of Phase 1) */}
        <div className="w-full mt-10 p-6 rounded-2xl bg-slate-800/50 border border-slate-700/60 backdrop-blur-sm text-left shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-700/60 pb-4 mb-4">
            <div className="flex items-center space-x-2">
              <Server className="w-5 h-5 text-brand-400" />
              <h2 className="font-semibold text-sm text-white">Full-Stack Foundation Status</h2>
            </div>
            <span className="text-xs text-slate-400 flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Phase 1 Verification</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
              <span className="text-slate-400 block mb-1">Frontend Runtime</span>
              <span className="font-semibold text-slate-200">React 18 + Vite + TypeScript</span>
              <div className="mt-1 text-emerald-400 text-[11px] flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Tailwind CSS Active</span>
              </div>
            </div>

            <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
              <span className="text-slate-400 block mb-1">Backend Server</span>
              <span className="font-semibold text-slate-200">Express + TypeScript (Node 22)</span>
              <div className="mt-1 text-emerald-400 text-[11px] flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Proxy: /api → :5000</span>
              </div>
            </div>

            <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
              <span className="text-slate-400 block mb-1">Backend Health Check</span>
              {loading ? (
                <span className="text-amber-400">Verifying handshake...</span>
              ) : health ? (
                <div>
                  <span className="font-semibold text-emerald-400">Status: {health.status}</span>
                  <div className="text-slate-400 text-[11px] mt-0.5">Demo Mode: {health.demoMode ? 'Enabled' : 'Disabled'}</div>
                </div>
              ) : (
                <span className="text-rose-400">Connection Failed</span>
              )}
            </div>
          </div>
        </div>

        {/* Feature Preview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full mt-6 text-left">
          <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/40 hover:border-slate-600 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-brand-500/10 text-brand-400 flex items-center justify-center mb-2.5">
              <MapPin className="w-4 h-4" />
            </div>
            <h3 className="font-medium text-sm text-slate-200">Explore Near Me</h3>
            <p className="text-xs text-slate-400 mt-1">Instant GPS detection & reverse geocoding with manual fallback.</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/40 hover:border-slate-600 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-2.5">
              <Route className="w-4 h-4" />
            </div>
            <h3 className="font-medium text-sm text-slate-200">Smart Route Planner</h3>
            <p className="text-xs text-slate-400 mt-1">Multi-stop ordering, time estimates, and transport fare comparison.</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/40 hover:border-slate-600 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center mb-2.5">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="font-medium text-sm text-slate-200">AI Local Guide</h3>
            <p className="text-xs text-slate-400 mt-1">Context-grounded recommendations tailored to time and budget.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-4 px-4 text-center text-xs text-slate-500">
        <p>Smart Travel Companion • Engineering Architecture • Step-by-Step Build</p>
      </footer>
    </div>
  );
}
