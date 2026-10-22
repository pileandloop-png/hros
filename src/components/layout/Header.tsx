import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useCompanyProfile } from '../../contexts/CompanyContext';
import { useNavigation } from '../../contexts/NavigationContext';
import {
  Search,
  Bell,
  Clock,
  LogOut,
  Menu,
  X,
  Maximize2,
  Minimize2,
  Command,
  Sparkles
} from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useNavigate } from 'react-router-dom';
import { CommandPaletteModal } from '../common/CommandPaletteModal';

export const Header: React.FC = () => {
  const { user, profile, role, logout } = useAuth();
  const { company } = useCompanyProfile();
  const { isMobileOpen, toggleDrawer } = useNavigation();
  const navigate = useNavigate();

  const [pktTime, setPktTime] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));

  // Sync fullscreen state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Global Cmd+K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Live Company Timezone Clock
  useEffect(() => {
    const updateTime = () => {
      try {
        const timeZone = company.timezone || 'Asia/Karachi';
        const str = new Date().toLocaleTimeString('en-US', {
          timeZone,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        });
        const tzAbbr = timeZone === 'Asia/Karachi' ? 'PKT' : timeZone.split('/')[1] || timeZone;
        setPktTime(`${str} ${tzAbbr}`);
      } catch {
        setPktTime(new Date().toLocaleTimeString());
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [company.timezone]);

  // Notifications count
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'notifications'),
      where('userId', 'in', [user.uid, 'ALL_HR']),
      where('read', '==', false)
    );
    const unsub = onSnapshot(q, (snap) => {
      setUnreadCount(snap.size);
    });
    return () => unsub();
  }, [user]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setMobileSearchOpen(false);
    navigate(`/recruitment/applications?search=${encodeURIComponent(searchQuery)}`);
  };

  return (
    <>
      <header className="h-16 bg-white/80 backdrop-blur-xl border-b border-slate-200/80 px-3 sm:px-6 flex items-center justify-between shrink-0 shadow-2xs sticky top-0 z-30 transition-all select-none">
        {/* Left Area: Mobile Hamburger + Brand / Search */}
        <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0 mr-2">
          {/* Mobile Hamburger Button */}
          <button
            onClick={toggleDrawer}
            aria-label={isMobileOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
            className="md:hidden p-2 -ml-1 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer touch-target-44 flex items-center justify-center"
          >
            {isMobileOpen ? <X className="w-5 h-5 text-emerald-600" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Mobile Brand Monogram */}
          <div className="md:hidden flex items-center space-x-1.5 shrink-0">
            {company.logoUrl ? (
              <img src={company.logoUrl} alt={company.companyName} className="h-6 max-w-[32px] object-contain rounded" />
            ) : (
              <div
                className="w-6 h-6 rounded-md flex items-center justify-center text-white font-bold text-[10px] shadow-2xs"
                style={{ backgroundColor: company.primaryColor || '#10B981' }}
              >
                {company.companyName.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>

          {/* Global Search Bar (Spotlight Trigger) - Desktop */}
          <div
            onClick={() => setCommandPaletteOpen(true)}
            className="hidden sm:flex items-center justify-between w-64 md:w-80 lg:w-96 px-3 py-1.5 bg-slate-100/70 hover:bg-slate-100 border border-slate-200/80 rounded-xl cursor-pointer transition-all group"
            title="Press Cmd+K or Ctrl+K to open global search & actions"
          >
            <div className="flex items-center space-x-2 truncate">
              <Search className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors shrink-0" />
              <span className="text-xs text-slate-400 group-hover:text-slate-600 font-medium truncate">
                Search candidates, jobs, resumes, pipeline...
              </span>
            </div>
            <div className="flex items-center space-x-1 shrink-0 ml-2">
              <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-white border border-slate-200 text-slate-500 shadow-2xs">
                ⌘K
              </kbd>
            </div>
          </div>

          {/* Mobile Search Toggle Icon */}
          <button
            onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
            className="sm:hidden p-2 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
            aria-label="Toggle search"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>

        {/* Mobile Search Overlay Bar */}
        {mobileSearchOpen && (
          <div className="sm:hidden absolute inset-x-0 top-0 h-16 bg-white/95 backdrop-blur-xl border-b border-slate-200 px-3 flex items-center z-40 animate-fadeIn">
            <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3" />
              <input
                type="text"
                autoFocus
                placeholder="Search candidate, email, ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-10 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              <button
                type="button"
                onClick={() => setMobileSearchOpen(false)}
                className="absolute right-2 p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* Right Tools Area */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          {/* Live Company Clock */}
          <div className="hidden lg:flex items-center space-x-1.5 text-xs font-mono font-medium text-slate-700 bg-slate-100/80 px-2.5 py-1.5 rounded-xl border border-slate-200/70">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{pktTime}</span>
          </div>

          {/* Fullscreen Workspace Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer touch-target-44 flex items-center justify-center"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen (F11)'}
            aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Notifications Icon */}
          <button
            onClick={() => navigate('/notifications')}
            className="relative p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer touch-target-44 flex items-center justify-center"
            aria-label="View notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <div className="h-5 w-px bg-slate-200" />

          {/* User Profile & Logout */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div
              className="w-8 h-8 rounded-full text-white font-semibold text-xs flex items-center justify-center shadow-xs shrink-0"
              style={{ backgroundColor: company.primaryColor || '#10B981' }}
            >
              {profile?.displayName ? profile.displayName[0].toUpperCase() : (user?.email ? user.email[0].toUpperCase() : 'U')}
            </div>
            <div className="text-left hidden lg:block max-w-[220px]">
              <p className="text-xs font-semibold text-slate-900 leading-tight truncate">
                {profile?.displayName || user?.email}
              </p>
              <p className="text-[10px] text-slate-400 font-medium truncate">
                {profile?.jobTitle || role}
              </p>
            </div>
            <button
              onClick={logout}
              title="Log Out"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer touch-target-44 flex items-center justify-center"
              aria-label="Log Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Global Command Palette Modal */}
      <CommandPaletteModal
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
    </>
  );
};
