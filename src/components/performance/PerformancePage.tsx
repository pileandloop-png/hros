import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { PerformanceReview } from '../../types/workflow';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { Award, Plus, Star, Lock } from 'lucide-react';

export const PerformancePage: React.FC = () => {
  const { user, profile, isSupervisor, isTeamMemberOnly } = useAuth();
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [people, setPeople] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    personId: '',
    personName: '',
    periodStart: '',
    periodEnd: '',
    taskQuality: 4,
    timeliness: 4,
    communication: 4,
    attendance: 4,
    initiative: 4,
    professionalism: 5,
    strengths: '',
    improvementAreas: '',
    actionPlan: '',
    overallRating: 4,
    privateNotes: '',
    isSharedWithEmployee: true,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const pSnap = await getDocs(collection(db, 'people'));
      setPeople(pSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const rSnap = await getDocs(query(collection(db, 'performanceReviews'), orderBy('createdAt', 'desc')));
      let list = rSnap.docs.map(d => ({ reviewId: d.id, ...d.data() } as PerformanceReview));
      if (isTeamMemberOnly && user) {
        list = list.filter(r => r.personId === user.uid && r.isSharedWithEmployee);
      }
      setReviews(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user, isTeamMemberOnly]);

  const handleCreateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await addDoc(collection(db, 'performanceReviews'), {
        ...formData,
        reviewerId: user.uid,
        reviewerName: profile?.displayName || user.email,
        createdAt: serverTimestamp(),
      });
      setModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to submit review');
    }
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Performance Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">Objective internship evaluations, strengths, and development action plans</p>
        </div>
        {isSupervisor && (
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" />
            Conduct Performance Review
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reviews.length === 0 ? (
          <div className="col-span-full p-8 bg-white rounded-xl border border-dashed text-center text-xs text-slate-400">
            {loading ? 'Loading performance evaluations...' : 'No performance reviews recorded yet.'}
          </div>
        ) : (
          reviews.map((rev) => (
            <div key={rev.reviewId} className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3 text-xs">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{rev.personName}</h4>
                  <span className="text-slate-500 font-mono text-[11px]">
                    Period: {rev.periodStart} to {rev.periodEnd}
                  </span>
                </div>
                <div className="flex items-center space-x-1 px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-bold">
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  <span>{rev.overallRating} / 5</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[11px] p-2.5 bg-slate-50 rounded-lg">
                <div>Quality: <strong>{rev.taskQuality}/5</strong></div>
                <div>Timeliness: <strong>{rev.timeliness}/5</strong></div>
                <div>Communication: <strong>{rev.communication}/5</strong></div>
                <div>Attendance: <strong>{rev.attendance}/5</strong></div>
                <div>Initiative: <strong>{rev.initiative}/5</strong></div>
                <div>Professionalism: <strong>{rev.professionalism}/5</strong></div>
              </div>

              <div className="space-y-1.5">
                <div>
                  <span className="font-semibold text-slate-700">Demonstrated Strengths:</span>
                  <p className="text-slate-600 mt-0.5">{rev.strengths}</p>
                </div>
                {rev.improvementAreas && (
                  <div>
                    <span className="font-semibold text-slate-700">Improvement Areas:</span>
                    <p className="text-slate-600 mt-0.5">{rev.improvementAreas}</p>
                  </div>
                )}
                {rev.actionPlan && (
                  <div>
                    <span className="font-semibold text-slate-700">Action Plan:</span>
                    <p className="text-slate-600 mt-0.5">{rev.actionPlan}</p>
                  </div>
                )}
              </div>

              {isSupervisor && rev.privateNotes && (
                <div className="p-2.5 bg-rose-50 rounded border border-rose-100 text-rose-900 text-[11px]">
                  <span className="font-semibold flex items-center">
                    <Lock className="w-3 h-3 mr-1" />
                    Private Supervisor Notes (Not shared with employee):
                  </span>
                  <p className="mt-0.5">{rev.privateNotes}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Create Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Conduct Performance Evaluation" maxWidth="lg">
        <form onSubmit={handleCreateReview} className="space-y-3 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">Select Team Member *</label>
            <select
              required
              value={formData.personId}
              onChange={(e) => {
                const selected = people.find(p => p.id === e.target.value);
                setFormData({ ...formData, personId: e.target.value, personName: selected?.fullName || '' });
              }}
              className="w-full p-2 border rounded bg-white"
            >
              <option value="">-- Choose member --</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>{p.fullName} ({p.jobTitle})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Evaluation Period Start</label>
              <input type="date" required value={formData.periodStart} onChange={(e) => setFormData({ ...formData, periodStart: e.target.value })} className="w-full p-2 border rounded" />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Evaluation Period End</label>
              <input type="date" required value={formData.periodEnd} onChange={(e) => setFormData({ ...formData, periodEnd: e.target.value })} className="w-full p-2 border rounded" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {['taskQuality', 'timeliness', 'communication', 'attendance', 'initiative', 'professionalism'].map((key) => (
              <div key={key}>
                <label className="block font-medium text-slate-700 capitalize mb-1">{key.replace(/([A-Z])/g, ' $1')} (1-5)</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  required
                  value={(formData as any)[key]}
                  onChange={(e) => setFormData({ ...formData, [key]: Number(e.target.value) })}
                  className="w-full p-1.5 border rounded"
                />
              </div>
            ))}
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Overall Rating (1-5)</label>
            <input type="number" min="1" max="5" required value={formData.overallRating} onChange={(e) => setFormData({ ...formData, overallRating: Number(e.target.value) })} className="w-full p-2 border rounded" />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Key Strengths *</label>
            <textarea rows={2} required value={formData.strengths} onChange={(e) => setFormData({ ...formData, strengths: e.target.value })} placeholder="Observed high-impact contributions..." className="w-full p-2 border rounded" />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Areas for Development</label>
            <textarea rows={2} value={formData.improvementAreas} onChange={(e) => setFormData({ ...formData, improvementAreas: e.target.value })} placeholder="Skill gaps or guidance..." className="w-full p-2 border rounded" />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Private Supervisor Notes (Restricted)</label>
            <input type="text" value={formData.privateNotes} onChange={(e) => setFormData({ ...formData, privateNotes: e.target.value })} placeholder="Internal notes not visible to candidate..." className="w-full p-2 border rounded" />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <Button size="sm" variant="outline" type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button size="sm" type="submit">Submit Evaluation</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
