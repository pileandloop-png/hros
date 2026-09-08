import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { closeVacancy } from '../../services/api';
import { Vacancy, VacancyStatus } from '../../types/recruitment';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { Plus, Briefcase, Users, Calendar, MapPin, CheckCircle, XCircle, FileBarChart, Clock } from 'lucide-react';

export const VacanciesList: React.FC = () => {
  const { isSupervisor } = useAuth();
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [closeoutModalOpen, setCloseoutModalOpen] = useState(false);
  const [selectedVacancy, setSelectedVacancy] = useState<Vacancy | null>(null);
  const [closeoutReport, setCloseoutReport] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // New Vacancy Form
  const [formData, setFormData] = useState({
    title: '',
    department: 'Design & Creative',
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
  });

  const loadVacancies = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'vacancies'));
      const list = snap.docs.map(d => ({ vacancyId: d.id, ...d.data() } as Vacancy));
      setVacancies(list);
    } catch (err) {
      console.error('Error loading vacancies:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVacancies();
  }, []);

  const handleCreateVacancy = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const vacRef = doc(collection(db, 'vacancies'));
      const screeningArr = formData.screeningQuestions.split('\n').filter(q => q.trim()).map((q, idx) => ({
        id: `sq_${idx + 1}`,
        question: q.replace(/^\d+\.\s*/, '').trim(),
        required: true,
      }));
      const interviewArr = formData.interviewQuestions.split('\n').filter(q => q.trim()).map((q, idx) => ({
        id: `iq_${idx + 1}`,
        question: q.replace(/^\d+\.\s*/, '').trim(),
      }));

      const newVac: Partial<Vacancy> = {
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
        status: 'OPEN',
        createdBy: 'HR Staff',
        applicationCount: 0,
        selectedCount: 0,
        onboardedCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(vacRef, newVac);
      setCreateModalOpen(false);
      loadVacancies();
    } catch (err: any) {
      alert(err.message || 'Failed to create vacancy');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCloseVacancy = async (vac: Vacancy) => {
    if (!window.confirm(`Close vacancy "${vac.title}" and generate comprehensive closeout report?`)) return;
    setActionLoading(true);
    try {
      const res: any = await closeVacancy(vac.vacancyId);
      setSelectedVacancy(vac);
      setCloseoutReport(res.closeoutReport);
      setCloseoutModalOpen(true);
      loadVacancies();
    } catch (err: any) {
      alert(err.message || 'Failed to close vacancy');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Vacancies & Roles</h2>
          <p className="text-xs text-slate-500 mt-0.5">Manage recruitment openings and closeout reports</p>
        </div>
        {isSupervisor && (
          <Button size="sm" onClick={() => setCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Create Vacancy
          </Button>
        )}
      </div>

      {/* Vacancies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {vacancies.length === 0 && !loading && (
          <div className="col-span-full bg-white p-8 rounded-xl border border-dashed text-center text-slate-500 text-xs">
            No vacancies found. Click "Create Vacancy" to add an opening.
          </div>
        )}

        {vacancies.map((vac) => (
          <div key={vac.vacancyId} className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between mb-3">
                <Badge variant={vac.status === 'OPEN' ? 'success' : vac.status === 'CLOSED' ? 'neutral' : 'warning'}>
                  {vac.status}
                </Badge>
                <span className="text-[11px] text-slate-400 font-mono flex items-center">
                  <MapPin className="w-3 h-3 mr-1" />
                  {vac.locationType}
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-900">{vac.title}</h3>
              <p className="text-xs text-slate-500 mt-1">{vac.department} • {vac.internshipDurationMonths} Months</p>

              <p className="text-xs text-slate-600 mt-3 line-clamp-2">
                {vac.description || 'Remote internship opportunity with hands-on learning and skill development.'}
              </p>

              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center">
                  <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" />
                  {vac.expectedHoursPerDay} hrs/day ({vac.coreHours})
                </span>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
              {vac.status === 'OPEN' && isSupervisor ? (
                <Button size="sm" variant="outline" onClick={() => handleCloseVacancy(vac)} loading={actionLoading}>
                  <FileBarChart className="w-3.5 h-3.5 mr-1 text-slate-600" />
                  Close Vacancy
                </Button>
              ) : vac.closeoutReport ? (
                <Button size="sm" variant="secondary" onClick={() => {
                  setSelectedVacancy(vac);
                  setCloseoutReport(vac.closeoutReport);
                  setCloseoutModalOpen(true);
                }}>
                  <FileBarChart className="w-3.5 h-3.5 mr-1 text-sky-600" />
                  View Closeout
                </Button>
              ) : (
                <span className="text-xs text-slate-400 font-medium">{vac.status}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create Vacancy Modal */}
      <Modal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Create New Vacancy" maxWidth="xl">
        <form onSubmit={handleCreateVacancy} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Job Title *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Graphic Design Intern"
                className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Department</label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="e.g. Creative / Design"
                className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Duration (Months)</label>
              <input
                type="number"
                value={formData.internshipDurationMonths}
                onChange={(e) => setFormData({ ...formData, internshipDurationMonths: Number(e.target.value) })}
                className="w-full text-xs p-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Expected Hours/Day</label>
              <input
                type="number"
                value={formData.expectedHoursPerDay}
                onChange={(e) => setFormData({ ...formData, expectedHoursPerDay: Number(e.target.value) })}
                className="w-full text-xs p-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Core Hours</label>
              <input
                type="text"
                value={formData.coreHours}
                onChange={(e) => setFormData({ ...formData, coreHours: e.target.value })}
                placeholder="09:00 - 16:00 PKT"
                className="w-full text-xs p-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Role Description</label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Responsibilities, learning objectives, and scope..."
              className="w-full text-xs p-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Screening Questions (One per line)</label>
            <textarea
              rows={3}
              value={formData.screeningQuestions}
              onChange={(e) => setFormData({ ...formData, screeningQuestions: e.target.value })}
              className="w-full text-xs p-2 border border-slate-300 rounded-lg font-mono"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3">
            <Button variant="outline" size="sm" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" loading={actionLoading}>
              Publish Vacancy
            </Button>
          </div>
        </form>
      </Modal>

      {/* Vacancy Closeout Report Modal (Section 6) */}
      <Modal isOpen={closeoutModalOpen} onClose={() => setCloseoutModalOpen(false)} title={`Vacancy Closeout Report: ${selectedVacancy?.title}`} maxWidth="2xl">
        {closeoutReport && (
          <div className="space-y-5 text-xs text-slate-700">
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[10px]">Total Applications</span>
                <strong className="text-base text-slate-900">{closeoutReport.totalApplications}</strong>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[10px]">Contacted</span>
                <strong className="text-base text-sky-600">{closeoutReport.contacted}</strong>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[10px]">Selected</span>
                <strong className="text-base text-purple-600">{closeoutReport.selected}</strong>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[10px]">Onboarded</span>
                <strong className="text-base text-emerald-600">{closeoutReport.onboarded}</strong>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50">
              <h4 className="font-semibold text-slate-900 mb-2">Recruitment Funnel Breakdown</h4>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <p>• Initial Emails Sent: <strong>{closeoutReport.contacted}</strong></p>
                <p>• Candidate Responses: <strong>{closeoutReport.responses}</strong></p>
                <p>• No Responses: <strong>{closeoutReport.noResponses}</strong></p>
                <p>• Interviews Completed: <strong>{closeoutReport.interviewsCompleted}</strong></p>
                <p>• Interview No-Shows: <strong>{closeoutReport.noShows}</strong></p>
                <p>• Rejected / Not Hired: <strong>{closeoutReport.rejected}</strong></p>
              </div>
            </div>

            {closeoutReport.candidateOutcomes && (
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">Candidate Final Outcomes</h4>
                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-[10px] text-slate-600">
                      <tr>
                        <th className="p-2">Position</th>
                        <th className="p-2">Source</th>
                        <th className="p-2">Final Outcome</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {closeoutReport.candidateOutcomes.map((co: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2 font-medium">{co.position}</td>
                          <td className="p-2 text-slate-500">{co.source}</td>
                          <td className="p-2">
                            <Badge variant={co.finalStage.includes('ONBOARD') ? 'success' : co.finalStage.includes('NOT') ? 'danger' : 'default'}>
                              {co.finalStage}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-3">
              <Button size="sm" onClick={() => setCloseoutModalOpen(false)}>
                Close Report
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};