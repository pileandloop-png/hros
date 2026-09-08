import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, addDoc, updateDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { LeaveRequest, LeaveStatus } from '../../types/workflow';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { Calendar, Plus, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

export const LeavePage: React.FC = () => {
  const { user, profile, isSupervisor, isTeamMemberOnly } = useAuth();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // New Request Form
  const [formData, setFormData] = useState({
    leaveType: 'CASUAL' as const,
    startDate: '',
    endDate: '',
    requestedDays: 1,
    reason: '',
  });

  const loadRequests = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'leaveRequests'), orderBy('submittedAt', 'desc'));
      const snap = await getDocs(q);
      let list = snap.docs.map(d => ({ requestId: d.id, ...d.data() } as LeaveRequest));
      if (isTeamMemberOnly && user) {
        list = list.filter(r => r.userId === user.uid);
      }
      setRequests(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [user, isTeamMemberOnly]);

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setActionLoading(true);
    try {
      await addDoc(collection(db, 'leaveRequests'), {
        userId: user.uid,
        userName: profile?.displayName || user.email,
        leaveType: formData.leaveType,
        startDate: formData.startDate,
        endDate: formData.endDate,
        requestedDays: Number(formData.requestedDays),
        reason: formData.reason,
        status: 'PENDING',
        submittedAt: serverTimestamp(),
      });
      setModalOpen(false);
      setFormData({ leaveType: 'CASUAL', startDate: '', endDate: '', requestedDays: 1, reason: '' });
      loadRequests();
    } catch (err: any) {
      alert(err.message || 'Failed to submit leave request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReviewDecision = async (decision: 'APPROVED' | 'REJECTED') => {
    if (!selectedRequest) return;
    setActionLoading(true);
    try {
      await updateDoc(doc(db, 'leaveRequests', selectedRequest.requestId), {
        status: decision,
        reviewedBy: user?.uid,
        reviewedAt: serverTimestamp(),
        reviewNotes,
      });
      setReviewModalOpen(false);
      setReviewNotes('');
      loadRequests();
    } catch (err: any) {
      alert(err.message || 'Failed to record decision');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Leave Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">Submit and review leave requests (Allowance: 3 approved days/month)</p>
        </div>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <Plus className="w-3.5 h-3.5 mr-1" />
          Request Leave
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3">Team Member</th>
                <th className="p-3">Type</th>
                <th className="p-3">Dates</th>
                <th className="p-3">Days</th>
                <th className="p-3">Reason</th>
                <th className="p-3">Status</th>
                {isSupervisor && <th className="p-3 text-right">Decision</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    {loading ? 'Loading leave requests...' : 'No leave requests submitted.'}
                  </td>
                </tr>
              ) : (
                requests.map((r) => (
                  <tr key={r.requestId} className="hover:bg-slate-50/80">
                    <td className="p-3 font-semibold text-slate-900">{r.userName}</td>
                    <td className="p-3"><Badge variant="info">{r.leaveType}</Badge></td>
                    <td className="p-3 font-mono text-slate-700">{r.startDate} to {r.endDate}</td>
                    <td className="p-3 font-bold text-slate-800">{r.requestedDays}d</td>
                    <td className="p-3 text-slate-600 max-w-xs truncate">{r.reason}</td>
                    <td className="p-3">
                      <Badge variant={r.status === 'APPROVED' ? 'success' : r.status === 'REJECTED' ? 'danger' : 'warning'}>
                        {r.status}
                      </Badge>
                    </td>
                    {isSupervisor && (
                      <td className="p-3 text-right">
                        {r.status === 'PENDING' ? (
                          <Button size="sm" variant="outline" onClick={() => {
                            setSelectedRequest(r);
                            setReviewModalOpen(true);
                          }}>
                            Review Request
                          </Button>
                        ) : (
                          <span className="text-[11px] text-slate-400">Reviewed</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Submit Leave Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Submit Leave Request" maxWidth="md">
        <form onSubmit={handleSubmitRequest} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-700 font-medium mb-1">Leave Type</label>
            <select
              value={formData.leaveType}
              onChange={(e) => setFormData({ ...formData, leaveType: e.target.value as any })}
              className="w-full p-2 border rounded bg-white"
            >
              <option value="CASUAL">Casual Leave</option>
              <option value="SICK">Sick / Medical Leave</option>
              <option value="EXAM">University / Exam Leave</option>
              <option value="EMERGENCY">Emergency Leave</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Start Date</label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">End Date</label>
              <input
                type="date"
                required
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full p-2 border rounded"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1">Total Days Requested</label>
            <input
              type="number"
              min="1"
              max="15"
              required
              value={formData.requestedDays}
              onChange={(e) => setFormData({ ...formData, requestedDays: Number(e.target.value) })}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1">Reason for Leave *</label>
            <textarea
              rows={3}
              required
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Explain the reason for absence..."
              className="w-full p-2 border rounded"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <Button size="sm" variant="outline" type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button size="sm" type="submit" loading={actionLoading}>Submit Leave Request</Button>
          </div>
        </form>
      </Modal>

      {/* Review Modal */}
      {selectedRequest && (
        <Modal isOpen={reviewModalOpen} onClose={() => setReviewModalOpen(false)} title="Supervisor Leave Review" maxWidth="md">
          <div className="space-y-3 text-xs">
            <p><strong>Team Member:</strong> {selectedRequest.userName}</p>
            <p><strong>Duration:</strong> {selectedRequest.startDate} to {selectedRequest.endDate} ({selectedRequest.requestedDays} days)</p>
            <p className="p-2.5 bg-slate-50 border rounded text-slate-700">"{selectedRequest.reason}"</p>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Supervisor Notes / Response</label>
              <input
                type="text"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Optional approval or feedback notes..."
                className="w-full p-2 border rounded"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <Button size="sm" variant="danger" onClick={() => handleReviewDecision('REJECTED')} loading={actionLoading}>
                Reject Leave
              </Button>
              <Button size="sm" variant="success" onClick={() => handleReviewDecision('APPROVED')} loading={actionLoading}>
                Approve Leave
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
