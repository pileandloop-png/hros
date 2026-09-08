import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { PeopleRecord, PeopleStatus, WorkerType } from '../../types/people';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { Users, Calendar, Clock, Phone, Mail, UserX, AlertTriangle, Search, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const PeopleDirectory: React.FC = () => {
  const { isSupervisor } = useAuth();
  const navigate = useNavigate();

  const [people, setPeople] = useState<PeopleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'INTERN' | 'EMPLOYEE' | 'COMPLETED'>('ALL');
  const [search, setSearch] = useState('');

  const loadPeople = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'people'));
      setPeople(snap.docs.map(d => ({ personId: d.id, ...d.data() } as PeopleRecord)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPeople();
  }, []);

  const filteredPeople = people.filter((p) => {
    const matchSearch =
      !search ||
      p.fullName.toLowerCase().includes(search.toLowerCase()) ||
      p.personalEmail.toLowerCase().includes(search.toLowerCase()) ||
      p.department.toLowerCase().includes(search.toLowerCase()) ||
      p.jobTitle.toLowerCase().includes(search.toLowerCase());

    const matchType =
      activeFilter === 'ALL' ||
      (activeFilter === 'INTERN' && p.workerType === 'INTERN' && p.status === 'ACTIVE') ||
      (activeFilter === 'EMPLOYEE' && p.workerType === 'EMPLOYEE') ||
      (activeFilter === 'COMPLETED' && (p.status === 'COMPLETED' || p.status === 'OFFBOARDED'));

    return matchSearch && matchType;
  });

  const getDaysRemaining = (expectedEnd: any) => {
    if (!expectedEnd) return null;
    const end = expectedEnd.toDate ? expectedEnd.toDate() : new Date(expectedEnd);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">People & Active Intern Directory</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Active team members, internship duration tracking, and records
          </p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          {(['ALL', 'INTERN', 'EMPLOYEE', 'COMPLETED'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeFilter === f
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f === 'ALL' ? 'All Members' : f === 'INTERN' ? 'Active Interns' : f === 'EMPLOYEE' ? 'Staff' : 'Alumni'}
            </button>
          ))}
        </div>

        <div className="relative w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search name, role, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>
      </div>

      {/* People Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPeople.length === 0 ? (
          <div className="col-span-full p-12 bg-white rounded-xl border border-dashed text-center text-xs text-slate-500">
            {loading ? 'Loading team directory...' : 'No team members match the filter.'}
          </div>
        ) : (
          filteredPeople.map((person) => {
            const daysLeft = getDaysRemaining(person.expectedEndDate);
            return (
              <div
                key={person.personId}
                className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between space-y-4 text-xs"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-bold text-sm flex items-center justify-center">
                        {person.fullName ? person.fullName[0].toUpperCase() : 'U'}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{person.fullName}</h4>
                        <span className="text-[11px] text-slate-500">{person.jobTitle} ? {person.department}</span>
                      </div>
                    </div>
                    <Badge variant={person.status === 'ACTIVE' ? 'success' : person.status === 'COMPLETED' ? 'neutral' : 'warning'}>
                      {person.status}
                    </Badge>
                  </div>

                  <div className="mt-4 space-y-1.5 text-[11px] text-slate-600">
                    <div className="flex items-center space-x-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-mono">{person.personalEmail}</span>
                    </div>
                    {person.phone && (
                      <div className="flex items-center space-x-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-mono">{person.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{person.expectedHoursPerDay || 5} hrs/day ({person.coreHours || '09:00 - 16:00 PKT'})</span>
                    </div>
                  </div>

                  {/* Internship End Date Alert Indicator */}
                  {person.workerType === 'INTERN' && daysLeft !== null && (
                    <div className={`mt-3 p-2 rounded-lg text-[11px] flex items-center justify-between ${
                      daysLeft <= 7
                        ? 'bg-rose-50 text-rose-800 border border-rose-200'
                        : daysLeft <= 30
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : 'bg-slate-50 text-slate-600 border border-slate-200'
                    }`}>
                      <span className="font-medium">
                        {daysLeft <= 0 ? 'Internship Period Ended' : `${daysLeft} Days Remaining`}
                      </span>
                      <span className="font-mono text-[10px]">
                        End: {person.expectedEndDate?.toDate ? person.expectedEndDate.toDate().toLocaleDateString() : 'Configured'}
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">Leave Allowance: {person.leaveAllowanceDaysPerMonth || 3} days/mo</span>
                  {isSupervisor && person.status === 'ACTIVE' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/offboarding?personId=${person.personId}`)}
                    >
                      <UserX className="w-3.5 h-3.5 mr-1 text-slate-500" />
                      Offboarding
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
