import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { checkIn, checkOut, startBreak, endBreak, FaceVerificationData } from '../../services/api';
import { FaceScanModal } from './FaceScanModal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import {
  Camera,
  Scan,
  Clock,
  CheckCircle2,
  Coffee,
  Square,
  Search,
  Sparkles,
  ShieldCheck,
  User,
  Users,
  ChevronRight,
  ArrowLeft,
  Building2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';

export const AttendanceKiosk: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [people, setPeople] = useState<any[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [todayRecords, setTodayRecords] = useState<Record<string, any>>({});
  const [recentPunches, setRecentPunches] = useState<any[]>([]);

  // Face Scan Modal State
  const [showFaceModal, setShowFaceModal] = useState(false);
  const [scanMode, setScanMode] = useState<'CHECK_IN' | 'CHECK_OUT'>('CHECK_IN');
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmationNotice, setConfirmationNotice] = useState<string | null>(null);

  const todayKey = new Date().toISOString().split('T')[0];

  // Live Clock Ticker
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load Active People & Today's Attendance Records
  useEffect(() => {
    getDocs(query(collection(db, 'people'), where('status', '==', 'ACTIVE'))).then((snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPeople(list);
      if (list.length > 0 && !selectedPerson) {
        setSelectedPerson(list[0]);
      }
    });

    const attQuery = query(collection(db, 'attendance'), where('dateKey', '==', todayKey));
    const unsub = onSnapshot(attQuery, (snap) => {
      const map: Record<string, any> = {};
      const recents: any[] = [];
      snap.docs.forEach((d) => {
        const data = { id: d.id, ...d.data() };
        map[data.userId] = data;
        recents.push(data);
      });
      setTodayRecords(map);
      // Sort recents by updatedAt desc
      recents.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
      setRecentPunches(recents.slice(0, 6));
    });

    return () => unsub();
  }, [todayKey]);

  const filteredPeople = people.filter(p =>
    (p.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.designation || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.department || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeRecord = selectedPerson ? todayRecords[selectedPerson.uid || selectedPerson.id] : null;

  // Handler for Biometric Face Scan Completion
  const handleFaceScanVerified = async (verification: FaceVerificationData) => {
    if (!selectedPerson) return;
    setActionLoading(true);
    setShowFaceModal(false);

    try {
      const uid = selectedPerson.uid || selectedPerson.id;
      const userName = selectedPerson.fullName;

      if (scanMode === 'CHECK_IN') {
        await checkIn(
          'Checked in via Entrance Biometric Station',
          verification,
          { uid, displayName: userName, department: selectedPerson.department, role: selectedPerson.designation || selectedPerson.role }
        );
        toast.success(`Biometric Check-In Verified for ${userName}!`);
        setConfirmationNotice(`Welcome, ${userName}! Check-In recorded at ${currentTime.toLocaleTimeString('en-US', { timeZone: 'Asia/Karachi' })}.`);
      } else {
        await checkOut({
          tasksCompleted: 'Office day completed via Biometric Station',
          faceVerification: verification,
          customUser: { uid, displayName: userName }
        });
        toast.success(`Biometric Check-Out Verified for ${userName}!`);
        setConfirmationNotice(`Goodbye, ${userName}! Check-Out recorded. Have a great evening!`);
      }

      setTimeout(() => setConfirmationNotice(null), 6000);
    } catch (err: any) {
      toast.error(err.message || 'Biometric punch failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartBreak = async () => {
    if (!selectedPerson) return;
    setActionLoading(true);
    try {
      await startBreak(selectedPerson.uid || selectedPerson.id);
      toast.info(`${selectedPerson.fullName} is now on break.`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEndBreak = async () => {
    if (!selectedPerson) return;
    setActionLoading(true);
    try {
      await endBreak(selectedPerson.uid || selectedPerson.id);
      toast.success(`${selectedPerson.fullName} resumed work.`);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-6rem)] bg-slate-950 text-slate-100 rounded-2xl p-6 lg:p-8 space-y-6 shadow-2xl border border-slate-900 select-none">
      {/* Top Station Header & Live PKT Clock */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/attendance/live')}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
            title="Return to Live Attendance Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400">
                <Building2 className="w-4 h-4" />
              </span>
              <h1 className="text-lg font-black text-white tracking-wide">
                Pile & Loop • Biometric Attendance Station
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Office Entrance Kiosk • AI Facial Liveness & Anti-Spoof Verification
            </p>
          </div>
        </div>

        {/* Digital Clock Display */}
        <div className="bg-slate-900/90 px-5 py-2.5 rounded-2xl border border-slate-800 text-right flex items-center justify-between sm:justify-end space-x-4 shadow-inner">
          <div className="text-left sm:text-right">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">
              Pakistan Standard Time (PKT)
            </span>
            <span className="text-xs text-slate-300 font-medium">
              {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
          <div className="font-mono text-2xl font-black text-cyan-400 tracking-wider">
            {currentTime.toLocaleTimeString('en-US', { hour12: true })}
          </div>
        </div>
      </div>

      {/* Confirmation Notification Banner */}
      {confirmationNotice && (
        <div className="p-4 bg-emerald-500/20 border border-emerald-500/50 rounded-2xl text-emerald-300 flex items-center space-x-3 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
          <div className="flex-1">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Verification Confirmed
            </h4>
            <p className="text-xs font-medium">{confirmationNotice}</p>
          </div>
        </div>
      )}

      {/* Main Kiosk Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Staff Directory Selector */}
        <div className="lg:col-span-5 bg-slate-900/80 rounded-2xl border border-slate-800 p-4 space-y-3 flex flex-col h-[520px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
              <Users className="w-4 h-4 text-sky-400" />
              <span>Select Employee ({people.length})</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Touch name to punch</span>
          </div>

          {/* Quick Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by name, role or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          {/* Staff List Scroll Area */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
            {filteredPeople.map((person) => {
              const isSelected = selectedPerson?.id === person.id;
              const att = todayRecords[person.uid || person.id];
              const isCheckedIn = att?.status === 'CHECKED_IN';
              const isOnBreak = att?.status === 'ON_BREAK';
              const isCheckedOut = att?.status === 'CHECKED_OUT';

              return (
                <button
                  key={person.id}
                  onClick={() => setSelectedPerson(person)}
                  className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-500/10 border-cyan-500/60 shadow-lg shadow-cyan-950/50'
                      : 'bg-slate-950/50 border-slate-800 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center space-x-3 truncate">
                    <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-white shrink-0">
                      {person.fullName ? person.fullName[0].toUpperCase() : 'U'}
                    </div>
                    <div className="truncate">
                      <h4 className="text-xs font-bold text-slate-200 truncate">{person.fullName}</h4>
                      <p className="text-[11px] text-slate-400 truncate">
                        {person.designation || person.role} • {person.department}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    {isCheckedIn && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Working
                      </span>
                    )}
                    {isOnBreak && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        On Break
                      </span>
                    )}
                    {isCheckedOut && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                        Completed
                      </span>
                    )}
                    {!att && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-900 text-slate-500">
                        Not In
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Facial Verification Action Pod */}
        <div className="lg:col-span-7 bg-slate-900/80 rounded-2xl border border-slate-800 p-6 flex flex-col justify-between space-y-6">
          {selectedPerson ? (
            <>
              {/* Selected Staff Profile Card */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 bg-slate-950/70 rounded-2xl border border-slate-800">
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-sky-400 p-0.5 shrink-0 shadow-lg">
                    <div className="w-full h-full bg-slate-950 rounded-2xl flex items-center justify-center font-black text-xl text-white">
                      {selectedPerson.fullName ? selectedPerson.fullName[0].toUpperCase() : 'U'}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{selectedPerson.fullName}</h3>
                    <p className="text-xs text-cyan-400 font-mono mt-0.5">
                      {selectedPerson.designation || selectedPerson.role}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {selectedPerson.department} • ID: {selectedPerson.id}
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">
                    Today's Presence State
                  </span>
                  <div className="mt-1">
                    {activeRecord?.status === 'CHECKED_IN' ? (
                      <Badge variant="success">CHECKED IN & WORKING</Badge>
                    ) : activeRecord?.status === 'ON_BREAK' ? (
                      <Badge variant="warning">CURRENTLY ON BREAK</Badge>
                    ) : activeRecord?.status === 'CHECKED_OUT' ? (
                      <Badge variant="neutral">CHECKED OUT</Badge>
                    ) : (
                      <Badge variant="danger">NOT CHECKED IN TODAY</Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Details / Session Metrics */}
              {activeRecord && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Check-In Time</span>
                    <span className="font-mono text-sm font-bold text-emerald-400 mt-1 block">
                      {new Date(activeRecord.checkInAt || activeRecord.checkInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-[9px] text-slate-500">
                      {activeRecord.isLate ? `Late by ${activeRecord.lateMinutes}m` : 'On time'}
                    </span>
                  </div>

                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Worked Duration</span>
                    <span className="font-mono text-sm font-bold text-white mt-1 block">
                      {activeRecord.netWorkedMinutes ? (activeRecord.netWorkedMinutes / 60).toFixed(1) + ' hrs' : 'Active'}
                    </span>
                    <span className="text-[9px] text-slate-500">Target: 5.0h standard</span>
                  </div>

                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Break Taken</span>
                    <span className="font-mono text-sm font-bold text-amber-400 mt-1 block">
                      {activeRecord.breakMinutes || 0} mins
                    </span>
                    <span className="text-[9px] text-slate-500">Paid rest interval</span>
                  </div>

                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Verification</span>
                    <span className="font-mono text-xs font-bold text-cyan-400 mt-1 block truncate">
                      {activeRecord.faceVerification?.confidenceScore
                        ? `${activeRecord.faceVerification.confidenceScore}% Face Match`
                        : 'Biometric Verified'}
                    </span>
                    <span className="text-[9px] text-slate-500">Anti-spoof pass</span>
                  </div>
                </div>
              )}

              {/* Action Punch Buttons */}
              <div className="p-6 bg-slate-950/70 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                    <Scan className="w-4 h-4 text-cyan-400" />
                    <span>Touch to Scan Face</span>
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Camera captures photo for HR verification audit
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Scan Face Check-In */}
                  {(!activeRecord || activeRecord.status === 'CHECKED_OUT') && (
                    <button
                      type="button"
                      onClick={() => {
                        setScanMode('CHECK_IN');
                        setShowFaceModal(true);
                      }}
                      disabled={actionLoading}
                      className="w-full p-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl font-bold flex flex-col items-center justify-center space-y-2 shadow-lg shadow-emerald-950/50 hover:scale-[1.02] transition-all cursor-pointer"
                    >
                      <Camera className="w-7 h-7" />
                      <span className="text-sm">Scan Face & Check In</span>
                      <span className="text-[10px] text-emerald-200 font-normal">
                        Verify identity & record arrival
                      </span>
                    </button>
                  )}

                  {/* Scan Face Check-Out */}
                  {activeRecord?.status === 'CHECKED_IN' && (
                    <button
                      type="button"
                      onClick={() => {
                        setScanMode('CHECK_OUT');
                        setShowFaceModal(true);
                      }}
                      disabled={actionLoading}
                      className="w-full p-4 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white rounded-2xl font-bold flex flex-col items-center justify-center space-y-2 shadow-lg shadow-rose-950/50 hover:scale-[1.02] transition-all cursor-pointer"
                    >
                      <Camera className="w-7 h-7" />
                      <span className="text-sm">Scan Face & Check Out</span>
                      <span className="text-[10px] text-rose-200 font-normal">
                        Verify identity & finish work day
                      </span>
                    </button>
                  )}

                  {/* Break Controls */}
                  {activeRecord?.status === 'CHECKED_IN' && (
                    <button
                      type="button"
                      onClick={handleStartBreak}
                      disabled={actionLoading}
                      className="w-full p-4 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-2xl font-bold flex flex-col items-center justify-center space-y-2 border border-slate-700 hover:scale-[1.02] transition-all cursor-pointer"
                    >
                      <Coffee className="w-7 h-7 text-amber-400" />
                      <span className="text-sm">Take designated break</span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        Pause working session
                      </span>
                    </button>
                  )}

                  {activeRecord?.status === 'ON_BREAK' && (
                    <button
                      type="button"
                      onClick={handleEndBreak}
                      disabled={actionLoading}
                      className="w-full p-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-2xl font-bold flex flex-col items-center justify-center space-y-2 shadow-lg shadow-amber-950/50 hover:scale-[1.02] transition-all cursor-pointer"
                    >
                      <Clock className="w-7 h-7" />
                      <span className="text-sm">Resume Work Session</span>
                      <span className="text-[10px] text-amber-200 font-normal">
                        End break & continue productive hours
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-500 space-y-3">
              <User className="w-12 h-12 text-slate-700" />
              <h4 className="text-sm font-bold text-slate-400">Select an employee from the directory</h4>
              <p className="text-xs text-slate-600 max-w-sm">
                Choose your name on the left directory to initialize the high-precision facial biometric verification scanner.
              </p>
            </div>
          )}

          {/* Recent Biometric Punches Ticker */}
          <div className="pt-2 border-t border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Recent Biometric Punches Today ({recentPunches.length})
            </span>
            <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-thin">
              {recentPunches.length === 0 ? (
                <span className="text-[11px] text-slate-600">No punches recorded yet today.</span>
              ) : (
                recentPunches.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center space-x-2 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800 shrink-0"
                  >
                    {p.faceVerification?.photoSnapshotUrl ? (
                      <img
                        src={p.faceVerification.photoSnapshotUrl}
                        alt="Face Snapshot"
                        className="w-6 h-6 rounded-full object-cover border border-emerald-500/60"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-slate-800 text-[10px] font-bold text-white flex items-center justify-center">
                        {p.userName ? p.userName[0].toUpperCase() : 'U'}
                      </div>
                    )}
                    <div className="text-[10px]">
                      <span className="font-bold text-slate-300 block truncate max-w-[90px]">{p.userName}</span>
                      <span className="text-[9px] text-slate-500 font-mono">
                        {new Date(p.checkInAt || p.checkInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Biometric Face Scan Modal */}
      {showFaceModal && (
        <FaceScanModal
          isOpen={showFaceModal}
          onClose={() => setShowFaceModal(false)}
          onVerified={handleFaceScanVerified}
          mode={scanMode}
          userName={selectedPerson?.fullName || 'Team Member'}
        />
      )}
    </div>
  );
};
