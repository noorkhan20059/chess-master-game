import React from 'react';
import {
  BarChart2,
  BookOpen,
  History,
  Home,
  Puzzle,
  Settings,
  Swords,
  User,
} from 'lucide-react';
import { AppView } from '../../types/chess';

interface NavigationShellProps {
  currentView: AppView;
  username: string;
  rating: number;
  onNavigate: (view: AppView) => void;
  onQuickPlay: () => void;
  children: React.ReactNode;
}

export const BrandEmblem: React.FC<{ className?: string }> = ({ className = 'w-7 h-7' }) => (
  <svg
    viewBox="0 0 36 36"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <rect x="2" y="2" width="32" height="32" rx="7" fill="#1C2024" stroke="#D4AF37" strokeWidth="1.5" />
    <path
      d="M12 26H24M13.5 23L15 17.5L12.5 16L14 11.5L17.5 10L19 8L21 10.5C23 12 24 14.5 23.5 17.5L22.5 23H13.5Z"
      stroke="#D4AF37"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="16.5" cy="13.2" r="0.9" fill="#D4AF37" />
  </svg>
);

const PRIMARY_NAV: Array<{ id: AppView; label: string }> = [
  { id: 'dashboard', label: 'Salon' },
  { id: 'play', label: 'Play AI' },
  { id: 'analysis', label: 'Analysis' },
  { id: 'puzzles', label: 'Puzzles' },
  { id: 'openings', label: 'Openings' },
];

const MOBILE_NAV: Array<{ id: AppView; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'dashboard', label: 'Home', icon: Home },
  { id: 'play', label: 'Play', icon: Swords },
  { id: 'puzzles', label: 'Puzzles', icon: Puzzle },
  { id: 'analysis', label: 'Analyze', icon: BarChart2 },
  { id: 'openings', label: 'Learn', icon: BookOpen },
];

export const NavigationShell: React.FC<NavigationShellProps> = ({
  currentView,
  username,
  rating,
  onNavigate,
  onQuickPlay,
  children,
}) => {
  return (
    <div className="min-h-screen flex flex-col bg-[#111315] text-[#F5F5F5]">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-40 h-14 md:h-16 bg-[#111315]/95 backdrop-blur-md border-b border-[#252A30]">
        <div className="max-w-[1360px] mx-auto h-full px-4 md:px-6 flex items-center justify-between gap-8">
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] rounded-md"
          >
            <BrandEmblem className="w-7 h-7 shrink-0" />
            <span className="font-display text-base md:text-lg font-bold tracking-wide text-[#F5F5F5]">
              AI Chess Master
            </span>
          </button>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
            {PRIMARY_NAV.map((item) => {
              const active = currentView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className={`relative py-1 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    active ? 'text-[#D4AF37]' : 'text-[#A3A3A3] hover:text-[#F5F5F5]'
                  }`}
                >
                  {item.label}
                  {active && (
                    <span className="absolute left-0 right-0 -bottom-[1px] h-[2px] bg-[#D4AF37] rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onQuickPlay}
              className="px-4 py-2 text-xs md:text-sm font-semibold rounded-lg bg-[#D4AF37] text-[#111315] hover:bg-[#E2C04D] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Quick Match
            </button>
          </div>
        </div>
      </header>

      {/* Sub-navigation strip on desktop for secondary utility destinations */}
      <div className="hidden md:block border-b border-[#1E2328] bg-[#14171A]">
        <div className="max-w-[1360px] mx-auto px-6 h-10 flex items-center justify-between text-xs text-[#A3A3A3]">
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => onNavigate('history')}
              className={`flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                currentView === 'history' ? 'text-[#D4AF37]' : 'hover:text-[#F5F5F5]'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Game History</span>
            </button>
            <span aria-hidden="true" className="text-[#2E343B]">·</span>
            <button
              type="button"
              onClick={() => onNavigate('profile')}
              className={`flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                currentView === 'profile' ? 'text-[#D4AF37]' : 'hover:text-[#F5F5F5]'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Profile &amp; Stats</span>
            </button>
            <span aria-hidden="true" className="text-[#2E343B]">·</span>
            <button
              type="button"
              onClick={() => onNavigate('settings')}
              className={`flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                currentView === 'settings' ? 'text-[#D4AF37]' : 'hover:text-[#F5F5F5]'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Settings</span>
            </button>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('profile')}
            className="text-xs text-[#A3A3A3] hover:text-[#D4AF37] transition-colors whitespace-nowrap cursor-pointer"
          >
            {username} · <span className="font-mono tabular-nums text-[#D4AF37]">{rating}</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-[1360px] mx-auto px-4 md:px-6 py-5 md:py-7 pb-20 md:pb-8">
        {children}
      </main>

      {/* Mobile Bottom Navigation (compact <= 56px, well under 15% mobile viewport cap) */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-14 bg-[#14171A]/95 backdrop-blur-md border-t border-[#252A30] grid grid-cols-5"
      >
        {MOBILE_NAV.map((item) => {
          const Icon = item.icon;
          const active = currentView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors cursor-pointer ${
                active ? 'text-[#D4AF37]' : 'text-[#A3A3A3]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="truncate max-w-full px-1">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
