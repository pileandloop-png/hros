import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCompanyProfile } from '../../contexts/CompanyContext';
import { useNavigation } from '../../contexts/NavigationContext';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Mail,
  UserCheck,
  Clock,
  Calendar,
  CheckSquare,
  Award,
  BarChart3,
  ShieldCheck,
  Settings,
  FileSpreadsheet,
  UserX,
  X,
  ExternalLink,
  Scan
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { role, isTeamMemberOnly } = useAuth();
  const { company } = useCompanyProfile();
  const { isMobileOpen, closeDrawer } = useNavigation();

  const hrNav = [
    {
      label: 'Dashboard',
      path: '/',
      icon: LayoutDashboard,
    },
    {
      label: 'Recruitment',
      icon: Briefcase,
      children: [
        { label: 'Vacancies', path: '/recruitment/vacancies' },
        { label: 'Applications', path: '/recruitment/applications' },
        { label: 'Candidates', path: '/recruitment/candidates' },
        { label: 'Pipeline Kanban', path: '/recruitment/pipeline' },
        { label: 'Interviews', path: '/recruitment/interviews' },
        { label: 'Import CSV', path: '/recruitment/import' },
      ],
    },
    {
      label: 'Communication',
      icon: Mail,
      children: [
        { label: 'Inbox', path: '/inbox' },
        { label: 'Assigned to Me', path: '/inbox/assigned' },
        { label: 'Sent', path: '/inbox/sent' },
        { label: 'Templates', path: '/inbox/templates' },
      ],
    },
    {
      label: 'Onboarding',
      icon: UserCheck,
      children: [
        { label: 'Active Cases', path: '/onboarding' },
        { label: 'Documents Review', path: '/onboarding/documents' },
      ],
    },
    {
      label: 'People',
      icon: Users,
      children: [
        { label: 'Active Interns', path: '/people/interns' },
        { label: 'Employees & Team', path: '/people/team' },
        { label: 'Alumni / Completed', path: '/people/alumni' },
      ],
    },
    {
      label: 'Attendance',
      icon: Clock,
      children: [
        { label: 'Live Attendance', path: '/attendance/live' },
        { label: 'Biometric Kiosk', path: '/attendance/kiosk' },
        { label: 'Attendance Analytics', path: '/attendance/analytics' },
        { label: 'Timesheets', path: '/attendance/timesheets' },
      ],
    },
    {
      label: 'Leave',
      icon: Calendar,
      children: [
        { label: 'Leave Requests', path: '/leave' },
      ],
    },
    {
      label: 'Work & Tasks',
      icon: CheckSquare,
      children: [
        { label: 'HR Tasks', path: '/work/tasks' },
        { label: 'Daily Logs', path: '/work/daily-logs' },
        { label: 'Weekly Reports', path: '/work/weekly-reports' },
      ],
    },
    {
      label: 'Performance',
      icon: Award,
      path: '/performance',
    },
    {
      label: 'Offboarding',
      icon: UserX,
      children: [
        { label: 'Ending Soon', path: '/offboarding/ending-soon' },
        { label: 'Offboarding Cases', path: '/offboarding' },
      ],
    },
    {
      label: 'Reports',
      icon: BarChart3,
      path: '/reports',
    },
    {
      label: 'Audit Log',
      icon: ShieldCheck,
      path: '/audit',
    },
    {
      label: 'Settings',
      icon: Settings,
      path: '/settings',
    },
  ];

  const teamNav = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'My Attendance', path: '/attendance/my', icon: Clock },
    { label: 'Biometric Kiosk', path: '/attendance/kiosk', icon: Scan },
    { label: 'My Timesheet', path: '/attendance/timesheets', icon: FileSpreadsheet },
    { label: 'Leave Requests', path: '/leave', icon: Calendar },
    { label: 'My Daily Log', path: '/work/daily-logs', icon: CheckSquare },
    { label: 'Weekly Reports', path: '/work/weekly-reports', icon: Award },
    { label: 'Team Directory', path: '/people/interns', icon: Users },
  ];

  const navItems = isTeamMemberOnly ? teamNav : hrNav;
  const primaryColor = company.primaryColor || '#10B981';

  const renderNavContent = (isMobileView: boolean) => (
    <>
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-slate-200/80 bg-white/70 shrink-0">
        <div className="flex items-center space-x-3 truncate">
          {company.logoUrl ? (
            <img
              src={company.logoUrl}
              alt={company.companyName}
              className="h-8 max-w-[42px] object-contain rounded shrink-0 p-0.5"
            />
          ) : (
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs tracking-wider shadow-xs shrink-0"
              style={{ backgroundColor: primaryColor }}
            >
              {company.companyName.slice(0, 3).toUpperCase()}
            </div>
          )}
          <div className="truncate">
            <h1 className="text-sm font-bold text-slate-900 tracking-tight truncate">
              {company.companyName}
            </h1>
            <p className="text-[10px] text-slate-400 font-medium truncate">
              {company.tagline || 'HR Operating System'}
            </p>
          </div>
        </div>

        {/* Close Button on Mobile Drawer */}
        {isMobileView && (
          <button
            onClick={closeDrawer}
            className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Close navigation drawer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-3.5 space-y-1.5 scrollbar-thin touch-pan-y">
        {navItems.map((item: any, idx) => {
          const Icon = item.icon;
          if (item.children) {
            return (
              <div key={idx} className="space-y-0.5">
                <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center space-x-2">
                    <Icon className="w-3.5 h-3.5 text-slate-400" />
                    <span>{item.label}</span>
                  </span>
                </div>
                <div className="pl-4 space-y-0.5">
                  {item.children.map((sub: any, sIdx: number) => (
                    <NavLink
                      key={sIdx}
                      to={sub.path}
                      onClick={() => isMobileView && closeDrawer()}
                      className={({ isActive }) =>
                        `flex items-center px-3 py-1.5 rounded-lg text-xs transition-all ${
                          isActive
                            ? 'bg-slate-900 text-white font-semibold shadow-xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 font-medium'
                        }`
                      }
                    >
                      {sub.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          }

          return (
            <NavLink
              key={idx}
              to={item.path}
              end={item.path === '/'}
              onClick={() => isMobileView && closeDrawer()}
              className={({ isActive }) =>
                `flex items-center px-3 py-2 rounded-xl text-xs transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 font-medium'
                }`
              }
            >
              <Icon className="w-4 h-4 mr-2.5 shrink-0" />
              {item.label}
            </NavLink>
          );
        })}

        {/* Quick Link to Careers Portal */}
        <div className="pt-2 border-t border-slate-200/80 mt-3">
          <a
            href="/careers"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-3 py-2 rounded-xl text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-colors font-medium"
          >
            <span className="flex items-center">
              <Briefcase className="w-3.5 h-3.5 mr-2 text-emerald-600" />
              Public Careers Portal
            </span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>
        </div>
      </nav>

      {/* Role Pill Footer */}
      <div className="p-3.5 border-t border-slate-200/80 bg-slate-50/70 text-xs text-slate-500 shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-slate-500">Active Role:</span>
          <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-semibold tracking-wide bg-white border border-slate-200 text-slate-700 shadow-2xs">
            {role || 'AUTHENTICATED'}
          </span>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* 1. Desktop Persistent Sidebar (>= md) */}
      <aside className="hidden md:flex w-64 bg-white/95 backdrop-blur-xl text-slate-800 flex-col shrink-0 border-r border-slate-200/80 select-none">
        {renderNavContent(false)}
      </aside>

      {/* 2. Mobile Sidelider Drawer (< md) */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Dimmed backdrop overlay */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs animate-overlay-in"
            onClick={closeDrawer}
            aria-hidden="true"
          />

          {/* Sliding drawer panel */}
          <aside
            aria-label="Mobile Navigation Drawer"
            className="relative z-50 w-72 max-w-[85vw] bg-white text-slate-800 flex flex-col h-full shadow-2xl border-r border-slate-200 select-none animate-drawer-in"
          >
            {renderNavContent(true)}
          </aside>
        </div>
      )}
    </>
  );
};
