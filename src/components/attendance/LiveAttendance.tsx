import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useCompanyProfile } from '../../contexts/CompanyContext';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import {
  Clock,
  Coffee,
  CheckCircle,
  AlertCircle,
  Calendar,
  Camera,
  Scan,
  ShieldCheck,
  BarChart3,
  ExternalLink,
  Users
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { FaceScanModal } from './FaceScanModal';
import { checkIn, FaceVerificationData } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

export const LiveAttendance: React.FC = () => {
  const { company } = useCompanyProfile();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [people, setPeople] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Face Scan Modal State
  const [faceModalOpen, setFaceModalOpen] = useState(false);
  const [punchingLoading, setPunchingLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    // Fetch all active people
    getDocs(query(collection(db, 'people'), where('status', '==', 'ACTIVE'))).then(snap => {
      setPeople(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Listen to attendance for selected date
    const q = query(collection(db, 'attendance'), where('dateKey', '==', selectedDate));
    const unsub = onSnapshot(q, (snap) => {
      setAttendanceRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return () => unsub();
  }, [selectedDate]);

  const checkedIn = attendanceRecords.filter(a => a.status === 'CHECKED_IN');
  const onBreak = attendanceRecords.filter(a => a.status === 'ON_BREAK');
  const checkedOut = attendanceRecords.filter(a => a.status === 'CHECKED_OUT');

  // People with no attendance record today
  const activeUserIds = new Set(attendanceRecords.map(a => a.userId));
  const notCheckedIn = people.filter(p => !activeUserIds.has(p.uid || p.id));

  const handleFaceScanPunchComplete = async (verification: FaceVerificationData) => {
    setPunchingLoading(true);
    setFaceModalOpen(false);
    try {
      await checkIn('Checked in via Live Attendance Camera Scan', verification);
      toast.success('Biometric Face Scan verified! Check-in recorded.');
    } catch (err: any) {
      toast.error(err.message || 'Check-in failed');
    } finally {
      setPunchingLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-sky-50 text-sky-600">
              <Clock className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-900">Live Attendance & Biometric Audit</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time team presence tracking and camera face-scan verification in {company.timezone || 'Asia/Karachi'} (PKT)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Launch Kiosk Station */}
          <Button
            size="sm"
            onClick={() => navigate('/attendance/kiosk')}
            className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-xs cursor-pointer"
          >
            <Scan className="w-3.5 h-3.5 mr-1.5 text-cyan-400" />
            Open Entrance Kiosk
          </Button>

          {/* Analytics Page */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/attendance/analytics')}
            className="bg-white text-xs shadow-2xs"
          >
            <BarChart3 className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
            Attendance Analytics
          </Button>

          {/* Quick Scan Face to Punch */}
          <Button
            size="sm"
            onClick={() => setFaceModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs"
          >
            <Camera className="w-3.5 h-3.5 mr-1.5" />
            Scan Face to Punch
          </Button>

          <div className="flex items-center space-x-1.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs bg-transparent border-0 focus:outline-none text-slate-700 font-medium"
            />
          </div>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Checked In Now</span>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{checkedIn.length}</p>
          <span className="text-[10px] text-slate-400">Actively working on site/remote</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">On Break</span>
          <p className="text-2xl font-bold text-amber-600 mt-1">{onBreak.length}</p>
          <span className="text-[10px] text-slate-400">Taking designated break</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Checked Out</span>
          <p className="text-2xl font-bold text-slate-800 mt-1">{checkedOut.length}</p>
          <span className="text-[10px] text-slate-400">Completed for today</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Arrival</span>
          <p className="text-2xl font-bold text-slate-400 mt-1">{notCheckedIn.length}</p>
          <span className="text-[10px] text-slate-400">Not checked in yet</span>
        </div>
      </div>

      {/* Live Activity Grid with Facial Photo Verification */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Active Presence */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center justify-between">
            <span className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              <span>Active Sessions & Biometric Audits ({checkedIn.length + onBreak.length})</span>
            </span>
            <Badge variant="success">Real-Time</Badge>
          </h3>

          <div className="divide-y divide-slate-100 text-xs">
            {checkedIn.length === 0 && onBreak.length === 0 ? (
              <p className="py-8 text-center text-slate-400">No active team members punched in yet.</p>
            ) : (
              [...checkedIn, ...onBreak].map((att) => (
                <div key={att.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {/* Face Verification Snapshot Photo */}
                    {att.faceVerification?.photoSnapshotUrl ? (
                      <div className="relative shrink-0">
                        <img
                          src={att.faceVerification.photoSnapshotUrl}
                          alt="Face Verification"
                          className="w-10 h-10 rounded-full object-cover border-2 border-emerald-500 shadow-2xs"
                        />
                        <div className="absolute -bottom-1 -right-1 p-0.5 bg-emerald-500 text-white rounded-full">
                          <ShieldCheck className="w-2.5 h-2.5" />
                        </div>
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs shrink-0">
                        {att.userName ? att.userName[0].toUpperCase() : 'U'}
                      </div>
                    )}

                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-bold text-slate-900">{att.userName}</h4>
                        {att.faceVerification?.confidenceScore && (
                          <span className="text-[9px] font-mono font-bold bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded border border-emerald-200">
                            {att.faceVerification.confidenceScore}% Face Match
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        In: {new Date(att.checkInAt || att.checkInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        {att.isLate && <span className="text-amber-600 font-semibold ml-1.5">Late (+{att.lateMinutes}m)</span>}
                        {att.plannedTasks && <span className="text-slate-400 ml-1.5 truncate max-w-xs block sm:inline">• {att.plannedTasks}</span>}
                      </p>
                    </div>
                  </div>

                  <Badge variant={att.status === 'CHECKED_IN' ? 'success' : 'warning'}>
                    {att.status === 'CHECKED_IN' ? 'Working' : 'On Break'}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Checked Out / Completed Today */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center justify-between">
            <span className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-sky-600" />
              <span>Checked Out Today ({checkedOut.length})</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Shift Completed</span>
          </h3>

          <div className="divide-y divide-slate-100 text-xs">
            {checkedOut.length === 0 ? (
              <p className="py-8 text-center text-slate-400">No team members checked out yet today.</p>
            ) : (
              checkedOut.map((att) => (
                <div key={att.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {att.faceVerification?.photoSnapshotUrl ? (
                      <img
                        src={att.faceVerification.photoSnapshotUrl}
                        alt="Face Snapshot"
                        className="w-10 h-10 rounded-full object-cover border-2 border-slate-300 shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs shrink-0">
                        {att.userName ? att.userName[0].toUpperCase() : 'U'}
                      </div>
                    )}

                    <div>
                      <h4 className="font-bold text-slate-900">{att.userName}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Out: {new Date(att.checkOutAt || att.checkOutTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        {att.tasksCompleted && <span className="text-slate-400 ml-1.5 block sm:inline truncate max-w-xs">• {att.tasksCompleted}</span>}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {att.netWorkedMinutes ? (att.netWorkedMinutes / 60).toFixed(1) : '5.0'} hrs
                    </span>
                    <span className="block text-[10px] text-slate-400">{att.breakMinutes || 0}m break</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Biometric Face Scan Modal */}
      {faceModalOpen && (
        <FaceScanModal
          isOpen={faceModalOpen}
          onClose={() => setFaceModalOpen(false)}
          onVerified={handleFaceScanPunchComplete}
          mode="CHECK_IN"
          userName={user?.displayName || 'Team Member'}
        />
      )}
    </div>
  );
};
