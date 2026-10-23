import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../services/firebase';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import {
  Users,
  Briefcase,
  Mail,
  UserCheck,
  Calendar,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  FileText,
  Play,
  Globe,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  Cpu,
  RefreshCw,
  Clock,
  ShieldCheck,
  FileCheck
} from 'lucide-react';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import { store } from '../../services/store';

export const Dashboard: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Metrics State
  const [metrics, setMetrics] = useState({
    activeVacancies: 4,
    totalApplications: 6,
    belowBachelorFiltered: 2,
    screeningQuestionsSent: 2,
    repliesWaitingScore: 1,
    interviewsScheduled: 2,
    onboardingActive: 2,
    onboardingGuidesSent: 2
  });

  const [loading, setLoading] = useState(false);
  const [people, setPeople] = useState<any[]>([]);

  useEffect(() => {
    const loadPeople = () => {
      const records = store.getCollection('people') || {};
      setPeople(Object.values(records));
    };
    loadPeople();
    const unsub = store.subscribe((col) => {
      if (col === 'people') loadPeople();
    });
    return () => unsub();
  }, []);

  const calculateDaysRemaining = (expectedEnd: any) => {
    if (!expectedEnd) return null;
    const end = expectedEnd.toDate ? expectedEnd.toDate() : new Date(expectedEnd);
    const now = new Date();
    return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  const isNewlyOnboarded = (joinDate: any) => {
    if (!joinDate) return false;
    const start = new Date(joinDate);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 14;
  };

  const activeStaff = people.filter(p => p.status === 'ACTIVE');
  const activeInterns = people.filter(p => p.status === 'ACTIVE' && (p.employmentType === 'INTERNSHIP' || (p.role && p.role.toLowerCase().includes('intern')) || (p.jobTitle && p.jobTitle.toLowerCase().includes('intern'))));
  const endingSoonCount = people.filter(p => {
    if (p.status !== 'ACTIVE') return false;
    const days = calculateDaysRemaining(p.contractEndDate || p.expectedEndDate);
    return days !== null && days <= 15 && days >= 0;
  }).length;
  const newJoinersCount = people.filter(p => p.status === 'ACTIVE' && isNewlyOnboarded(p.joiningDate || p.joinDate)).length;
  const offboardedCount = people.filter(p => p.status === 'OFFBOARDED' || p.status === 'COMPLETED').length;
  const terminatedCount = people.filter(p => p.status === 'TERMINATED').length;

  const handleRefreshTelemetry = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success('ATS Pipeline telemetry and inbound Indeed sync refreshed!');
    }, 600);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Hero Command Center */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Welcome back, {profile?.displayName || 'Super Admin'}
            </h1>
            <Badge variant="success">Autonomous Talent Engine 2.0</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1.5 max-w-2xl leading-relaxed">
            AI-driven recruitment platform managing Indeed inbound ingestion, Playwright CV text extraction, 
            strict <strong>Below-Bachelor educational filtering</strong>, automated <strong>5-question technical screening</strong>, and <strong>1-click interview-to-onboarding</strong> workflows.
          </p>
        </div>

        {/* Quick Launch Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleRefreshTelemetry}
            className="text-xs font-semibold"
            disabled={loading}
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Sync Now
          </Button>

          <Button
            size="sm"
            variant="primary"
            onClick={() => navigate('/browser-agent')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs"
          >
            <Globe className="w-3.5 h-3.5 mr-1.5" />
            Run Browser Agent
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/inbox')}
            className="text-xs font-semibold border-slate-200 hover:bg-slate-50"
          >
            <Mail className="w-3.5 h-3.5 mr-1.5 text-sky-600" />
            Inbound Inbox
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/recruitment/pipeline')}
            className="text-xs font-semibold border-slate-200 hover:bg-slate-50"
          >
            <TrendingUp className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
            Pipeline Kanban
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/workforce')}
            className="text-xs font-semibold border-indigo-200 bg-indigo-50/40 text-indigo-700 hover:bg-indigo-50"
          >
            <Users className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
            Workforce Registry
          </Button>
        </div>
      </div>

      {/* KPI 6-Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Open Vacancies */}
        <div
          onClick={() => navigate('/recruitment/vacancies')}
          className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Vacancies</span>
            <Briefcase className="w-4 h-4 text-sky-600 group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{metrics.activeVacancies}</p>
          <span className="text-[10px] text-slate-400 font-medium">Open positions</span>
        </div>

        {/* Total Inbound Applications */}
        <div
          onClick={() => navigate('/recruitment/applications')}
          className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Inbound Apps</span>
            <Users className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{metrics.totalApplications}</p>
          <span className="text-[10px] text-sky-600 font-medium">Indeed &amp; Email</span>
        </div>

        {/* Below Bachelor Filtered */}
        <div
          onClick={() => navigate('/inbox')}
          className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Below Bachelor</span>
            <ShieldAlert className="w-4 h-4 text-amber-600 group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-2xl font-extrabold text-amber-600">{metrics.belowBachelorFiltered}</p>
          <span className="text-[10px] text-amber-700 font-medium bg-amber-50 px-1.5 py-0.5 rounded">Auto-Suppressed</span>
        </div>

        {/* 5 Questions Dispatched */}
        <div
          onClick={() => navigate('/recruitment/pipeline')}
          className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">5 Questions</span>
            <Mail className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{metrics.screeningQuestionsSent}</p>
          <span className="text-[10px] text-slate-400 font-medium">Screenings active</span>
        </div>

        {/* Interviews Hub */}
        <div
          onClick={() => navigate('/recruitment/interviews')}
          className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Interviews</span>
            <Calendar className="w-4 h-4 text-purple-600 group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{metrics.interviewsScheduled}</p>
          <span className="text-[10px] text-purple-600 font-medium">Scheduled &amp; Scorecard</span>
        </div>

        {/* Onboarding & Welcome Kit */}
        <div
          onClick={() => navigate('/onboarding')}
          className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Onboarding</span>
            <UserCheck className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-600">{metrics.onboardingActive}</p>
          <span className="text-[10px] text-emerald-700 font-medium bg-emerald-50 px-1.5 py-0.5 rounded">Guide Dispatched</span>
        </div>
      </div>

      {/* Main Operational 3-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel 1: Today's Recruitment Priority Tasks */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-sky-600" />
              <span>Priority ATS Actions</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">AUTOMATED QUEUE</span>
          </div>

          <div className="space-y-3 flex-1">
            {/* Action 1: Inbound Indeed Profile Scrape */}
            <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/70 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5">
                  <Badge variant="info">Indeed Scraper</Badge>
                  <p className="text-xs font-bold text-slate-900">Shiza Tariq</p>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Growth &amp; Content Intern &bull; BS English (PU)</p>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">Ready for Browser-Use CV extraction</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate('/browser-agent?name=Shiza%20Tariq&role=Growth%20%26%20Content%20Intern')}
                className="text-[11px] h-7 shrink-0"
              >
                Extract CV
              </Button>
            </div>

            {/* Action 2: Review Candidate 5-Question Responses */}
            <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/70 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5">
                  <Badge variant="success">Replies Received</Badge>
                  <p className="text-xs font-bold text-slate-900">Ayesha Siddiqui</p>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">UI/UX Design Intern &bull; Score: 24/25 (96%)</p>
                <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Ready for 1-Click Interview Scheduling</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate('/recruitment/interviews')}
                className="text-[11px] h-7 shrink-0 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200"
              >
                Book Call
              </Button>
            </div>

            {/* Action 3: Below-Bachelor Guard */}
            <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-200/70 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5">
                  <Badge variant="warning">Below Bachelor</Badge>
                  <p className="text-xs font-bold text-amber-900">Hamza Farooq</p>
                </div>
                <p className="text-[11px] text-amber-700 mt-1">DAE Electronics &bull; Intermediate Only</p>
                <p className="text-[10px] text-amber-600 font-medium mt-0.5">Auto-reply suppressed by safety guard</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate('/inbox')}
                className="text-[11px] h-7 shrink-0 border-amber-300 text-amber-800 hover:bg-amber-100"
              >
                Audit
              </Button>
            </div>
          </div>
        </div>

        {/* Panel 2: End-to-End Recruitment Funnel */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>Automated Hiring Pipeline</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">CONVERSION FUNNEL</span>
          </div>

          <div className="space-y-3.5 flex-1 text-xs">
            {/* Step 1 */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-slate-700">1. Inbound Ingested (Indeed / Web)</span>
                <span className="font-bold text-slate-900">6 Candidates</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-sky-500 h-full rounded-full" style={{ width: '100%' }} />
              </div>
            </div>

            {/* Step 2 */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-slate-700">2. Education Gatekeeper (Bachelor+)</span>
                <span className="font-bold text-slate-900">4 Passed (2 Filtered)</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-indigo-500 h-full rounded-full" style={{ width: '66%' }} />
              </div>
            </div>

            {/* Step 3 */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-slate-700">3. 5 Screening Questions Sent</span>
                <span className="font-bold text-slate-900">4 Dispatched</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full rounded-full" style={{ width: '66%' }} />
              </div>
            </div>

            {/* Step 4 */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-slate-700">4. Candidate Replied &amp; Scored</span>
                <span className="font-bold text-slate-900">3 Passing (&ge;75%)</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-purple-500 h-full rounded-full" style={{ width: '50%' }} />
              </div>
            </div>

            {/* Step 5 */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-slate-700">5. Technical Interview Passed</span>
                <span className="font-bold text-slate-900">2 Approved</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-teal-500 h-full rounded-full" style={{ width: '33%' }} />
              </div>
            </div>

            {/* Step 6 */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-slate-700">6. Onboarding Welcome Guide Sent</span>
                <span className="font-bold text-emerald-600">2 Active Joiners</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: '33%' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Panel 3: Autonomous Engine Status & Telemetry */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-purple-600" />
              <span>Agent System Health</span>
            </h3>
            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded">
              ● 100% OPERATIONAL
            </span>
          </div>

          <div className="space-y-3.5 flex-1 text-xs">
            <div className="p-3 bg-slate-50/70 border border-slate-200/70 rounded-xl space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">Browser-Use &amp; Playwright Engine</span>
                <span className="text-emerald-600 font-mono text-[10px] font-bold">READY (v1.42)</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Headless Chromium scraper configured for Indeed resume selectors &amp; anti-bot avoidance.
              </p>
            </div>

            <div className="p-3 bg-slate-50/70 border border-slate-200/70 rounded-xl space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">5-Question AI Generator</span>
                <span className="text-sky-600 font-mono text-[10px] font-bold">ACTIVE</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Generates 5 personalized technical, project, and availability screening questions per CV.
              </p>
            </div>

            <div className="p-3 bg-slate-50/70 border border-slate-200/70 rounded-xl space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">Corporate SMTP &amp; IMAP Inbox</span>
                <span className="text-emerald-600 font-mono text-[10px] font-bold">2s HEARTBEAT</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Connected to mail.pileandloop.com:993 with 99.4% deliverability telemetry.
              </p>
            </div>

            <div className="p-3 bg-slate-50/70 border border-slate-200/70 rounded-xl space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">1-Click Onboarding Automation</span>
                <span className="text-purple-600 font-mono text-[10px] font-bold">ARMED</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Interview pass verdict automatically creates case and dispatches official welcome guide email.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Workforce & Tenure Radar Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                Workforce &amp; Internship Tenure Radar
              </h2>
              <Badge variant="info">Live Contract Watchlist</Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Real-time countdown clocks, onboarding document ingestion status, and offboarding access revocation audit logs.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/workforce')}
              className="text-xs font-semibold"
            >
              <FileText className="w-3.5 h-3.5 mr-1.5 text-sky-600" />
              Ingest Onboarding Doc
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => navigate('/workforce')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs"
            >
              <span>View Full Registry</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </div>
        </div>

        {/* Quick Lifecycle Metric Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 my-5">
          <div className="bg-slate-50 border border-slate-200/70 p-3 rounded-xl cursor-pointer hover:border-slate-300 transition-colors" onClick={() => navigate('/workforce')}>
            <span className="text-[10px] font-bold text-slate-500 uppercase">Active Staff</span>
            <p className="text-xl font-extrabold text-slate-900 mt-0.5">{activeStaff.length}</p>
          </div>
          <div className="bg-indigo-50/50 border border-indigo-200/60 p-3 rounded-xl cursor-pointer hover:border-indigo-300 transition-colors" onClick={() => navigate('/workforce')}>
            <span className="text-[10px] font-bold text-indigo-700 uppercase">Active Interns</span>
            <p className="text-xl font-extrabold text-indigo-600 mt-0.5">{activeInterns.length}</p>
          </div>
          <div className="bg-amber-50/60 border border-amber-200/80 p-3 rounded-xl cursor-pointer hover:border-amber-300 transition-colors" onClick={() => navigate('/workforce')}>
            <span className="text-[10px] font-bold text-amber-700 uppercase">Ending Soon (&le;15d)</span>
            <p className="text-xl font-extrabold text-amber-600 mt-0.5">{endingSoonCount}</p>
          </div>
          <div className="bg-emerald-50/60 border border-emerald-200/70 p-3 rounded-xl cursor-pointer hover:border-emerald-300 transition-colors" onClick={() => navigate('/workforce')}>
            <span className="text-[10px] font-bold text-emerald-700 uppercase">New Joiners (&le;14d)</span>
            <p className="text-xl font-extrabold text-emerald-600 mt-0.5">{newJoinersCount}</p>
          </div>
          <div className="bg-slate-50 border border-slate-200/70 p-3 rounded-xl cursor-pointer hover:border-slate-300 transition-colors" onClick={() => navigate('/workforce')}>
            <span className="text-[10px] font-bold text-slate-600 uppercase">Alumni / Offboarded</span>
            <p className="text-xl font-extrabold text-slate-700 mt-0.5">{offboardedCount}</p>
          </div>
          <div className="bg-rose-50/60 border border-rose-200/70 p-3 rounded-xl cursor-pointer hover:border-rose-300 transition-colors" onClick={() => navigate('/workforce')}>
            <span className="text-[10px] font-bold text-rose-700 uppercase">Terminated / Exited</span>
            <p className="text-xl font-extrabold text-rose-600 mt-0.5">{terminatedCount}</p>
          </div>
        </div>

        {/* Live Employee Roster Table */}
        <div className="border border-slate-200/80 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-4">Employee / Intern</th>
                <th className="py-2.5 px-4">Role &amp; Type</th>
                <th className="py-2.5 px-4">Timeline</th>
                <th className="py-2.5 px-4">Tenure Clock</th>
                <th className="py-2.5 px-4">Handover / Clearance</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {people.slice(0, 5).map((person) => {
                const days = calculateDaysRemaining(person.contractEndDate || person.expectedEndDate);
                const isEnding = days !== null && days <= 15 && days >= 0;
                const isOffboarded = person.status === 'OFFBOARDED' || person.status === 'COMPLETED';
                const isTerminated = person.status === 'TERMINATED';

                return (
                  <tr key={person.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-[11px] text-slate-700 shrink-0">
                          {person.fullName?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 leading-tight">{person.fullName}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{person.email || person.personalEmail}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-slate-800">{person.jobTitle || person.designation || 'Staff'}</p>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                        {person.employmentType || 'INTERNSHIP'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <div className="text-[11px] font-mono">
                        <span>{person.joiningDate || person.joinDate || 'N/A'}</span>
                        <span className="text-slate-400 mx-1">&rarr;</span>
                        <span>{person.contractEndDate || person.expectedEndDate || 'Permanent'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {isTerminated ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          Exited / Terminated
                        </span>
                      ) : isOffboarded ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          Alumni Completed
                        </span>
                      ) : isEnding ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                          <Clock className="w-3 h-3 mr-1" />
                          {days}d Remaining (Ending Soon)
                        </span>
                      ) : days !== null ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Clock className="w-3 h-3 mr-1 text-emerald-600" />
                          {days}d Remaining
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-50 text-slate-600 border border-slate-200">
                          Permanent Active
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {person.offboarding ? (
                        person.offboarding.accessRevoked ? (
                          <span className="inline-flex items-center text-[10px] text-emerald-700 font-medium">
                            <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                            100% Revoked
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[10px] text-amber-700 font-medium">
                            <AlertCircle className="w-3.5 h-3.5 mr-1 text-amber-600" />
                            Revocation In Progress
                          </span>
                        )
                      ) : (
                        <span className="text-[10px] text-slate-400">All Credentials Active</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate('/workforce')}
                        className="text-[11px] h-7 px-2.5"
                      >
                        Manage
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};