import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Command,
  Globe,
  Zap,
  ShieldCheck,
  ShieldAlert,
  Mail,
  Clock,
  Calendar,
  CheckSquare,
  Settings,
  Scan,
  Maximize2,
  FileText,
  UserPlus,
  FileSpreadsheet,
  Users,
  Briefcase,
  Award,
  BarChart3,
  X,
  Cpu,
  ArrowRight,
  Sparkles,
  Filter,
  CheckCircle2,
  AlertTriangle,
  GraduationCap,
  BookOpen
} from 'lucide-react';
import { store } from '../../services/store';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { checkIn, checkOut } from '../../services/api';
import { outageSentinel } from '../../services/outageSentinelService';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenFaceScan?: () => void;
}

export type CommandCategory =
  | 'Quick Actions'
  | 'Recruitment & Screening'
  | 'Candidates'
  | 'Workforce & Employees'
  | 'Navigation';

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  category: CommandCategory;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  shortcut?: string;
  tag?: string;
  tagColor?: string;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  onOpenFaceScan,
}) => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [queryText, setQueryText] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [candidatesList, setCandidatesList] = useState<any[]>([]);
  const [peopleList, setPeopleList] = useState<any[]>([]);
  const [vacanciesList, setVacanciesList] = useState<any[]>([]);
  const [isCheckedIn, setIsCheckedIn] = useState(false);

  // Sync state on open
  useEffect(() => {
    if (isOpen) {
      setQueryText('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 40);

      // Load local store items
      const rawCandidates = store.getCollection('candidates') || {};
      setCandidatesList(Object.values(rawCandidates));

      const rawPeople = store.getCollection('people') || {};
      setPeopleList(Object.values(rawPeople));

      const rawVacancies = store.getCollection('vacancies') || {};
      setVacanciesList(Object.values(rawVacancies));

      // Attendance check
      const today = new Date().toISOString().split('T')[0];
      const records = store.getCollection('attendance') || {};
      const found = Object.values(records).find((r: any) =>
        (r.userId === user?.uid || r.userId === profile?.uid) && r.dateKey === today
      );
      setIsCheckedIn(found?.status === 'CHECKED_IN');
    }
  }, [isOpen, user, profile]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
    onClose();
  };

  const handleQuickTimestampPunch = async () => {
    if (!user) return;
    const nowPkt = new Date().toLocaleTimeString('en-US', {
      timeZone: 'Asia/Karachi',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    try {
      if (!isCheckedIn) {
        await checkIn('Spotlight ⌘K Timestamp Punch', undefined, {
          uid: user.uid,
          displayName: profile?.displayName || user.email || 'Team Member',
          department: profile?.department,
          role: profile?.role
        });
        toast.success(`Check-In Timestamp recorded: ${nowPkt} PKT!`);
      } else {
        await checkOut({
          tasksCompleted: 'Spotlight ⌘K Timestamp Punch Out',
          customUser: { uid: user.uid || 'usr-admin', displayName: profile?.displayName || user.email || 'Team Member' }
        });
        toast.info(`Check-Out Timestamp recorded: ${nowPkt} PKT!`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Timestamp punch failed');
    }
    onClose();
  };

  const handleToggleSovereignOutageMode = () => {
    const config = outageSentinel.getConfig();
    const nextState = !config.forcedDirectLineMode;
    outageSentinel.toggleDirectLineMode(nextState);
    if (nextState) {
      toast.success('Forced Sovereign Direct-Line Mode Activated! Bypassing Microsoft 365 cloud.');
    } else {
      toast.info('Switched back to Dynamic Multi-Cloud Failover routing mode.');
    }
    onClose();
  };

  // 1. Core Quick Actions
  const quickActions: CommandItem[] = [
    {
      id: 'action-timestamp-punch',
      title: isCheckedIn ? 'Clock Out (1-Click Timestamp)' : '⚡ 1-Click Check-In Timestamp',
      subtitle: 'Instant biometric attendance record with PKT timestamp',
      category: 'Quick Actions',
      icon: Clock,
      action: handleQuickTimestampPunch,
      shortcut: 'T',
      tag: isCheckedIn ? 'Clocked In' : 'Ready',
      tagColor: isCheckedIn ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
    },
    {
      id: 'action-browser-agent',
      title: 'Run Indeed Browser Agent (Playwright)',
      subtitle: 'Headless scraper extracting candidate CVs & parsing education',
      category: 'Quick Actions',
      icon: Globe,
      action: () => {
        navigate('/browser-agent');
        onClose();
      },
      shortcut: 'B',
      tag: 'Scraper Engine',
      tagColor: 'bg-emerald-100 text-emerald-800'
    },
    {
      id: 'action-sovereign-outage',
      title: 'Toggle Sovereign Direct-Line Mesh',
      subtitle: 'Immunity against Microsoft Outlook / Office 365 global downtime',
      category: 'Quick Actions',
      icon: ShieldAlert,
      action: handleToggleSovereignOutageMode,
      shortcut: 'O',
      tag: 'Outage Guard',
      tagColor: 'bg-amber-100 text-amber-800'
    },
    {
      id: 'action-compose-email',
      title: 'Compose Outbound Candidate Message',
      subtitle: 'Direct TLS cPanel relay to candidate inbox',
      category: 'Quick Actions',
      icon: Mail,
      action: () => {
        navigate('/inbox');
        onClose();
      },
      shortcut: 'C'
    },
    {
      id: 'action-academy',
      title: 'Open Training Academy & Courses',
      subtitle: 'Assign course tracks, configure app lines & push learning invitations',
      category: 'Quick Actions',
      icon: GraduationCap,
      action: () => {
        navigate('/learning');
        onClose();
      },
      shortcut: 'L',
      tag: 'Academy',
      tagColor: 'bg-violet-100 text-violet-800'
    },
    {
      id: 'action-fullscreen',
      title: 'Toggle Fullscreen Mode',
      subtitle: 'Maximize workspace edge-to-edge for monitor displays',
      category: 'Quick Actions',
      icon: Maximize2,
      action: toggleFullscreen,
      shortcut: 'F11'
    }
  ];

  // 2. Recruitment & Screening Commands
  const recruitmentActions: CommandItem[] = [
    {
      id: 'action-pipeline-kanban',
      title: 'Recruitment Pipeline Kanban',
      subtitle: 'View active stages: Ingested → 5 Questions → Interview → Onboarding',
      category: 'Recruitment & Screening',
      icon: Briefcase,
      action: () => {
        navigate('/recruitment/pipeline');
        onClose();
      },
      shortcut: 'P'
    },
    {
      id: 'action-below-bachelor-filter',
      title: 'Audit Below-Bachelor Educational Gatekeeper',
      subtitle: 'Review candidates filtered out before AI screening questions',
      category: 'Recruitment & Screening',
      icon: Filter,
      action: () => {
        navigate('/recruitment/pipeline');
        onClose();
      },
      tag: 'Policy Gate'
    },
    {
      id: 'action-schedule-interview',
      title: 'Schedule Interview via Cal.com',
      subtitle: 'Book technical evaluation call and dispatch calendar invitation',
      category: 'Recruitment & Screening',
      icon: Calendar,
      action: () => {
        navigate('/recruitment/interviews');
        onClose();
      },
      shortcut: 'I'
    },
    {
      id: 'action-inbox-indeed',
      title: 'Indeed & Corporate Email Inbox',
      subtitle: 'Synced recruiter threads, auto-generated screening questions',
      category: 'Recruitment & Screening',
      icon: Mail,
      action: () => {
        navigate('/inbox');
        onClose();
      }
    }
  ];

  // 3. Dynamic Candidates
  const candidateItems: CommandItem[] = candidatesList.map((c) => {
    const isBelowBachelor =
      c.educationClass === 'BELOW_BACHELOR' ||
      c.education === 'Intermediate' ||
      c.education === 'DAE Electronics' ||
      (c.notes && c.notes.toLowerCase().includes('below bachelor'));

    return {
      id: `candidate-${c.id}`,
      title: c.fullName || 'Candidate',
      subtitle: `${c.vacancyTitle || 'Applicant'} • ${c.education || 'Degree not parsed'} • Stage: ${c.stage || 'NEW'}`,
      category: 'Candidates',
      icon: isBelowBachelor ? AlertTriangle : Users,
      action: () => {
        navigate('/recruitment/pipeline');
        onClose();
      },
      tag: isBelowBachelor ? 'Below Bachelor' : 'Bachelor+',
      tagColor: isBelowBachelor ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
    };
  });

  // 4. Dynamic Employees & Interns
  const peopleItems: CommandItem[] = peopleList.map((p) => {
    const isIntern =
      p.employmentType === 'INTERNSHIP' ||
      (p.role && p.role.toLowerCase().includes('intern')) ||
      (p.jobTitle && p.jobTitle.toLowerCase().includes('intern'));

    let remainingDaysStr = '';
    if (p.contractEndDate || p.expectedEndDate) {
      const end = new Date(p.contractEndDate || p.expectedEndDate);
      const diff = Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      remainingDaysStr = diff >= 0 ? `${diff}d left` : 'Expired';
    }

    return {
      id: `person-${p.id}`,
      title: p.fullName || 'Employee',
      subtitle: `${p.designation || p.role || 'Team Member'} • ${p.department || 'General'} • Status: ${p.status || 'ACTIVE'}`,
      category: 'Workforce & Employees',
      icon: Users,
      action: () => {
        navigate('/workforce');
        onClose();
      },
      tag: remainingDaysStr || (isIntern ? 'Intern' : 'Full-Time'),
      tagColor: isIntern ? 'bg-sky-100 text-sky-800' : 'bg-slate-100 text-slate-700'
    };
  });

  // 5. Global Navigation
  const navigationItems: CommandItem[] = [
    {
      id: 'nav-dashboard',
      title: 'Dashboard Overview',
      subtitle: 'ATS funnel overview, live clock, metrics radar',
      category: 'Navigation',
      icon: Briefcase,
      action: () => {
        navigate('/');
        onClose();
      },
      shortcut: 'D'
    },
    {
      id: 'nav-onboarding',
      title: 'Onboarding & Document Verification',
      subtitle: 'Active joiners, CNIC watermarks & access provisioning checklist',
      category: 'Navigation',
      icon: UserPlus,
      action: () => {
        navigate('/onboarding');
        onClose();
      }
    },
    {
      id: 'nav-learning',
      title: 'Training Academy & Courses',
      subtitle: 'Course catalog, enrolled progress radar, and verifiable credentials',
      category: 'Navigation',
      icon: GraduationCap,
      action: () => {
        navigate('/learning');
        onClose();
      },
      shortcut: 'L'
    },
    {
      id: 'nav-workforce',
      title: 'Workforce & Tenure Registry',
      subtitle: 'Internship contract countdowns, onboarding ingestion & offboarding letters',
      category: 'Navigation',
      icon: Users,
      action: () => {
        navigate('/workforce');
        onClose();
      },
      shortcut: 'W'
    },
    {
      id: 'nav-enterprise',
      title: 'Enterprise Command Center',
      subtitle: 'Multi-entity tenants, SAML 2.0 / Okta IAM, and zero-downtime mesh',
      category: 'Navigation',
      icon: ShieldCheck,
      action: () => {
        navigate('/enterprise');
        onClose();
      },
      shortcut: 'E'
    },
    {
      id: 'nav-settings',
      title: 'System Settings & SMTP Config',
      subtitle: 'cPanel host credentials, company branding and AI prompts',
      category: 'Navigation',
      icon: Settings,
      action: () => {
        navigate('/settings');
        onClose();
      },
      shortcut: 'S'
    }
  ];

  const allItems: CommandItem[] = [
    ...quickActions,
    ...recruitmentActions,
    ...candidateItems,
    ...peopleItems,
    ...navigationItems
  ];

  const categories: CommandCategory[] = [
    'Quick Actions',
    'Recruitment & Screening',
    'Candidates',
    'Workforce & Employees',
    'Navigation'
  ];

  const filteredItems = allItems.filter((item) => {
    if (!queryText.trim()) return true;
    const q = queryText.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
      item.category.toLowerCase().includes(q) ||
      (item.tag && item.tag.toLowerCase().includes(q))
    );
  });

  // Flat grouped list so visual order matches keyboard navigation order 1:1
  const groupedFilteredItems: CommandItem[] = [];
  categories.forEach((cat) => {
    groupedFilteredItems.push(...filteredItems.filter((i) => i.category === cat));
  });

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (groupedFilteredItems.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + (groupedFilteredItems.length || 1)) % (groupedFilteredItems.length || 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (groupedFilteredItems[selectedIndex]) {
          groupedFilteredItems[selectedIndex].action();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, groupedFilteredItems]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-start justify-center pt-16 sm:pt-20 px-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white/95 backdrop-blur-2xl border border-slate-200/90 rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.15)] max-w-2xl w-full overflow-hidden text-slate-800 transition-all select-none animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Apple Spotlight Search Bar */}
        <div className="relative border-b border-slate-100 flex items-center px-4 py-3.5 bg-slate-50/50">
          <Search className="w-5 h-5 text-slate-400 shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Spotlight: search candidates, run browser agent, 1-click punch, or navigate..."
            value={queryText}
            onChange={(e) => {
              setQueryText(e.target.value);
              setSelectedIndex(0);
            }}
            className="w-full text-sm bg-transparent border-0 focus:outline-none placeholder-slate-400 text-slate-900 font-medium"
          />
          {queryText ? (
            <button
              onClick={() => setQueryText('')}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-white text-slate-500 border border-slate-200 shadow-2xs">
              ESC
            </kbd>
          )}
        </div>

        {/* Grouped Spotlight Results */}
        <div className="max-h-[460px] overflow-y-auto p-2 scrollbar-thin divide-y divide-slate-100/60">
          {filteredItems.length === 0 ? (
            <div className="py-14 text-center text-slate-400 text-xs">
              <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              No actions, candidates or employees matching "{queryText}"
            </div>
          ) : (
            categories.map((cat) => {
              const itemsInCat = filteredItems.filter((i) => i.category === cat);
              if (itemsInCat.length === 0) return null;

              return (
                <div key={cat} className="pt-2 pb-1.5 first:pt-1">
                  <div className="px-3 py-1 text-[10px] font-bold tracking-wider uppercase text-slate-400 flex items-center justify-between">
                    <span>{cat}</span>
                    <span className="font-mono text-[9px]">{itemsInCat.length}</span>
                  </div>

                  <div className="space-y-0.5 mt-0.5">
                    {itemsInCat.map((item) => {
                      const Icon = item.icon;
                      const itemIndex = groupedFilteredItems.findIndex((i) => i.id === item.id);
                      const isSelected = itemIndex === selectedIndex;

                      return (
                        <div
                          key={item.id}
                          onClick={() => item.action()}
                          onMouseEnter={() => setSelectedIndex(itemIndex)}
                          className={`flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-slate-900 text-white shadow-2xs'
                              : 'text-slate-700 hover:bg-slate-100/80'
                          }`}
                        >
                          <div className="flex items-center space-x-3 min-w-0">
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                isSelected
                                  ? 'bg-white/15 text-white'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <div className="truncate">
                              <p className={`text-xs font-semibold truncate ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                                {item.title}
                              </p>
                              {item.subtitle && (
                                <p className={`text-[11px] truncate ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                                  {item.subtitle}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 shrink-0 ml-3">
                            {item.tag && (
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                  isSelected
                                    ? 'bg-white/20 text-white'
                                    : item.tagColor || 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {item.tag}
                              </span>
                            )}
                            {item.shortcut && (
                              <kbd
                                className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                                  isSelected
                                    ? 'bg-white/10 border-white/20 text-white'
                                    : 'bg-white border-slate-200 text-slate-500 shadow-2xs'
                                }`}
                              >
                                {item.shortcut}
                              </kbd>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Apple Spotlight Footer */}
        <div className="px-4 py-2.5 bg-slate-50/90 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center space-x-3">
            <span className="flex items-center space-x-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-mono shadow-2xs">↑</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-mono shadow-2xs">↓</kbd>
              <span>to navigate</span>
            </span>
            <span className="flex items-center space-x-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-mono shadow-2xs">↵</kbd>
              <span>to execute</span>
            </span>
            <span className="flex items-center space-x-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-mono shadow-2xs">ESC</kbd>
              <span>to dismiss</span>
            </span>
          </div>
          <span className="text-slate-400 font-mono text-[10px] flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-500" />
            Apple Spotlight Engine
          </span>
        </div>
      </div>
    </div>
  );
};
