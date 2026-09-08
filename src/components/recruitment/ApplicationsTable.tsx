import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, doc, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { transitionApplicationStage } from '../../services/api';
import { Application, ApplicationStage } from '../../types/recruitment';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Papa from 'papaparse';
import {
  Search,
  Filter,
  Download,
  Eye,
  ArrowUpDown,
  CheckSquare,
  Square,
  AlertTriangle,
  UserPlus
} from 'lucide-react';

const STAGE_OPTIONS: ApplicationStage[] = [
  'NEW_APPLICATION',
  'INITIAL_REVIEW',
  'INITIAL_EMAIL_SENT',
  'REPLY_PENDING',
  'SCREENING_QUESTIONS_SENT',
  'SCREENING_RESPONSE_RECEIVED',
  'INTERVIEW_INVITED',
  'INTERVIEW_SCHEDULED',
  'INTERVIEW_COMPLETED',
  'DECISION_PENDING',
  'SELECTED',
  'OFFER_SENT',
  'ONBOARDING_DOCUMENTS_PENDING',
  'DOCUMENTS_UNDER_REVIEW',
  'ONBOARDED',
  'NOT_HIRED',
  'WITHDRAWN',
  'DISQUALIFIED',
];

export const ApplicationsTable: React.FC = () => {
  const { isSupervisor, canMakeHiringDecisions } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [candidatesMap, setCandidatesMap] = useState<Map<string, any>>(new Map());

  // Filters & Search
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [stageFilter, setStageFilter] = useState(searchParams.get('stage') || 'ALL');
  const [sourceFilter, setSourceFilter] = useState('ALL');

  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Stage transition confirmation modal
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [pendingTransition, setPendingTransition] = useState<{
    appId: string;
    newStage: ApplicationStage;
    appName: string;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch Candidates
      const cSnap = await getDocs(collection(db, 'candidates'));
      const cMap = new Map();
      cSnap.docs.forEach(d => cMap.set(d.id, { id: d.id, ...d.data() }));
      setCandidatesMap(cMap);

      // Fetch Applications
      const aSnap = await getDocs(collection(db, 'applications'));
      const apps = aSnap.docs.map(d => ({
        applicationId: d.id,
        ...d.data(),
        candidate: cMap.get(d.data().candidateId) || {},
      }));
      setApplications(apps);
    } catch (err) {
      console.error('Failed to load applications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered applications
  const filteredApps = useMemo(() => {
    return applications.filter((app) => {
      const matchSearch =
        !search ||
        app.applicationId.toLowerCase().includes(search.toLowerCase()) ||
        (app.candidate?.fullName || '').toLowerCase().includes(search.toLowerCase()) ||
        (app.candidate?.personalEmail || '').toLowerCase().includes(search.toLowerCase()) ||
        (app.positionAppliedFor || '').toLowerCase().includes(search.toLowerCase()) ||
        (app.candidate?.city || '').toLowerCase().includes(search.toLowerCase());

      const matchStage = stageFilter === 'ALL' || app.currentStage === stageFilter;
      const matchSource = sourceFilter === 'ALL' || app.source === sourceFilter;

      return matchSearch && matchStage && matchSource;
    });
  }, [applications, search, stageFilter, sourceFilter]);

  const handleStageChangeRequest = (appId: string, newStage: ApplicationStage, appName: string) => {
    const highImpact = ['SELECTED', 'NOT_HIRED', 'DISQUALIFIED', 'WITHDRAWN', 'ONBOARDED'];
    if (highImpact.includes(newStage)) {
      setPendingTransition({ appId, newStage, appName });
      setConfirmModalOpen(true);
    } else {
      executeStageChange(appId, newStage);
    }
  };

  const executeStageChange = async (appId: string, newStage: ApplicationStage) => {
    setActionLoading(true);
    try {
      await transitionApplicationStage(appId, newStage);
      setApplications(prev => prev.map(a => a.applicationId === appId ? { ...a, currentStage: newStage } : a));
      setConfirmModalOpen(false);
      setPendingTransition(null);
    } catch (err: any) {
      alert(err.message || 'Stage transition failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportCsv = () => {
    const exportData = filteredApps.map(a => ({
      'Application ID': a.legacyApplicationId || a.applicationId,
      'Candidate Name': a.candidate?.fullName || '',
      'Email': a.candidate?.personalEmail || '',
      'Phone': a.candidate?.phone || '',
      'City': a.candidate?.city || '',
      'Position': a.positionAppliedFor || '',
      'Stage': a.currentStage || '',
      'Source': a.source || '',
      'Screening Score': a.screeningScore || '',
      'HR Notes': a.hrNotes || '',
    }));

    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `applications_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredApps.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredApps.map(a => a.applicationId));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Applications Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">Filter, review, and progress recruitment candidates</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button size="sm" variant="outline" onClick={handleExportCsv}>
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export CSV
          </Button>
          <Button size="sm" onClick={() => navigate('/recruitment/import')}>
            <UserPlus className="w-3.5 h-3.5 mr-1.5" />
            Import Tracker CSV
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, email, phone, city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>

        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:bg-white text-slate-700"
        >
          <option value="ALL">All Stages ({applications.length})</option>
          {STAGE_OPTIONS.map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>

        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:bg-white text-slate-700"
        >
          <option value="ALL">All Sources</option>
          <option value="Indeed">Indeed</option>
          <option value="Email">Email</option>
          <option value="Direct Approach">Direct Approach</option>
          <option value="Website">Website</option>
          <option value="Referral">Referral</option>
        </select>
      </div>

      {/* Applications Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold select-none">
              <tr>
                <th className="p-3 w-10">
                  <button onClick={toggleSelectAll} className="cursor-pointer text-slate-400 hover:text-slate-600">
                    {selectedIds.length === filteredApps.length && filteredApps.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-sky-600" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="p-3">Candidate</th>
                <th className="p-3">Position</th>
                <th className="p-3">Stage</th>
                <th className="p-3">Source</th>
                <th className="p-3">Follow-up</th>
                <th className="p-3">City</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredApps.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 text-xs">
                    {loading ? 'Loading applications...' : 'No applications match the active filters.'}
                  </td>
                </tr>
              ) : (
                filteredApps.map((app) => (
                  <tr key={app.applicationId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3">
                      <button onClick={() => toggleSelect(app.applicationId)} className="cursor-pointer text-slate-400 hover:text-slate-600">
                        {selectedIds.includes(app.applicationId) ? (
                          <CheckSquare className="w-4 h-4 text-sky-600" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </td>

                    <td className="p-3">
                      <div className="font-semibold text-slate-900 cursor-pointer hover:text-sky-600" onClick={() => navigate(`/recruitment/candidates/${app.candidateId}?appId=${app.applicationId}`)}>
                        {app.candidate?.fullName || 'Unnamed'}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">{app.candidate?.personalEmail}</div>
                      {app.candidate?.phone && <div className="text-[10px] text-slate-400 font-mono">{app.candidate?.phone}</div>}
                    </td>

                    <td className="p-3">
                      <span className="font-medium text-slate-800">{app.positionAppliedFor}</span>
                      <span className="block text-[10px] text-slate-400 font-mono">{app.legacyApplicationId || app.applicationId.slice(0, 8)}</span>
                    </td>

                    <td className="p-3">
                      <select
                        value={app.currentStage}
                        onChange={(e) => handleStageChangeRequest(app.applicationId, e.target.value as ApplicationStage, app.candidate?.fullName || 'Candidate')}
                        className="text-[11px] font-medium py-1 px-2 border border-slate-200 rounded-md bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
                      >
                        {STAGE_OPTIONS.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="p-3">
                      <Badge variant="neutral">{app.source || 'Direct'}</Badge>
                    </td>

                    <td className="p-3">
                      <span className="text-[11px] text-slate-600">
                        {app.followUpStatus || 'None'}
                      </span>
                    </td>

                    <td className="p-3 text-slate-600">
                      {app.candidate?.city || '—'}
                    </td>

                    <td className="p-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/recruitment/candidates/${app.candidateId}?appId=${app.applicationId}`)}
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        360° Profile
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Showing {filteredApps.length} of {applications.length} applications</span>
          {selectedIds.length > 0 && (
            <span className="font-semibold text-slate-800">{selectedIds.length} rows selected</span>
          )}
        </div>
      </div>

      {/* Confirm High-Impact Stage Change Dialog */}
      {confirmModalOpen && pendingTransition && (
        <ConfirmDialog
          isOpen={confirmModalOpen}
          onClose={() => setConfirmModalOpen(false)}
          onConfirm={() => executeStageChange(pendingTransition.appId, pendingTransition.newStage)}
          title={`Confirm High-Impact Transition: ${pendingTransition.newStage}`}
          message={`Are you sure you want to transition candidate "${pendingTransition.appName}" to "${pendingTransition.newStage}"? High-impact recruitment transitions cannot be undone without supervisor audit review.`}
          confirmText={`Move to ${pendingTransition.newStage}`}
          confirmVariant={pendingTransition.newStage === 'SELECTED' ? 'success' : pendingTransition.newStage === 'NOT_HIRED' ? 'danger' : 'primary'}
          loading={actionLoading}
        />
      )}
    </div>
  );
};