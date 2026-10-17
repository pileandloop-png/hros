import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { PeopleRecord, PeopleStatus, WorkerType } from '../../types/people';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Users, Calendar, Clock, Phone, Mail, UserX, AlertTriangle, Search, Filter, Sparkles, Zap, ShieldCheck, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ContractTenureModal } from './ContractTenureModal';

export const PeopleDirectory: React.FC = () => {
  const { isSupervisor } = useAuth();
  const navigate = useNavigate();

  const [people, setPeople] = useState<PeopleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'INTERN' | 'EMPLOYEE' | 'COMPLETED'>('ALL');
  const [search, setSearch] = useState('');

  const [tenureModalPerson, setTenureModalPerson] = useState<any | null>(null);

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

  const getDaysRemaining = (expectedEnd: any) => {
    if (!expectedEnd) return null;
    const end = expectedEnd.toDate ? expectedEnd.toDate() : new Date(expectedEnd);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const expiringPeople = people.filter((p) => {
    if (p.status !== 'ACTIVE') return false;
    const days = getDaysRemaining(p.contractEndDate || p.expectedEndDate);
    return days !== null && days <= 60;
  });

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

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">People & Active Intern Directory</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Active team members, tenure duration tracking, and contract expiry management
          </p>
        </div>
      </div>

      {/* Contract Expiry & Tenure Watchlist Banner */}
      {expiringPeople.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2.5 border-b border-amber-200/70">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900">
                  Contract Tenure & Expiry Watchlist ({expiringPeople.length} Action Needed)
                </h3>
                <p className="text-[11px] text-slate-600">
                  Proactive reminder: Contractual tenures approaching completion within 60 days
                </p>
              </div>
            </div>
            <span className="font-mono text-xs font-bold text-amber-900 bg-amber-100/90 px-2.5 py-1 rounded-full border border-amber-200 w-fit">
              Renewal Decision Required
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {expiringPeople.map((person) => {
              const days = getDaysRemaining(person.contractEndDate || person.expectedEndDate);
              return (
                <div key={person.personId} className="p-3 bg-white rounded-xl border border-amber-200 flex items-center justify-between text-xs shadow-2xs">
                  <div>
                    <h4 className="font-bold text-slate-900">{person.fullName}</h4>
                    <p className="text-[11px] text-slate-500">{person.jobTitle} • {person.department}</p>
                    <span className="font-mono text-[10px] text-amber-700 font-bold mt-0.5 block">
                      Expires in {days !== null ? `${days} days` : 'soon'} ({person.contractType || 'Contractual'})
                    </span>
                  </div>
                  {isSupervisor && (
                    <Button
                      size="sm"
                      onClick={() => setTenureModalPerson(person)}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-[11px] py-1 px-2.5 cursor-pointer ml-2"
                    >
                      <span>⚡ Renew</span>
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

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
            const daysLeft = getDaysRemaining(person.contractEndDate || person.expectedEndDate);
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
                        <span className="text-[11px] text-slate-500">{person.jobTitle} • {person.department}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={person.status === 'ACTIVE' ? 'success' : person.status === 'COMPLETED' ? 'neutral' : 'warning'}>
                        {person.status}
                      </Badge>
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        {person.contractType || (person.workerType === 'INTERN' ? 'CONTRACTUAL' : 'PERMANENT')}
                      </span>
                    </div>
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
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Joined: {person.joinDate || person.contractStartDate || 'Configured'}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{person.expectedHoursPerDay || 5} hrs/day ({person.coreHours || '09:00 - 16:00 PKT'})</span>
                    </div>
                  </div>

                  {/* Contract & Tenure Expiry Alert Indicator */}
                  {daysLeft !== null && (
                    <div className={`mt-3 p-2.5 rounded-xl text-[11px] flex items-center justify-between ${
                      daysLeft <= 7
                        ? 'bg-rose-50 text-rose-800 border border-rose-200'
                        : daysLeft <= 30
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : 'bg-slate-50 text-slate-600 border border-slate-200'
                    }`}>
                      <span className="font-semibold">
                        {daysLeft <= 0 ? 'Contract Tenure Ended' : `${daysLeft} Days Remaining in Tenure`}
                      </span>
                      <span className="font-mono text-[10px]">
                        End: {person.contractEndDate || (person.expectedEndDate?.toDate ? person.expectedEndDate.toDate().toLocaleDateString() : person.expectedEndDate ? new Date(person.expectedEndDate).toLocaleDateString() : 'Configured')}
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">Leave Allowance: {person.leaveAllowanceDaysPerMonth || 3} d/mo</span>
                  <div className="flex items-center space-x-1.5">
                    {isSupervisor && person.status === 'ACTIVE' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setTenureModalPerson(person)}
                        className="text-[11px] font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200"
                        title="Extend contract, convert to permanent, or renew tenure"
                      >
                        <Zap className="w-3 h-3 mr-1 text-sky-600" />
                        Tenure
                      </Button>
                    )}
                    {isSupervisor && person.status === 'ACTIVE' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/offboarding?personId=${person.personId}`)}
                      >
                        <UserX className="w-3.5 h-3.5 mr-1 text-slate-500" />
                        Offboard
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Contract Tenure & Renewal Modal */}
      {tenureModalPerson && (
        <ContractTenureModal
          isOpen={!!tenureModalPerson}
          onClose={() => setTenureModalPerson(null)}
          person={tenureModalPerson}
          onUpdated={loadPeople}
        />
      )}
    </div>
  );
};
