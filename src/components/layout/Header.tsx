import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useCompanyProfile } from '../../contexts/CompanyContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { Search, Bell, Clock, LogOut, Menu, X } from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useNavigate } from 'react-router-dom';

export const Header: React.FC = () => {
  const { user, profile, role, logout } = useAuth();
  const { company } = useCompanyProfile();
  const { isMobileOpen, toggleDrawer } = useNavigation();
  const navigate = useNavigate();
  const [pktTime, setPktTime] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setMobileSearchOpen(false);
    navigate(`/recruitment/applications?search=${encodeURIComponent(searchQuery)}`);
  };

  return (
    <header className="h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800 px-3 sm:px-6 flex items-center justify-between shrink-0 shadow-2xs sticky top-0 z-30 transition-colors">
      {/* Left Area: Mobile Hamburger + Logo/Search */}
      <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0 mr-2">
        {/* Mobile Hamburger Button */}
        <button
          onClick={toggleDrawer}
          aria-label={isMobileOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
          className="md:hidden p-2 -ml-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer touch-target-44 flex items-center justify-center"
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

        {/* Global Search Bar - Desktop */}
        <form onSubmit={handleSearch} className="hidden sm:block relative w-64 md:w-80 lg:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Application ID, candidate, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-slate-800 transition-all text-slate-800 dark:text-slate-200 placeholder-slate-400"
          />
        </form>

        {/* Mobile Search Toggle Icon */}
        <button
          onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
          className="sm:hidden p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
          aria-label="Toggle search"
        >
          <Search className="w-4 h-4" />
        </button>
      </div>

      {/* Mobile Search Overlay Bar */}
      {mobileSearchOpen && (
        <div className="sm:hidden absolute inset-x-0 top-0 h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 flex items-center z-40 animate-fadeIn">
          <form onSubmit={handleSearch} className="flex-1 flex items-center relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3" />
            <input
              type="text"
              autoFocus
              placeholder="Search candidate, email, ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-10 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
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

      {/* Right Tools */}
      <div className="flex items-center space-x-2 sm:space-x-4 shrink-0">
        {/* Live Company Clock (Hidden on very tiny mobile, visible sm+) */}
        <div className="hidden lg:flex items-center space-x-1.5 text-xs font-mono font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
          <Clock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          <span>{pktTime}</span>
        </div>

        {/* Notifications Icon */}
        <button
          onClick={() => navigate('/notifications')}
          className="relative p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer touch-target-44 flex items-center justify-center"
          aria-label="View notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        <div className="h-5 w-px bg-slate-200 dark:bg-slate-700" />

        {/* User Profile & Logout */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div
            className="w-8 h-8 rounded-full text-white font-semibold text-xs flex items-center justify-center shadow-xs shrink-0"
            style={{ backgroundColor: company.primaryColor || '#10B981' }}
          >
            {profile?.displayName ? profile.displayName[0].toUpperCase() : (user?.email ? user.email[0].toUpperCase() : 'U')}
          </div>
          <div className="text-left hidden xl:block max-w-[120px] truncate">
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight truncate">
              {profile?.displayName || user?.email}
            </p>
            <p className="text-[10px] text-slate-400 font-medium truncate">
              {profile?.jobTitle || role}
            </p>
          </div>
          <button
            onClick={logout}
            title="Log Out"
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer touch-target-44 flex items-center justify-center"
            aria-label="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
