import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, addDoc, updateDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { WeeklyReport } from '../../types/workflow';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { Plus, Award, CheckCircle, MessageSquare } from 'lucide-react';

export const WeeklyReportsPage: React.FC = () => {
  const { user, profile, isSupervisor, isTeamMemberOnly } = useAuth();
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<WeeklyReport | null>(null);
  const [supervisorFeedback, setSupervisorFeedback] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // New Report Form
  const [newReport, setNewReport] = useState({
    weekBeginning: '',
    weekEnding: '',
    tasksCompleted: '',
    deliverableLinks: '',
    challengesEncountered: '',
    howChallengesHandled: '',
    prioritiesNextWeek: '',
  });

  const loadReports = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'weeklyReports'), orderBy('submittedAt', 'desc'));
      const snap = await getDocs(q);
      let list = snap.docs.map(d => ({ reportId: d.id, ...d.data() } as WeeklyReport));
      if (isTeamMemberOnly && user) {
        list = list.filter(r => r.userId === user.uid);
      }
      setReports(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [user, isTeamMemberOnly]);

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setActionLoading(true);
    try {
      await addDoc(collection(db, 'weeklyReports'), {
        ...newReport,
        userId: user.uid,
        userName: profile?.displayName || user.email,
        status: 'SUBMITTED',
        submittedAt: serverTimestamp(),
      });
      setModalOpen(false);
      setNewReport({ weekBeginning: '', weekEnding: '', tasksCompleted: '', deliverableLinks: '', challengesEncountered: '', howChallengesHandled: '', prioritiesNextWeek: '' });
      loadReports();
    } catch (err: any) {
      alert(err.message || 'Failed to submit report');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport) return;
    setActionLoading(true);
    try {
      await updateDoc(doc(db, 'weeklyReports', selectedReport.reportId), {
        status: 'REVIEWED',
        supervisorFeedback,
        reviewedAt: serverTimestamp(),
      });
      setFeedbackModalOpen(false);
      setSupervisorFeedback('');
      loadReports();
    } catch (err: any) {
      alert(err.message || 'Failed to save feedback');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Weekly Internship Reports</h2>
          <p className="text-xs text-slate-500 mt-0.5">Weekly deliverables, challenges resolved, and supervisor evaluations</p>
        </div>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <Plus className="w-3.5 h-3.5 mr-1" />
          Submit Weekly Report
        </Button>
      </div>

      <div className="space-y-4">
        {reports.length === 0 ? (
          <div className="p-8 bg-white rounded-xl border border-dashed text-center text-xs text-slate-400">
            {loading ? 'Loading weekly reports...' : 'No weekly reports submitted yet.'}
          </div>
        ) : (
          reports.map((rep) => (
            <div key={rep.reportId} className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{rep.userName}</h4>
                  <span className="text-slate-500 font-mono text-[11px]">
                    Week: {rep.weekBeginning} to {rep.weekEnding}
                  </span>
                </div>
                <Badge variant={rep.status === 'REVIEWED' ? 'success' : 'warning'}>{rep.status}</Badge>
              </div>

              <div className="space-y-2">
                <div>
                  <span className="font-semibold text-slate-700">Tasks Completed & Deliverables:</span>
                  <p className="mt-0.5 text-slate-600 whitespace-pre-line">{rep.tasksCompleted}</p>
                </div>

                {rep.challengesEncountered && (
                  <div>
                    <span className="font-semibold text-slate-700">Challenges & Resolution:</span>
                    <p className="mt-0.5 text-slate-600">{rep.challengesEncountered}</p>
                  </div>
                )}

                {rep.prioritiesNextWeek && (
                  <div>
                    <span className="font-semibold text-slate-700">Priorities for Next Week:</span>
                    <p className="mt-0.5 text-slate-600">{rep.prioritiesNextWeek}</p>
                  </div>
                )}

                {rep.supervisorFeedback && (
                  <div className="p-3 bg-sky-50 rounded-lg border border-sky-100 text-sky-900">
                    <span className="font-semibold flex items-center">
                      <MessageSquare className="w-3 h-3 mr-1" />
                      Supervisor Evaluation & Feedback:
                    </span>
                    <p className="mt-1 text-[11px]">{rep.supervisorFeedback}</p>
                  </div>
                )}
              </div>

              {isSupervisor && rep.status !== 'REVIEWED' && (
                <div className="pt-2 flex justify-end">
                  <Button size="sm" variant="outline" onClick={() => {
                    setSelectedReport(rep);
                    setFeedbackModalOpen(true);
                  }}>
                    Add Supervisor Feedback
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Submit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Submit Weekly Internship Report" maxWidth="lg">
        <form onSubmit={handleSubmitReport} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Week Beginning *</label>
              <input type="date" required value={newReport.weekBeginning} onChange={(e) => setNewReport({ ...newReport, weekBeginning: e.target.value })} className="w-full p-2 border rounded" />
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">Week Ending *</label>
              <input type="date" required value={newReport.weekEnding} onChange={(e) => setNewReport({ ...newReport, weekEnding: e.target.value })} className="w-full p-2 border rounded" />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1">Tasks Completed This Week *</label>
            <textarea rows={3} required value={newReport.tasksCompleted} onChange={(e) => setNewReport({ ...newReport, tasksCompleted: e.target.value })} placeholder="Detailed list of completed work..." className="w-full p-2 border rounded" />
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1">Deliverable Links (Drive, Figma, GitHub)</label>
            <input type="text" value={newReport.deliverableLinks} onChange={(e) => setNewReport({ ...newReport, deliverableLinks: e.target.value })} placeholder="https://..." className="w-full p-2 border rounded font-mono" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Challenges Encountered</label>
              <textarea rows={2} value={newReport.challengesEncountered} onChange={(e) => setNewReport({ ...newReport, challengesEncountered: e.target.value })} placeholder="Technical or process challenges..." className="w-full p-2 border rounded" />
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">Plans & Priorities Next Week</label>
              <textarea rows={2} value={newReport.prioritiesNextWeek} onChange={(e) => setNewReport({ ...newReport, prioritiesNextWeek: e.target.value })} placeholder="Deliverables planned..." className="w-full p-2 border rounded" />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <Button size="sm" variant="outline" type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button size="sm" type="submit" loading={actionLoading}>Submit Report</Button>
          </div>
        </form>
      </Modal>

      {/* Feedback Modal */}
      {selectedReport && (
        <Modal isOpen={feedbackModalOpen} onClose={() => setFeedbackModalOpen(false)} title={`Supervisor Feedback: ${selectedReport.userName}`} maxWidth="md">
          <form onSubmit={handleSaveFeedback} className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Evaluation & Feedback Comments *</label>
              <textarea
                rows={4}
                required
                value={supervisorFeedback}
                onChange={(e) => setSupervisorFeedback(e.target.value)}
                placeholder="Acknowledge quality of deliverables, feedback on speed, areas to improve..."
                className="w-full p-2.5 border rounded focus:ring-1 focus:ring-sky-500"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <Button size="sm" variant="outline" type="button" onClick={() => setFeedbackModalOpen(false)}>Cancel</Button>
              <Button size="sm" type="submit" loading={actionLoading}>Publish Feedback</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
