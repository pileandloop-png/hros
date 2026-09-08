import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../services/firebase';
import { collection, query, where, getDocs, orderBy, limit, onSnapshot } from 'firebase/firestore';
import {
  Users,
  Briefcase,
  Mail,
  UserCheck,
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  FileText,
  UserX,
  Play,
  Coffee,
  Square
} from 'lucide-react';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { checkIn, startBreak, endBreak, checkOut } from '../../services/api';
import { useNavigate } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const { user, profile, isHrStaff, isTeamMemberOnly } = useAuth();
  const navigate = useNavigate();

  // Metrics State
  const [metrics, setMetrics] = useState({
    activeVacancies: 0,
    totalApplications: 0,
    newApplications: 0,
    repliesWaiting: 0,
    followUpsDue: 0,
    interviewsToday: 0,
    selectedCandidates: 0,
    docsPending: 0,
    activeInterns: 0,
    endingSoon: 0,
    checkedInNow: 0,
    leavePending: 0,
  });

  const [todayInterviews, setTodayInterviews] = useState<any[]>([]);
  const [todayFollowUps, setTodayFollowUps] = useState<any[]>([]);
  const [endingInterns, setEndingInterns] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [liveAttendanceList, setLiveAttendanceList] = useState<any[]>([]);

  // Personal Attendance State (for team members or HR self-attendance)
  const [activeSession, setActiveSession] = useState<any>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [plannedTasksInput, setPlannedTasksInput] = useState('');
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [checkoutSummary, setCheckoutSummary] = useState({ tasksCompleted: '', blockers: '', nextDayPlans: '' });
  const [actionLoading, setActionLoading] = useState(false);

  // Load HR Data
  useEffect(() => {
    if (!isHrStaff) return;

    const fetchDashboardData = async () => {
      try {
        // Vacancies
        const vacSnap = await getDocs(query(collection(db, 'vacancies'), where('status', '==', 'OPEN')));
        // Applications
        const appSnap = await getDocs(collection(db, 'applications'));
        const newApps = appSnap.docs.filter(d => d.data().currentStage === 'NEW_APPLICATION').length;
        const replies = appSnap.docs.filter(d => d.data().followUpStatus === 'CANDIDATE_RESPONDED').length;
        const selected = appSnap.docs.filter(d => d.data().currentStage === 'SELECTED').length;

        // Onboarding
        const onbSnap = await getDocs(query(collection(db, 'onboardingCases'), where('status', 'in', ['DOCUMENTS_PENDING', 'UNDER_REVIEW'])));

        // People
        const peopleSnap = await getDocs(query(collection(db, 'people'), where('status', '==', 'ACTIVE'), where('workerType', '==', 'INTERN')));

        // Leave
        const leaveSnap = await getDocs(query(collection(db, 'leaveRequests'), where('status', '==', 'PENDING')));

        setMetrics({
          activeVacancies: vacSnap.size,
          totalApplications: appSnap.size,
          newApplications: newApps,
          repliesWaiting: replies,
          followUpsDue: appSnap.docs.filter(d => d.data().followUpStatus === 'FOLLOW_UP_DUE').length,
          interviewsToday: 0,
          selectedCandidates: selected,
          docsPending: onbSnap.size,
          activeInterns: peopleSnap.size,
          endingSoon: 0,
          checkedInNow: 0,
          leavePending: leaveSnap.size,
        });

        // Recent Audit logs
        const auditSnap = await getDocs(query(collection(db, 'auditLogs'), orderBy('createdAt', 'desc'), limit(10)));
        setRecentActivities(auditSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error('Failed to load dashboard metrics:', err);
      }
    };

    fetchDashboardData();

    // Listen to live attendance for today
    const yyyyMmDd = new Date().toISOString().split('T')[0];
    const attUnsub = onSnapshot(
      query(collection(db, 'attendance'), where('dateKey', '==', yyyyMmDd)),
      (snap) => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setLiveAttendanceList(list);
        const checkedInCount = list.filter((a: any) => a.status === 'CHECKED_IN' || a.status === 'ON_BREAK').length;
        setMetrics(m => ({ ...m, checkedInNow: checkedInCount }));
      }
    );

    return () => attUnsub();
  }, [isHrStaff]);

  // Personal Active Attendance Session Listener
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'attendance'),
      where('userId', '==', user.uid),
      where('status', 'in', ['CHECKED_IN', 'ON_BREAK'])
    );
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const session = { id: snap.docs[0].id, ...snap.docs[0].data() };
        setActiveSession(session);
      } else {
        setActiveSession(null);
        setElapsedSeconds(0);
      }
    });
    return () => unsub();
  }, [user]);

  // Elapsed Time Ticker
  useEffect(() => {
    if (!activeSession || !activeSession.checkInAt) return;
    const checkInMs = activeSession.checkInAt.toMillis ? activeSession.checkInAt.toMillis() : new Date().getTime();

    const interval = setInterval(() => {
      const now = new Date().getTime();
      setElapsedSeconds(Math.max(0, Math.floor((now - checkInMs) / 1000)));
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSession]);

  const formatElapsed = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleCheckIn = async () => {
    setActionLoading(true);
    try {
      await checkIn(plannedTasksInput);
      setPlannedTasksInput('');
    } catch (err: any) {
      alert(err.message || 'Check-in failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartBreak = async () => {
    setActionLoading(true);
    try {
      await startBreak();
    } catch (err: any) {
      alert(err.message || 'Start break failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEndBreak = async () => {
    setActionLoading(true);
    try {
      await endBreak();
    } catch (err: any) {
      alert(err.message || 'End break failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setActionLoading(true);
    try {
      await checkOut(checkoutSummary);
      setCheckoutModalOpen(false);
      setCheckoutSummary({ tasksCompleted: '', blockers: '', nextDayPlans: '' });
    } catch (err: any) {
      alert(err.message || 'Check-out failed');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome Banner & Attendance Quickbar */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-2xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Welcome back, {profile?.displayName || user?.email}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Pile & Loop Human Resources Operating System • Standard Time: Asia/Karachi (PKT)
          </p>
        </div>

        {/* Live Check-in Widget */}
        <div className="flex items-center space-x-3 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
          {!activeSession ? (
            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="What are your goals today?"
                value={plannedTasksInput}
                onChange={(e) => setPlannedTasksInput(e.target.value)}
                className="text-xs px-3 py-1.5 border border-slate-300 rounded bg-white w-52 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
              <Button size="sm" variant="success" onClick={handleCheckIn} loading={actionLoading}>
                <Play className="w-3.5 h-3.5 mr-1" />
                Check In
              </Button>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <span className={`w-2.5 h-2.5 rounded-full ${activeSession.status === 'ON_BREAK' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500 animate-pulse'}`} />
                <span className="font-mono text-sm font-bold text-slate-800">{formatElapsed(elapsedSeconds)}</span>
                <span className="text-[11px] text-slate-500">({activeSession.status === 'ON_BREAK' ? 'On Break' : 'Working'})</span>
              </div>

              {activeSession.status === 'CHECKED_IN' ? (
                <Button size="sm" variant="outline" onClick={handleStartBreak} loading={actionLoading}>
                  <Coffee className="w-3.5 h-3.5 mr-1" />
                  Break
                </Button>
              ) : (
                <Button size="sm" variant="primary" onClick={handleEndBreak} loading={actionLoading}>
                  Resume
                </Button>
              )}

              <Button size="sm" variant="danger" onClick={() => setCheckoutModalOpen(true)}>
                <Square className="w-3.5 h-3.5 mr-1" />
                Check Out
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* HR OPERATIONAL DASHBOARD */}
      {isHrStaff && (
        <>
          {/* Top KPI Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all cursor-pointer" onClick={() => navigate('/recruitment/vacancies')}>
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Vacancies</span>
                <Briefcase className="w-4 h-4 text-sky-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{metrics.activeVacancies}</p>
              <span className="text-[10px] text-slate-400">Open positions</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all cursor-pointer" onClick={() => navigate('/recruitment/applications')}>
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Applications</span>
                <Users className="w-4 h-4 text-indigo-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{metrics.totalApplications}</p>
              <span className="text-[10px] text-amber-600 font-medium">{metrics.newApplications} unreviewed</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all cursor-pointer" onClick={() => navigate('/inbox')}>
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Candidate Replies</span>
                <Mail className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{metrics.repliesWaiting}</p>
              <span className="text-[10px] text-slate-400">Awaiting response</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all cursor-pointer" onClick={() => navigate('/onboarding')}>
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Onboarding</span>
                <UserCheck className="w-4 h-4 text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{metrics.docsPending}</p>
              <span className="text-[10px] text-slate-400">Documents under review</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all cursor-pointer" onClick={() => navigate('/people/interns')}>
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Active Interns</span>
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{metrics.activeInterns}</p>
              <span className="text-[10px] text-slate-400">In 4-month program</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all cursor-pointer" onClick={() => navigate('/attendance/live')}>
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Checked In</span>
                <Clock className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold text-emerald-600">{metrics.checkedInNow}</p>
              <span className="text-[10px] text-slate-400">Active today in PKT</span>
            </div>
          </div>

          {/* Operational Sections: TODAY & RECRUITMENT FUNNEL */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* TODAY Action Board */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-sky-600" />
                  <span>Today's Priorities</span>
                </h3>
                <span className="text-[10px] text-slate-400 font-mono">PKT OPERATIONAL</span>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-800">Unreviewed Applications</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{metrics.newApplications} candidates waiting for screening</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => navigate('/recruitment/applications?stage=NEW_APPLICATION')}>
                    Review
                  </Button>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-800">Candidate Email Responses</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{metrics.repliesWaiting} replies waiting for HR reply</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => navigate('/inbox')}>
                    Open
                  </Button>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-800">Pending Leave Decisions</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{metrics.leavePending} team requests submitted</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => navigate('/leave')}>
                    Decide
                  </Button>
                </div>
              </div>
            </div>

            {/* RECRUITMENT FUNNEL */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                  <span>Recruitment Funnel</span>
                </h3>
                <span className="text-[10px] text-slate-400">All Vacancies</span>
              </div>

              <div className="space-y-3.5 flex-1 flex flex-col justify-around">
                <div>
                  <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                    <span>1. Applications Received</span>
                    <span className="font-bold">{metrics.totalApplications}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-sky-500 h-full rounded-full w-full" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                    <span>2. Candidate Contacted / Screened</span>
                    <span className="font-bold">{Math.max(0, metrics.totalApplications - metrics.newApplications)}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${metrics.totalApplications ? Math.min(100, Math.round(((metrics.totalApplications - metrics.newApplications) / metrics.totalApplications) * 100)) : 0}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                    <span>3. Selected Candidates</span>
                    <span className="font-bold">{metrics.selectedCandidates}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-purple-500 h-full rounded-full" style={{ width: `${metrics.totalApplications ? Math.min(100, Math.round((metrics.selectedCandidates / metrics.totalApplications) * 100)) : 0}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                    <span>4. Onboarded Active Interns</span>
                    <span className="font-bold text-emerald-600">{metrics.activeInterns}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${metrics.totalApplications ? Math.min(100, Math.round((metrics.activeInterns / metrics.totalApplications) * 100)) : 0}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* LIVE TEAM STATUS */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  <span>Live Team Status</span>
                </h3>
                <Badge variant="success">{metrics.checkedInNow} Checked In</Badge>
              </div>

              <div className="space-y-2 flex-1 overflow-y-auto">
                {liveAttendanceList.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-8">No attendance recorded today yet.</p>
                ) : (
                  liveAttendanceList.slice(0, 6).map((att: any) => (
                    <div key={att.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 text-xs">
                      <div className="flex items-center space-x-2">
                        <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-[10px]">
                          {att.userName ? att.userName[0].toUpperCase() : 'U'}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{att.userName}</p>
                          <span className={`text-[10px] ${att.status === 'CHECKED_IN' ? 'text-emerald-600 font-medium' : att.status === 'ON_BREAK' ? 'text-amber-600' : 'text-slate-400'}`}>
                            {att.status}
                          </span>
                        </div>
                      </div>
                      <span className="font-mono text-slate-500 text-[11px]">{Math.round((att.netWorkedMinutes || 0) / 60)}h worked</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* RECENT ACTIVITY STREAM */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center space-x-2">
              <FileText className="w-4 h-4 text-slate-600" />
              <span>Recent System Activity & Audit Trail</span>
            </h3>

            <div className="divide-y divide-slate-100 text-xs">
              {recentActivities.length === 0 ? (
                <p className="text-slate-400 py-4 text-center">No recent activity logged yet.</p>
              ) : (
                recentActivities.map((act) => (
                  <div key={act.id} className="py-2.5 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px]">
                        {act.action}
                      </span>
                      <span className="font-medium text-slate-800">{act.actorName}</span>
                      <span className="text-slate-500">
                        {act.metadata?.action || act.entityType}
                      </span>
                    </div>
                    <span className="text-slate-400 text-[11px] font-mono">
                      {act.createdAt?.toDate ? act.createdAt.toDate().toLocaleTimeString() : 'Just now'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* TEAM MEMBER DASHBOARD */}
      {isTeamMemberOnly && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
            <h3 className="text-base font-bold text-slate-900 mb-3">Today's Internship Deliverables</h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Maintain your daily work log and make sure to submit your weekly report before the end of each working week. Core hours: 09:00 AM - 04:00 PM PKT.
            </p>
            <div className="flex space-x-3">
              <Button size="sm" onClick={() => navigate('/work/daily-logs')}>
                Update Daily Work Log
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate('/work/weekly-reports')}>
                Submit Weekly Report
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
            <h3 className="text-base font-bold text-slate-900 mb-3">Attendance & Leave</h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Internship policy includes 3 approved leave days per month. Ensure leave requests are submitted in advance for supervisor review.
            </p>
            <div className="flex space-x-3">
              <Button size="sm" variant="outline" onClick={() => navigate('/leave')}>
                Request Leave
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate('/attendance/timesheets')}>
                View Timesheet
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Check Out Modal */}
      {checkoutModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Check Out Summary</h3>
            <p className="text-xs text-slate-500">Record what you achieved today before ending your session.</p>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Tasks Completed Today *</label>
              <textarea
                rows={2}
                required
                value={checkoutSummary.tasksCompleted}
                onChange={(e) => setCheckoutSummary({ ...checkoutSummary, tasksCompleted: e.target.value })}
                placeholder="List completed deliverables..."
                className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Challenges / Blockers (Optional)</label>
              <input
                type="text"
                value={checkoutSummary.blockers}
                onChange={(e) => setCheckoutSummary({ ...checkoutSummary, blockers: e.target.value })}
                placeholder="Any technical or design blockers..."
                className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Plans for Next Working Day</label>
              <input
                type="text"
                value={checkoutSummary.nextDayPlans}
                onChange={(e) => setCheckoutSummary({ ...checkoutSummary, nextDayPlans: e.target.value })}
                placeholder="Priority tasks for tomorrow..."
                className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setCheckoutModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" onClick={handleCheckOut} loading={actionLoading}>
                Confirm Check Out
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};