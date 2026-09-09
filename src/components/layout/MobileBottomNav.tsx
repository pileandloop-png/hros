import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '../../contexts/NavigationContext';
import {
  LayoutDashboard,
  Clock,
  Users,
  CheckSquare,
  Menu,
  X
} from 'lucide-react';

export const MobileBottomNav: React.FC = () => {
  const { isHrStaff, isTeamMemberOnly } = useAuth();
  const { isMobileOpen, toggleDrawer } = useNavigation();
  const location = useLocation();

  const attendancePath = isTeamMemberOnly ? '/attendance/my' : '/attendance/live';
  const workPath = isTeamMemberOnly ? '/work/daily-logs' : '/work/tasks';
  const peoplePath = '/people/interns';

  const navItems = [
    {
      label: 'Home',
      path: '/',
      icon: LayoutDashboard,
      isActive: location.pathname === '/',
    },
    {
      label: 'Attendance',
      path: attendancePath,
      icon: Clock,
      isActive: location.pathname.startsWith('/attendance'),
    },
    {
      label: 'Directory',
      path: peoplePath,
      icon: Users,
      isActive: location.pathname.startsWith('/people'),
    },
    {
      label: 'Tasks',
      path: workPath,
      icon: CheckSquare,
      isActive: location.pathname.startsWith('/work'),
    },
  ];

  return (
    <nav
      aria-label="Mobile Navigation Dock"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-2 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all duration-150 touch-target-44 ${
                item.isActive
                  ? 'text-emerald-600 dark:text-emerald-400 font-semibold scale-105'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${item.isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                {item.isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-xs" />
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight leading-none">{item.label}</span>
            </NavLink>
          );
        })}

        {/* Menu / Sidelider Toggle Button */}
        <button
          onClick={toggleDrawer}
          aria-label={isMobileOpen ? 'Close Navigation Drawer' : 'Open Navigation Drawer'}
          aria-expanded={isMobileOpen}
          className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all duration-150 touch-target-44 cursor-pointer ${
            isMobileOpen
              ? 'text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <div className="relative">
            {isMobileOpen ? (
              <X className="w-5 h-5 stroke-[2.5px] text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Menu className="w-5 h-5 stroke-2" />
            )}
          </div>
          <span className="text-[10px] mt-1 tracking-tight leading-none">
            {isMobileOpen ? 'Close' : 'Menu'}
          </span>
        </button>
      </div>
    </nav>
  );
};
