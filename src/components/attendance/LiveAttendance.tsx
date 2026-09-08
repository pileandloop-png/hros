import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { Clock, Coffee, CheckCircle, AlertCircle, Calendar } from 'lucide-react';

export const LiveAttendance: React.FC = () => {
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [people, setPeople] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);

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
  const notCheckedIn = people.filter(p => !activeUserIds.has(p.userUid));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Live Attendance Dashboard</h2>
          <p className="text-xs text-slate-500 mt-0.5">Real-time team presence tracking in Asia/Karachi (PKT) timezone</p>
        </div>

        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="text-xs px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
          />
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Checked In Now</span>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{checkedIn.length}</p>
          <span className="text-[10px] text-slate-400">Actively working</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">On Break</span>
          <p className="text-2xl font-bold text-amber-600 mt-1">{onBreak.length}</p>
          <span className="text-[10px] text-slate-400">Taking designated break</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Checked Out</span>
          <p className="text-2xl font-bold text-slate-800 mt-1">{checkedOut.length}</p>
          <span className="text-[10px] text-slate-400">Completed for today</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Not Checked In</span>
          <p className="text-2xl font-bold text-slate-400 mt-1">{notCheckedIn.length}</p>
          <span className="text-[10px] text-slate-400">Pending check-in</span>
        </div>
      </div>

      {/* Live Activity Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Active Presence */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center justify-between">
            <span className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              <span>Active Sessions ({checkedIn.length + onBreak.length})</span>
            </span>
          </h3>

          <div className="divide-y divide-slate-100 text-xs">
            {checkedIn.length === 0 && onBreak.length === 0 ? (
              <p className="py-6 text-center text-slate-400">No active sessions at the moment.</p>
            ) : (
              [...checkedIn, ...onBreak].map((att) => (
                <div key={att.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs">
                      {att.userName ? att.userName[0].toUpperCase() : 'U'}
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900">{att.userName}</h4>
                      <p className="text-[11px] text-slate-500">
                        Check-in: {att.checkInAt?.toDate ? att.checkInAt.toDate().toLocaleTimeString() : 'Recent'}
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
          </h3>

          <div className="divide-y divide-slate-100 text-xs">
            {checkedOut.length === 0 ? (
              <p className="py-6 text-center text-slate-400">No members checked out yet today.</p>
            ) : (
              checkedOut.map((att) => (
                <div key={att.id} className="py-3 flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-slate-900">{att.userName}</h4>
                    <p className="text-[11px] text-slate-500">
                      Out: {att.checkOutAt?.toDate ? att.checkOutAt.toDate().toLocaleTimeString() : 'Recent'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-slate-800">
                      {(att.netWorkedMinutes / 60).toFixed(1)} hrs
                    </span>
                    <span className="block text-[10px] text-slate-400">{att.breakMinutes || 0}m break</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
