import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Command,
  LayoutDashboard,
  Users,
  Briefcase,
  Mail,
  Clock,
  Calendar,
  CheckSquare,
  Settings,
  ShieldCheck,
  Scan,
  Maximize2,
  Minimize2,
  Plus,
  FileSpreadsheet,
  Calculator,
  ArrowRight,
  Sparkles,
  UserCheck,
  Award,
  BarChart3,
  X
} from 'lucide-react';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { db } from '../../services/firebase';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenFaceScan?: () => void;
}

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  category: 'Navigation' | 'Quick Actions' | 'People & Candidates';
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  shortcut?: string;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  onOpenFaceScan,
}) => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [queryText, setQueryText] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [peopleResults, setPeopleResults] = useState<any[]>([]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQueryText('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);

      // Fetch quick search cache
      getDocs(query(collection(db, 'people'), limit(20))).then((snap) => {
        setPeopleResults(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }).catch(() => {});
    }
  }, [isOpen]);

  // Toggle fullscreen helper
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
    onClose();
  };

  // Base command items
  const baseActions: CommandItem[] = [
    // Quick Actions
    {
      id: 'action-kiosk',
      title: 'Open Entrance Biometric Kiosk',
      subtitle: 'Office tablet station for facial check-in / out',
      category: 'Quick Actions',
      icon: Scan,
      action: () => {
        navigate('/attendance/kiosk');
        onClose();
      },
      shortcut: 'K'
    },
    {
      id: 'action-face-scan',
      title: 'Scan Face to Check In / Out',
      subtitle: 'Trigger instant facial biometric verification',
      category: 'Quick Actions',
      icon: Clock,
      action: () => {
        onClose();
        if (onOpenFaceScan) {
          onOpenFaceScan();
        } else {
          navigate('/attendance/live');
        }
      },
      shortcut: 'F'
    },
    {
      id: 'action-fullscreen',
      title: 'Toggle Fullscreen Mode',
      subtitle: 'Maximize workspace edge-to-edge for monitors & tablets',
      category: 'Quick Actions',
      icon: Maximize2,
      action: toggleFullscreen,
      shortcut: 'F11'
    },
    {
      id: 'action-compose',
      title: 'Compose Email to Candidate',
      subtitle: 'Draft outbound message with AI recruiter templates',
      category: 'Quick Actions',
      icon: Mail,
      action: () => {
        navigate('/inbox');
        onClose();
      },
      shortcut: 'C'
    },
    {
      id: 'action-new-vacancy',
      title: 'Create New Job Vacancy',
      subtitle: 'Publish job description and start screening applicants',
      category: 'Quick Actions',
      icon: Plus,
      action: () => {
        navigate('/recruitment/vacancies');
        onClose();
      }
    },
    {
      id: 'action-timesheets',
      title: 'Export Attendance Timesheet',
      subtitle: 'Download work hours and stipend calculation CSV',
      category: 'Quick Actions',
      icon: FileSpreadsheet,
      action: () => {
        navigate('/attendance/timesheets');
        onClose();
      }
    },

    // Navigation
    {
      id: 'nav-dashboard',
      title: 'Dashboard Overview',
      subtitle: 'Key metrics, daily attendance and recruitment funnel',
      category: 'Navigation',
      icon: LayoutDashboard,
      action: () => {
        navigate('/');
        onClose();
      }
    },
    {
      id: 'nav-vacancies',
      title: 'Job Vacancies',
      subtitle: 'Manage active job postings and candidate pipelines',
      category: 'Navigation',
      icon: Briefcase,
      action: () => {
        navigate('/recruitment/vacancies');
        onClose();
      }
    },
    {
      id: 'nav-applications',
      title: 'Applications & Screening',
      subtitle: 'Review candidate CVs, education classifications and ratings',
      category: 'Navigation',
      icon: Users,
      action: () => {
        navigate('/recruitment/applications');
        onClose();
      }
    },
    {
      id: 'nav-pipeline',
      title: 'Recruitment Pipeline Kanban',
      subtitle: 'Drag and drop applicant progression stages',
      category: 'Navigation',
      icon: Briefcase,
      action: () => {
        navigate('/recruitment/pipeline');
        onClose();
      }
    },
    {
      id: 'nav-inbox',
      title: 'Corporate Outlook Inbox',
      subtitle: 'cPanel IMAP/SMTP synced email threads & auto-replies',
      category: 'Navigation',
      icon: Mail,
      action: () => {
        navigate('/inbox');
        onClose();
      }
    },
    {
      id: 'nav-live-attendance',
      title: 'Live Attendance & Biometric Audit',
      subtitle: 'Real-time check-in stream with camera snapshot verification',
      category: 'Navigation',
      icon: Clock,
      action: () => {
        navigate('/attendance/live');
        onClose();
      }
    },
    {
      id: 'nav-analytics',
      title: 'Attendance Analytics & Heatmaps',
      subtitle: 'Punctuality rates, face match confidence and shift metrics',
      category: 'Navigation',
      icon: BarChart3,
      action: () => {
        navigate('/attendance/analytics');
        onClose();
      }
    },
    {
      id: 'nav-people',
      title: 'Staff & Intern Directory',
      subtitle: 'Active employees, interns and contact profiles',
      category: 'Navigation',
      icon: Users,
      action: () => {
        navigate('/people/interns');
        onClose();
      }
    },
    {
      id: 'nav-leave',
      title: 'Leave Requests & Approvals',
      subtitle: 'Manage team leave allowances and decision queue',
      category: 'Navigation',
      icon: Calendar,
      action: () => {
        navigate('/leave');
        onClose();
      }
    },
    {
      id: 'nav-tasks',
      title: 'HR Tasks & Daily Work Logs',
      subtitle: 'Track team deliverables and weekly internship reports',
      category: 'Navigation',
      icon: CheckSquare,
      action: () => {
        navigate('/work/tasks');
        onClose();
      }
    },
    {
      id: 'nav-settings',
      title: 'Settings & Mail Server Config',
      subtitle: 'Manage SMTP credentials, branding and system preferences',
      category: 'Navigation',
      icon: Settings,
      action: () => {
        navigate('/settings');
        onClose();
      }
    },
  ];

  // Dynamic people items
  const dynamicPeople: CommandItem[] = peopleResults.map((p) => ({
    id: `person-${p.id}`,
    title: p.fullName || 'Unnamed Employee',
    subtitle: `${p.designation || p.role || 'Staff'} • ${p.department || 'General'}`,
    category: 'People & Candidates',
    icon: Users,
    action: () => {
      navigate('/people/interns');
      onClose();
    }
  }));

  const allItems = [...baseActions, ...dynamicPeople];

  const filteredItems = allItems.filter((item) => {
    if (!queryText.trim()) return true;
    const q = queryText.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
      item.category.toLowerCase().includes(q)
    );
  });

  // Handle Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (filteredItems.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + (filteredItems.length || 1)) % (filteredItems.length || 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          filteredItems[selectedIndex].action();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredItems]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-start justify-center pt-16 sm:pt-24 px-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden text-slate-800 transition-all select-none animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="relative border-b border-slate-100 flex items-center px-4 py-3.5">
          <Search className="w-5 h-5 text-slate-400 shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search (e.g. kiosk, face scan, vacancies)..."
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
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-100 text-slate-500 border border-slate-200">
              ESC
            </kbd>
          )}
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 scrollbar-thin divide-y divide-slate-100">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No actions or matches found for "{queryText}"
            </div>
          ) : (
            <div className="space-y-1">
              {filteredItems.map((item, idx) => {
                const Icon = item.icon;
                const isSelected = idx === selectedIndex;
                return (
                  <div
                    key={item.id}
                    onClick={() => item.action()}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'text-slate-700 hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'bg-white/10 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
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
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded ${
                          isSelected
                            ? 'bg-white/15 text-slate-200'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {item.category}
                      </span>
                      {item.shortcut && (
                        <kbd
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                            isSelected
                              ? 'bg-white/10 border-white/20 text-white'
                              : 'bg-slate-50 border-slate-200 text-slate-500'
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
          )}
        </div>

        {/* Apple Footer with shortcuts helper */}
        <div className="px-4 py-2.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center space-x-3">
            <span className="flex items-center space-x-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-mono">↑</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-mono">↓</kbd>
              <span>to navigate</span>
            </span>
            <span className="flex items-center space-x-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-mono">↵</kbd>
              <span>to select</span>
            </span>
          </div>
          <span className="text-slate-400 font-mono text-[10px]">
            HROS Quick Dispatcher
          </span>
        </div>
      </div>
    </div>
  );
};
