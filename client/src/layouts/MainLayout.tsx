import React from 'react';
import { 
  Compass, 
  MapPin, 
  Map as MapIcon, 
  Calendar, 
  Sparkles, 
  Heart, 
  CheckCircle2, 
  AlertCircle,
  Activity,
  SlidersHorizontal
} from 'lucide-react';
import { usePreferences } from '../context/PreferencesContext';

export type NavTab = 'home' | 'explore' | 'map' | 'plan' | 'ai' | 'mytrip';

interface MainLayoutProps {
  children: React.ReactNode;
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  currentCity?: string;
  onOpenLocationModal?: () => void;
  backendHealth: {
    status: string;
    loading: boolean;
    error: string | null;
  };
  savedPlacesCount?: number;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  activeTab,
  onTabChange,
  currentCity = 'Hyderabad, IN',
  onOpenLocationModal,
  backendHealth,
  savedPlacesCount = 0,
}) => {
  const { preferences, setIsPreferencesModalOpen } = usePreferences();

  const navItems = [
    { id: 'home' as NavTab, label: 'Home', icon: Compass },
    { id: 'explore' as NavTab, label: 'Explore', icon: MapPin },
    { id: 'map' as NavTab, label: 'Map', icon: MapIcon },
    { id: 'plan' as NavTab, label: 'Plan', icon: Calendar },
    { id: 'ai' as NavTab, label: 'AI Guide', icon: Sparkles, highlight: true },
    { id: 'mytrip' as NavTab, label: 'My Trip', icon: Heart, badge: savedPlacesCount },
  ];

  const getStyleIcon = () => {
    switch (preferences.travelStyle) {
      case 'solo': return '🎒';
      case 'couple': return '💑';
      case 'family': return '👨‍👩‍👧';
      case 'friends': return '👥';
      default: return '🎒';
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* ============================================================== */}
      {/* DESKTOP & TABLET TOP HEADER */}
      {/* ============================================================== */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 cursor-pointer shrink-0" onClick={() => onTabChange('home')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-teal-500 flex items-center justify-center shadow-md shadow-sky-500/15">
              <Compass className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900">
                  Smart Travel <span className="text-sky-600">Companion</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium -mt-0.5 hidden lg:block">
                Explore smarter. Travel better.
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`relative flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                    isActive
                      ? 'bg-white text-sky-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${
                    item.highlight && isActive ? 'text-amber-500' : isActive ? 'text-sky-600' : 'text-slate-400'
                  }`} />
                  <span>{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Area: Location, Preferences Pill & Backend Status */}
          <div className="flex items-center space-x-1.5 sm:space-x-2.5">
            {/* Travel Profile Pill */}
            <button
              onClick={() => setIsPreferencesModalOpen(true)}
              title="Click to customize your travel profile and preferences"
              className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 bg-amber-50/80 hover:bg-amber-100/80 text-amber-900 rounded-full border border-amber-200 text-xs font-semibold transition-all cursor-pointer shadow-2xs group"
            >
              <span className="text-sm">{getStyleIcon()}</span>
              <span className="capitalize font-bold hidden sm:inline">{preferences.travelStyle}</span>
              <span className="text-amber-400 hidden sm:inline">•</span>
              <span className="font-bold">{preferences.availableHours}h</span>
              <span className="text-amber-400 hidden lg:inline">•</span>
              <span className="hidden lg:inline font-bold">₹{preferences.budgetAmount.toLocaleString()}</span>
              <SlidersHorizontal className="w-3 h-3 text-amber-600 group-hover:rotate-12 transition-transform" />
            </button>

            {/* Interactive Location Pill */}
            <button
              onClick={onOpenLocationModal}
              title="Click to change your location"
              className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 rounded-full border border-sky-100 text-xs font-semibold transition-all cursor-pointer shadow-2xs group"
            >
              <MapPin className="w-3.5 h-3.5 text-sky-600 group-hover:scale-110 transition-transform shrink-0" />
              <span className="max-w-[100px] sm:max-w-[150px] truncate">{currentCity}</span>
              <span className="text-[10px] text-sky-500 font-normal hidden md:inline">(Change)</span>
            </button>

            {/* Backend Health Chip */}
            {backendHealth.loading ? (
              <div className="flex items-center space-x-1.5 px-2 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-200 text-[11px] font-medium" title="Connecting to backend">
                <Activity className="w-3 h-3 animate-spin text-amber-500" />
                <span className="hidden xl:inline">Connecting</span>
              </div>
            ) : backendHealth.error ? (
              <div className="flex items-center space-x-1.5 px-2 py-1 bg-rose-50 text-rose-700 rounded-full border border-rose-200 text-[11px] font-medium" title={backendHealth.error}>
                <AlertCircle className="w-3 h-3 text-rose-500" />
                <span className="hidden xl:inline">Offline</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1.5 px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200 text-[11px] font-medium" title="Backend server connected on port 5000">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span className="hidden xl:inline">API Online</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ============================================================== */}
      {/* MAIN CONTENT AREA */}
      {/* ============================================================== */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 pb-24 md:pb-12">
        {children}
      </main>

      {/* ============================================================== */}
      {/* DESKTOP FOOTER */}
      {/* ============================================================== */}
      <footer className="hidden md:block bg-white border-t border-slate-200/80 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-800">Smart Travel Companion</span>
            <span>•</span>
            <span>AI-Powered Local Travel Guide</span>
          </div>
          <p className="text-slate-400">Light-First Travel Design System • Phase 6 Preferences Engine</p>
        </div>
      </footer>

      {/* ============================================================== */}
      {/* MOBILE BOTTOM NAVIGATION BAR (Thumb-Friendly, Fixed) */}
      {/* ============================================================== */}
      <nav 
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/95 backdrop-blur-lg border-t border-slate-200 shadow-lg px-2 py-1.5"
        style={{ paddingBottom: 'calc(0.375rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="grid grid-cols-6 gap-1 items-center">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-150 min-h-[48px] ${
                  isActive 
                    ? 'text-sky-600 font-semibold' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 ${
                    item.highlight && isActive ? 'text-amber-500' : isActive ? 'text-sky-600' : 'text-slate-400'
                  }`} />
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="absolute -top-1 -right-2 px-1 rounded-full text-[9px] font-bold bg-rose-500 text-white min-w-[14px] text-center">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] mt-0.5 ${isActive ? 'text-sky-700 font-bold' : 'text-slate-500 font-medium'}`}>
                  {item.label}
                </span>
                {isActive && (
                  <div className="w-1 h-1 rounded-full bg-sky-600 mt-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
