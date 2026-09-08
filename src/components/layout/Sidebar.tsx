import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
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
  LogOut,
  BarChart3,
  Bell,
  ShieldCheck,
  Settings,
  FileSpreadsheet,
  ChevronDown,
  UserX
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { role, isHrStaff, isTeamMemberOnly } = useAuth();

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
    { label: 'My Timesheet', path: '/attendance/timesheets', icon: FileSpreadsheet },
    { label: 'Leave Requests', path: '/leave', icon: Calendar },
    { label: 'My Daily Log', path: '/work/daily-logs', icon: CheckSquare },
    { label: 'Weekly Reports', path: '/work/weekly-reports', icon: Award },
    { label: 'Team Directory', path: '/people/interns', icon: Users },
  ];

  const navItems = isTeamMemberOnly ? teamNav : hrNav;

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm tracking-wider shadow-sm">
            P&L
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white tracking-tight">Pile & Loop</h1>
            <p className="text-[11px] text-slate-400">HR Operating System</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800">
        {navItems.map((item: any, idx) => {
          const Icon = item.icon;
          if (item.children) {
            return (
              <div key={idx} className="space-y-1">
                <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center space-x-2">
                    <Icon className="w-4 h-4 text-slate-400" />
                    <span>{item.label}</span>
                  </span>
                </div>
                <div className="pl-6 space-y-0.5">
                  {item.children.map((sub: any, sIdx: number) => (
                    <NavLink
                      key={sIdx}
                      to={sub.path}
                      className={({ isActive }) =>
                        `flex items-center px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                          isActive
                            ? 'bg-sky-600 text-white shadow-xs'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
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
              className={({ isActive }) =>
                `flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`
              }
            >
              <Icon className="w-4 h-4 mr-3 shrink-0" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* Role Pill Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/20 text-xs text-slate-400">
        <div className="flex items-center justify-between">
          <span>Role:</span>
          <span className="px-2 py-0.5 rounded bg-slate-800 text-sky-400 font-mono text-[11px] font-semibold">
            {role || 'AUTHENTICATING'}
          </span>
        </div>
      </div>
    </aside>
  );
};