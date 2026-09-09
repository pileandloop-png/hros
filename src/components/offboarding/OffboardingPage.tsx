import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { createOffboardingCase, completeOffboarding } from '../../services/api';
import { OffboardingCase } from '../../types/workflow';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { CertificateModal } from '../common/CertificateModal';
import { UserX, Clock, CheckCircle2, AlertTriangle, ShieldCheck, Award, FileText } from 'lucide-react';

export const OffboardingPage: React.FC = () => {
  const { isSupervisor } = useAuth();
  const [offboardingCases, setOffboardingCases] = useState<any[]>([]);
  const [endingInterns, setEndingInterns] = useState<any[]>([]);
  const [people, setPeople] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState<any | null>(null);
  const [finalizeModalOpen, setFinalizeModalOpen] = useState(false);

  // Certificate Modal
  const [certModalOpen, setCertModalOpen] = useState(false);
  const [selectedCertIntern, setSelectedCertIntern] = useState({
    name: 'Saad Qureshi',
    role: 'Software Engineering Intern',
    department: 'Engineering'
  });
  const [certificateDecision, setCertificateDecision] = useState('ISSUED');
  const [letterDecision, setLetterDecision] = useState('ISSUED');
  const [finalNotes, setFinalNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // New Case form
  const [newCase, setNewCase] = useState({
    personId: '',
    reason: 'Internship 4-month program completed',
    offboardingType: 'INTERNSHIP_COMPLETED',
    lastWorkingDate: new Date().toISOString().split('T')[0],
  });

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch people to calculate ending soon
      const pSnap = await getDocs(collection(db, 'people'));
      const pList = pSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPeople(pList);

      const now = new Date();
      const endingSoon = pList.filter((p: any) => {
        if (p.status !== 'ACTIVE' || p.workerType !== 'INTERN' || !p.expectedEndDate) return false;
        const end = p.expectedEndDate.toDate ? p.expectedEndDate.toDate() : new Date(p.expectedEndDate);
        const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays <= 30 && diffDays >= -7;
      });
      setEndingInterns(endingSoon);

      // 2. Fetch Offboarding cases
      const offSnap = await getDocs(collection(db, 'offboardingCases'));
      const offList = [];
      for (const d of offSnap.docs) {
        const offData = d.data();
        const person: any = pList.find(p => p.id === offData.personId);
        offList.push({ id: d.id, personName: person?.fullName || 'Team Member', ...offData });
      }
      setOffboardingCases(offList);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await createOffboardingCase(newCase);
      setNewModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to start offboarding');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleChecklist = async (caseId: string, listName: 'accessRevocationChecklist' | 'documentReturnChecklist', key: string, currentVal: boolean) => {
    const targetCase = offboardingCases.find(c => c.id === caseId);
    if (!targetCase) return;
    const list = (targetCase[listName] || []).map((item: any) =>
      item.key === key ? { ...item, completed: !currentVal } : item
    );
    await updateDoc(doc(db, 'offboardingCases', caseId), {
      [listName]: list,
      updatedAt: serverTimestamp(),
    });
    setOffboardingCases(prev => prev.map(c => c.id === caseId ? { ...c, [listName]: list } : c));
  };

  const handleFinalize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase) return;
    setActionLoading(true);
    try {
      await completeOffboarding({
        offboardingId: selectedCase.id,
        certificateStatus: certificateDecision,
        recommendationLetterStatus: letterDecision,
        finalNotes,
      });
      setFinalizeModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to complete offboarding');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Internship Offboarding & Completion</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage upcoming completion dates, access revocation, and certificate issuance approvals
          </p>
        </div>
        {isSupervisor && (
          <Button size="sm" onClick={() => setNewModalOpen(true)}>
            <UserX className="w-3.5 h-3.5 mr-1" />
            Start Offboarding Case
          </Button>
        )}
      </div>

      {/* 1. UPCOMING END DATES ALERT BUCKET (Section 32) */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
          <Clock className="w-4 h-4 text-amber-600" />
          <span>Internships Ending Soon (Next 30 Days)</span>
        </h3>

        {endingInterns.length === 0 ? (
          <p className="text-xs text-slate-400 py-3">No active internships scheduled to end in the next 30 days.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {endingInterns.map((intern) => {
              const end = intern.expectedEndDate?.toDate ? intern.expectedEndDate.toDate() : new Date(intern.expectedEndDate);
              const daysLeft = Math.ceil((end.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
              return (
                <div key={intern.id} className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs space-y-1">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-slate-900">{intern.fullName}</h4>
                    <span className="font-bold text-amber-800 font-mono text-[11px]">{daysLeft} days left</span>
                  </div>
                  <p className="text-[11px] text-slate-600">{intern.jobTitle} ? {intern.department}</p>
                  <p className="text-[10px] text-slate-500 font-mono">End Date: {end.toLocaleDateString()}</p>
                  <div className="pt-2">
                    <Button size="sm" variant="outline" onClick={() => {
                      setNewCase({ personId: intern.id, reason: '4-month internship cycle completion', offboardingType: 'INTERNSHIP_COMPLETED', lastWorkingDate: end.toISOString().split('T')[0] });
                      setNewModalOpen(true);
                    }}>
                      Initiate Offboarding
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. ACTIVE OFFBOARDING CASES (Section 33 & 34) */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-900">Active & Finalized Offboarding Cases</h3>

        {offboardingCases.length === 0 ? (
          <div className="p-8 bg-white rounded-xl border border-dashed text-center text-xs text-slate-400">
            {loading ? 'Loading cases...' : 'No active offboarding cases.'}
          </div>
        ) : (
          offboardingCases.map((c) => (
            <div key={c.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4 text-xs">
              <div className="flex justify-between items-start pb-3 border-b border-slate-100">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{c.personName}</h4>
                  <span className="text-slate-500 text-[11px]">Type: {c.offboardingType} ? Reason: {c.reason}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={c.status === 'COMPLETED' ? 'success' : 'warning'}>{c.status}</Badge>
                  {isSupervisor && c.status !== 'COMPLETED' && (
                    <Button size="sm" variant="primary" onClick={() => {
                      setSelectedCase(c);
                      setFinalizeModalOpen(true);
                    }}>
                      Finalize Offboarding
                    </Button>
                  )}
                  {c.status === 'COMPLETED' && (
                    <Button size="sm" variant="outline" onClick={() => {
                      setSelectedCertIntern({
                        name: c.personName,
                        role: 'Software Engineering Intern',
                        department: 'Engineering'
                      });
                      setCertModalOpen(true);
                    }}>
                      <Award className="w-3.5 h-3.5 mr-1 text-amber-600" />
                      View Certificate
                    </Button>
                  )}
                </div>
              </div>

              {/* Checklists */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h5 className="font-semibold text-slate-800 mb-2">Access Revocation Checklist</h5>
                  <div className="space-y-1.5">
                    {(c.accessRevocationChecklist || []).map((item: any) => (
                      <label key={item.key} className="flex items-center space-x-2 text-[11px] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={item.completed}
                          onChange={() => handleToggleChecklist(c.id, 'accessRevocationChecklist', item.key, item.completed)}
                          className="rounded text-sky-600 focus:ring-sky-500"
                        />
                        <span className={item.completed ? 'line-through text-slate-400' : 'text-slate-700'}>{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <h5 className="font-semibold text-slate-800 mb-2">Deliverables & Reviews Finalization</h5>
                  <div className="space-y-1.5">
                    {(c.documentReturnChecklist || []).map((item: any) => (
                      <label key={item.key} className="flex items-center space-x-2 text-[11px] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={item.completed}
                          onChange={() => handleToggleChecklist(c.id, 'documentReturnChecklist', item.key, item.completed)}
                          className="rounded text-sky-600 focus:ring-sky-500"
                        />
                        <span className={item.completed ? 'line-through text-slate-400' : 'text-slate-700'}>{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Start Case Modal */}
      <Modal isOpen={newModalOpen} onClose={() => setNewModalOpen(false)} title="Start Candidate Offboarding" maxWidth="md">
        <form onSubmit={handleCreateCase} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-700 font-medium mb-1">Select Team Member *</label>
            <select
              required
              value={newCase.personId}
              onChange={(e) => setNewCase({ ...newCase, personId: e.target.value })}
              className="w-full p-2 border rounded bg-white"
            >
              <option value="">-- Select Member --</option>
              {people.filter(p => p.status === 'ACTIVE').map((p) => (
                <option key={p.id} value={p.id}>{p.fullName} ({p.jobTitle})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1">Offboarding Type</label>
            <select
              value={newCase.offboardingType}
              onChange={(e) => setNewCase({ ...newCase, offboardingType: e.target.value })}
              className="w-full p-2 border rounded bg-white"
            >
              <option value="INTERNSHIP_COMPLETED">Internship Completed (Full 4-Month Cycle)</option>
              <option value="EARLY_EXIT">Early Exit / Resignation</option>
              <option value="TERMINATION">Termination</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1">Last Working Date</label>
            <input
              type="date"
              required
              value={newCase.lastWorkingDate}
              onChange={(e) => setNewCase({ ...newCase, lastWorkingDate: e.target.value })}
              className="w-full p-2 border rounded"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <Button size="sm" variant="outline" type="button" onClick={() => setNewModalOpen(false)}>Cancel</Button>
            <Button size="sm" type="submit" loading={actionLoading}>Start Offboarding</Button>
          </div>
        </form>
      </Modal>

      {/* Finalize Modal (Section 34) */}
      {selectedCase && (
        <Modal isOpen={finalizeModalOpen} onClose={() => setFinalizeModalOpen(false)} title={`Finalize Offboarding: ${selectedCase.personName}`} maxWidth="md">
          <form onSubmit={handleFinalize} className="space-y-3 text-xs">
            <div className="p-3 bg-slate-50 border rounded text-slate-700">
              <span className="font-semibold block mb-1">Certificate & Recognition Decision:</span>
              <p className="text-[11px] text-slate-500">Official recognition is conditional upon full completion of the 4-month program requirements and supervisor sign-off.</p>
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Internship Certificate</label>
              <select
                value={certificateDecision}
                onChange={(e) => setCertificateDecision(e.target.value)}
                className="w-full p-2 border rounded bg-white"
              >
                <option value="ISSUED">APPROVED & ISSUED</option>
                <option value="NOT_ELIGIBLE">NOT ELIGIBLE (Incomplete requirements / early departure)</option>
                <option value="WITHHELD">WITHHELD</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Recommendation Letter</label>
              <select
                value={letterDecision}
                onChange={(e) => setLetterDecision(e.target.value)}
                className="w-full p-2 border rounded bg-white"
              >
                <option value="ISSUED">RECOMMENDATION ISSUED</option>
                <option value="NOT_ISSUED">NOT ISSUED</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Final Offboarding Notes</label>
              <textarea
                rows={3}
                value={finalNotes}
                onChange={(e) => setFinalNotes(e.target.value)}
                placeholder="Final exit evaluation or notes for records..."
                className="w-full p-2 border rounded"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <Button size="sm" variant="outline" type="button" onClick={() => setFinalizeModalOpen(false)}>Cancel</Button>
              <Button size="sm" variant="success" type="submit" loading={actionLoading}>Archive & Complete</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Certificate of Completion Modal */}
      <CertificateModal
        isOpen={certModalOpen}
        onClose={() => setCertModalOpen(false)}
        internName={selectedCertIntern.name}
        role={selectedCertIntern.role}
        department={selectedCertIntern.department}
      />
    </div>
  );
};
