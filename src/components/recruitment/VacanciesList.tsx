import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { store } from '../../services/store';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { closeVacancy } from '../../services/api';
import { Vacancy, VacancyStatus } from '../../types/recruitment';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import {
  Plus,
  Briefcase,
  Users,
  Calendar,
  MapPin,
  Clock,
  Edit3,
  Trash2,
  Eye,
  ExternalLink,
  FileBarChart,
  CheckCircle,
  AlertCircle,
  Search,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const VacanciesList: React.FC = () => {
  const { isSupervisor } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [closeoutModalOpen, setCloseoutModalOpen] = useState(false);

  const [selectedVacancy, setSelectedVacancy] = useState<Vacancy | null>(null);
  const [vacancyToDelete, setVacancyToDelete] = useState<Vacancy | null>(null);
  const [closeoutReport, setCloseoutReport] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [editVacancyId, setEditVacancyId] = useState<string | null>(null);

  // Vacancy Form State
  const defaultFormState = {
    title: '',
    department: 'Engineering',
    type: 'Internship',
    employmentType: 'Part-time Internship',
    internshipDurationMonths: 4,
    expectedHoursPerDay: 5,
    coreHours: '09:00 - 16:00 PKT',
    locationType: 'REMOTE' as const,
    description: '',
    requirements: '',
    screeningQuestions: '1. Are you available for a 4-month remote internship with 5 productive hours/day?\n2. Share links to your portfolio/work samples.\n3. What tools/software are you proficient in?',
    interviewQuestions: '1. Tell us about a recent project you worked on.\n2. How do you manage your time and deliverables in a remote environment?',
    status: 'OPEN' as VacancyStatus,
  };

  const [formData, setFormData] = useState(defaultFormState);

  const loadVacancies = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'vacancies'));
      let list = snap.docs.map(d => ({ vacancyId: d.id, ...d.data() } as Vacancy));
      if (list.length === 0) {
        const storeVacancies = store.getCollection('vacancies');
        list = Object.values(storeVacancies).map(v => ({ vacancyId: v.id || v.vacancyId, ...v }));
      }
      setVacancies(list);
    } catch (err: any) {
      console.error('Error loading vacancies:', err);
      toast.error('Failed to load vacancies', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVacancies();
  }, []);

  const handleOpenCreate = () => {
    setFormData(defaultFormState);
    setEditVacancyId(null);
    setCreateModalOpen(true);
  };

  const handleOpenEdit = (vac: Vacancy) => {
    const reqString = Array.isArray(vac.requirements)
      ? vac.requirements.join('\n')
      : (typeof vac.requirements === 'string' ? vac.requirements : '');

    const screeningString = Array.isArray(vac.screeningQuestions)
      ? vac.screeningQuestions.map((q: any) => typeof q === 'string' ? q : q.question).join('\n')
      : '';

    const interviewString = Array.isArray(vac.interviewQuestions)
      ? vac.interviewQuestions.map((q: any) => typeof q === 'string' ? q : q.question).join('\n')
      : '';

    setFormData({
      title: vac.title || '',
      department: vac.department || 'Engineering',
      type: vac.type || 'Internship',
      employmentType: vac.employmentType || 'Part-time Internship',
      internshipDurationMonths: vac.internshipDurationMonths || 4,
      expectedHoursPerDay: vac.expectedHoursPerDay || 5,
      coreHours: vac.coreHours || '09:00 - 16:00 PKT',
      locationType: (vac.locationType as any) || 'REMOTE',
      description: vac.description || '',
      requirements: reqString,
      screeningQuestions: screeningString || defaultFormState.screeningQuestions,
      interviewQuestions: interviewString || defaultFormState.interviewQuestions,
      status: vac.status || 'OPEN',
    });

    setEditVacancyId(vac.vacancyId);
    setEditModalOpen(true);
  };

  const handleOpenDetails = (vac: Vacancy) => {
    setSelectedVacancy(vac);
    setDetailsModalOpen(true);
  };

  const handleSaveVacancy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Validation Error', 'Job title is required.');
      return;
    }

    setActionLoading(true);
    try {
      const screeningArr = formData.screeningQuestions
        .split('\n')
        .filter(q => q.trim())
        .map((q, idx) => ({
          id: `sq_${idx + 1}`,
          question: q.replace(/^\d+\.\s*/, '').trim(),
          required: true,
        }));

      const interviewArr = formData.interviewQuestions
        .split('\n')
        .filter(q => q.trim())
        .map((q, idx) => ({
          id: `iq_${idx + 1}`,
          question: q.replace(/^\d+\.\s*/, '').trim(),
        }));

      const vacPayload: any = {
        title: formData.title,
        department: formData.department,
        type: formData.type,
        employmentType: formData.employmentType,
        internshipDurationMonths: Number(formData.internshipDurationMonths),
        expectedHoursPerDay: Number(formData.expectedHoursPerDay),
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        coreHours: formData.coreHours,
        locationType: formData.locationType,
        description: formData.description,
        requirements: formData.requirements.split('\n').filter(r => r.trim()),
        screeningQuestions: screeningArr,
        interviewQuestions: interviewArr,
        status: formData.status,
        updatedAt: new Date().toISOString(),
      };

      if (editVacancyId) {
        try {
          await updateDoc(doc(db, 'vacancies', editVacancyId), vacPayload);
        } catch {
          store.updateDocument('vacancies', editVacancyId, vacPayload);
        }
        toast.success('Vacancy Updated', `"${formData.title}" has been updated.`);
        setEditModalOpen(false);
      } else {
        const newId = 'vac-' + Date.now().toString(36);
        vacPayload.vacancyId = newId;
        vacPayload.id = newId;
        vacPayload.applicationCount = 0;
        vacPayload.selectedCount = 0;
        vacPayload.onboardedCount = 0;
        vacPayload.createdAt = new Date().toISOString();

        try {
          await setDoc(doc(db, 'vacancies', newId), vacPayload);
        } catch {
          store.setDocument('vacancies', newId, vacPayload);
        }
        toast.success('Vacancy Created', `New opening for "${formData.title}" is active.`);
        setCreateModalOpen(false);
      }

      loadVacancies();
    } catch (err: any) {
      console.error('Error saving vacancy:', err);
      toast.error('Save Failed', err.message || 'Unable to save vacancy.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteVacancy = async () => {
    if (!vacancyToDelete) return;
    setActionLoading(true);
    try {
      const vId = vacancyToDelete.vacancyId;
      try {
        await deleteDoc(doc(db, 'vacancies', vId));
      } catch {
        store.deleteDocument('vacancies', vId);
      }
      toast.success('Vacancy Removed', `"${vacancyToDelete.title}" has been deleted.`);
      setDeleteModalOpen(false);
      if (detailsModalOpen && selectedVacancy?.vacancyId === vId) {
        setDetailsModalOpen(false);
      }
      setVacancies(prev => prev.filter(v => v.vacancyId !== vId));
    } catch (err: any) {
      toast.error('Delete Failed', err.message || 'Unable to delete vacancy.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleQuickStatusToggle = async (vac: Vacancy, newStatus: VacancyStatus) => {
    try {
      try {
        await updateDoc(doc(db, 'vacancies', vac.vacancyId), { status: newStatus });
      } catch {
        store.updateDocument('vacancies', vac.vacancyId, { status: newStatus });
      }
      toast.info('Status Updated', `"${vac.title}" is now ${newStatus}.`);
      setVacancies(prev => prev.map(v => v.vacancyId === vac.vacancyId ? { ...v, status: newStatus } : v));
      if (selectedVacancy?.vacancyId === vac.vacancyId) {
        setSelectedVacancy({ ...selectedVacancy, status: newStatus });
      }
    } catch (err: any) {
      toast.error('Failed to change status', err.message);
    }
  };

  const handleCloseVacancy = async (vac: Vacancy) => {
    setActionLoading(true);
    try {
      const res: any = await closeVacancy(vac.vacancyId);
      setSelectedVacancy(vac);
      setCloseoutReport(res.closeoutReport);
      setCloseoutModalOpen(true);
      toast.success('Vacancy Closed', `Closeout report generated for "${vac.title}".`);
      loadVacancies();
    } catch (err: any) {
      toast.error('Failed to close vacancy', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const departments = ['ALL', ...Array.from(new Set(vacancies.map(v => v.department).filter(Boolean)))];

  const filteredVacancies = vacancies.filter(v => {
    const matchDept = selectedDept === 'ALL' || v.department === selectedDept;
    const matchQuery = !searchQuery.trim() ||
      v.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchDept && matchQuery;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Vacancies & Job Openings</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Create, manage, and edit company recruitment postings, screening rubrics, and status
          </p>
        </div>
        {isSupervisor && (
          <Button size="sm" onClick={handleOpenCreate} className="touch-target-44 sm:h-auto">
            <Plus className="w-4 h-4 mr-1.5" />
            Create Vacancy
          </Button>
        )}
      </div>

      {/* Filters Bar: Search & Department Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search openings, departments, skills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-thin">
          {departments.map((dept) => (
            <button
              key={dept}
              onClick={() => setSelectedDept(dept)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                selectedDept === dept
                  ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {dept}
            </button>
          ))}
        </div>
      </div>

      {/* Vacancies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredVacancies.length === 0 && !loading && (
          <div className="col-span-full bg-white dark:bg-slate-900 p-12 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-center text-slate-500 text-xs space-y-3">
            <Briefcase className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">No vacancies matched your filter.</p>
            <p className="text-[11px] text-slate-400">Try changing your search keyword or click "Create Vacancy" above.</p>
          </div>
        )}

        {filteredVacancies.map((vac) => {
          const reqCount = Array.isArray(vac.requirements) ? vac.requirements.length : 0;

          return (
            <div
              key={vac.vacancyId}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Status & Location Badge */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Badge
                      variant={
                        vac.status === 'OPEN'
                          ? 'success'
                          : vac.status === 'CLOSED'
                          ? 'neutral'
                          : 'warning'
                      }
                    >
                      {vac.status}
                    </Badge>

                    {isSupervisor && (
                      <select
                        aria-label="Change vacancy status"
                        value={vac.status}
                        onChange={(e) => handleQuickStatusToggle(vac, e.target.value as VacancyStatus)}
                        className="text-[10px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 text-slate-600 dark:text-slate-300 focus:outline-none"
                      >
                        <option value="OPEN">Set Open</option>
                        <option value="PAUSED">Set Paused</option>
                        <option value="CLOSED">Set Closed</option>
                      </select>
                    )}
                  </div>

                  <span className="text-[11px] text-slate-400 font-mono flex items-center">
                    <MapPin className="w-3 h-3 mr-1 text-slate-400" />
                    {vac.locationType || 'REMOTE'}
                  </span>
                </div>

                <h3
                  onClick={() => handleOpenDetails(vac)}
                  className="text-base font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors cursor-pointer"
                >
                  {vac.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {vac.department} • {vac.internshipDurationMonths || 4} Months
                </p>

                <p className="text-xs text-slate-600 dark:text-slate-300 mt-3 line-clamp-2 leading-relaxed">
                  {vac.description || 'Professional role with hands-on responsibilities and skill development.'}
                </p>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center">
                    <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" />
                    {vac.expectedHoursPerDay || 5}h/day ({vac.coreHours || '09:00 - 16:00 PKT'})
                  </span>
                  {reqCount > 0 && (
                    <span className="text-[11px] text-slate-400">
                      {reqCount} requirements
                    </span>
                  )}
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenDetails(vac)}
                  className="flex-1 text-xs"
                >
                  <Eye className="w-3.5 h-3.5 mr-1" />
                  View Details
                </Button>

                {isSupervisor && (
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleOpenEdit(vac)}
                      title="Edit Vacancy"
                      className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => {
                        setVacancyToDelete(vac);
                        setDeleteModalOpen(true);
                      }}
                      title="Delete Vacancy"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 1. VIEW JOB DETAILS MODAL */}
      {selectedVacancy && (
        <Modal
          isOpen={detailsModalOpen}
          onClose={() => setDetailsModalOpen(false)}
          title={`Job Details: ${selectedVacancy.title}`}
          maxWidth="2xl"
        >
          <div className="space-y-5 text-xs">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                  {selectedVacancy.department} • {selectedVacancy.employmentType || 'Internship'}
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                  {selectedVacancy.title}
                </h3>
              </div>
              <div className="flex items-center space-x-2">
                <Badge
                  variant={
                    selectedVacancy.status === 'OPEN'
                      ? 'success'
                      : selectedVacancy.status === 'CLOSED'
                      ? 'neutral'
                      : 'warning'
                  }
                >
                  {selectedVacancy.status}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Location</span>
                <p className="font-bold text-slate-800 dark:text-slate-100 mt-0.5">{selectedVacancy.locationType || 'REMOTE'}</p>
              </div>
              <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Duration</span>
                <p className="font-bold text-slate-800 dark:text-slate-100 mt-0.5">{selectedVacancy.internshipDurationMonths || 4} Months</p>
              </div>
              <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Daily Hours</span>
                <p className="font-bold text-slate-800 dark:text-slate-100 mt-0.5">{selectedVacancy.expectedHoursPerDay || 5} hrs/day</p>
              </div>
              <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Core Timing</span>
                <p className="font-bold text-slate-800 dark:text-slate-100 mt-0.5">{selectedVacancy.coreHours || '09:00 - 16:00'}</p>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider mb-1.5">
                Role Description
              </h4>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                {selectedVacancy.description || 'No detailed description provided for this vacancy.'}
              </p>
            </div>

            {selectedVacancy.requirements && (
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider mb-1.5">
                  Qualifications & Requirements
                </h4>
                <div className="space-y-1.5">
                  {(Array.isArray(selectedVacancy.requirements)
                    ? selectedVacancy.requirements
                    : [selectedVacancy.requirements]
                  ).map((req: string, idx: number) => (
                    <div key={idx} className="flex items-start space-x-2 text-slate-700 dark:text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{req}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedVacancy.screeningQuestions && selectedVacancy.screeningQuestions.length > 0 && (
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider mb-1.5">
                  Candidate Screening Questions
                </h4>
                <div className="space-y-1 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                  {selectedVacancy.screeningQuestions.map((q: any, idx: number) => (
                    <div key={idx} className="text-slate-600 dark:text-slate-400">
                      <strong className="text-slate-800 dark:text-slate-200">{idx + 1}.</strong> {typeof q === 'string' ? q : q.question}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    setDetailsModalOpen(false);
                    navigate(`/recruitment/applications?search=${encodeURIComponent(selectedVacancy.title)}`);
                  }}
                >
                  <Users className="w-3.5 h-3.5 mr-1" />
                  View Candidate Applications
                </Button>

                <a
                  href={`/careers#vac-${selectedVacancy.vacancyId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                  Public Careers Link
                </a>
              </div>

              {isSupervisor && (
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setDetailsModalOpen(false);
                      handleOpenEdit(selectedVacancy);
                    }}
                  >
                    <Edit3 className="w-3.5 h-3.5 mr-1" />
                    Edit
                  </Button>

                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      setVacancyToDelete(selectedVacancy);
                      setDeleteModalOpen(true);
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    Delete
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* 2. CREATE / EDIT VACANCY MODAL */}
      <Modal
        isOpen={createModalOpen || editModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          setEditModalOpen(false);
        }}
        title={editVacancyId ? 'Edit Vacancy' : 'Create New Vacancy'}
        maxWidth="xl"
      >
        <form onSubmit={handleSaveVacancy} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Job Title *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Graphic Design Intern"
                className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Department *</label>
              <input
                type="text"
                required
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="e.g. Engineering, Creative, Marketing"
                className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Duration (Months)</label>
              <input
                type="number"
                min="1"
                max="24"
                value={formData.internshipDurationMonths}
                onChange={(e) => setFormData({ ...formData, internshipDurationMonths: Number(e.target.value) })}
                className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Hours / Day</label>
              <input
                type="number"
                min="1"
                max="12"
                value={formData.expectedHoursPerDay}
                onChange={(e) => setFormData({ ...formData, expectedHoursPerDay: Number(e.target.value) })}
                className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Core Hours</label>
              <input
                type="text"
                value={formData.coreHours}
                onChange={(e) => setFormData({ ...formData, coreHours: e.target.value })}
                placeholder="09:00 - 16:00 PKT"
                className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Location Type</label>
              <select
                aria-label="Location Type"
                value={formData.locationType}
                onChange={(e) => setFormData({ ...formData, locationType: e.target.value as any })}
                className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="REMOTE">Remote</option>
                <option value="HYBRID">Hybrid (Lahore)</option>
                <option value="ON_SITE">On-Site (Lahore)</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Vacancy Status</label>
              <select
                aria-label="Vacancy Status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as VacancyStatus })}
                className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="OPEN">Open (Accepting Applications)</option>
                <option value="PAUSED">Paused (Hidden from Careers)</option>
                <option value="CLOSED">Closed (Recruitment Finished)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Role Description & Responsibilities</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Outline daily duties, mentorship opportunities, and team deliverables..."
              className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Requirements (One per line)</label>
            <textarea
              rows={3}
              value={formData.requirements}
              onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
              placeholder="Proficiency in React / TypeScript&#10;Basic knowledge of Git&#10;Portfolio or GitHub link"
              className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-[11px]"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Screening Questions (One per line)</label>
            <textarea
              rows={2}
              value={formData.screeningQuestions}
              onChange={(e) => setFormData({ ...formData, screeningQuestions: e.target.value })}
              className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-[11px]"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2">
            <Button
              size="sm"
              variant="outline"
              type="button"
              onClick={() => {
                setCreateModalOpen(false);
                setEditModalOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button size="sm" variant="primary" type="submit" loading={actionLoading}>
              {editVacancyId ? 'Save Changes' : 'Publish Vacancy'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 3. DELETE CONFIRMATION MODAL */}
      {vacancyToDelete && (
        <Modal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          title="Confirm Vacancy Deletion"
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs">
            <div className="flex items-center space-x-3 p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 rounded-xl border border-rose-200 dark:border-rose-900/50">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
              <div>
                <p className="font-semibold">Are you sure you want to delete this vacancy?</p>
                <p className="text-[11px] text-rose-600/90 dark:text-rose-400 mt-0.5">
                  "{vacancyToDelete.title}" will be permanently removed.
                </p>
              </div>
            </div>

            <p className="text-slate-500 dark:text-slate-400">
              Candidate applications associated with this role will remain archived in your historical talent pool.
            </p>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button size="sm" variant="outline" onClick={() => setDeleteModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" variant="danger" onClick={handleDeleteVacancy} loading={actionLoading}>
                Delete Vacancy
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 4. CLOSEOUT REPORT MODAL */}
      {closeoutReport && selectedVacancy && (
        <Modal
          isOpen={closeoutModalOpen}
          onClose={() => setCloseoutModalOpen(false)}
          title={`Vacancy Closeout Report: ${selectedVacancy.title}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              <h4 className="font-semibold text-slate-800 dark:text-white">Summary Metrics</h4>
              <div className="grid grid-cols-4 gap-2 mt-2 text-center">
                <div>Total Apps: <strong>{closeoutReport.totalApplications}</strong></div>
                <div>Interviewed: <strong>{closeoutReport.interviewed}</strong></div>
                <div>Offers: <strong>{closeoutReport.offered}</strong></div>
                <div>Hired: <strong>{closeoutReport.joined}</strong></div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-slate-700 dark:text-slate-300">Target Achievement</h4>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Target Slots: {closeoutReport.targetSlots} • Filled Slots: {closeoutReport.filledSlots} ({closeoutReport.targetAchievementPct}%)
              </p>
            </div>

            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300">
              <span>Status: <strong>Vacancy Successfully Closed & Archived</strong></span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default VacanciesList;