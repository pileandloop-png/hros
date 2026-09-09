import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { updateDocumentStatus, completeOnboarding } from '../../services/api';
import { OnboardingCase, DocumentChecklistItem } from '../../types/onboarding';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { CnicWatermarkModal } from '../common/CnicWatermarkModal';
import {
  UserCheck,
  FileCheck,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  Lock,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const OnboardingList: React.FC = () => {
  const { isSupervisor, canViewCNIC } = useAuth();
  const navigate = useNavigate();

  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState<any | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentChecklistItem | null>(null);
  const [docReviewStatus, setDocReviewStatus] = useState<string>('ACCEPTED');
  const [watermarkStatus, setWatermarkStatus] = useState<string>('VERIFIED');
  const [reviewNotes, setReviewNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [cnicModalOpen, setCnicModalOpen] = useState(false);
  const [cnicTargetName, setCnicTargetName] = useState('Intern / Team Member');

  const loadOnboardingCases = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'onboardingCases'));
      const list = [];
      for (const d of snap.docs) {
        const cData = d.data();
        let candidateName = 'New Joiner';
        if (cData.candidateId) {
          const candSnap = await getDoc(doc(db, 'candidates', cData.candidateId));
          if (candSnap.exists()) candidateName = candSnap.data()?.fullName || candidateName;
        }
        list.push({ id: d.id, candidateName, ...cData });
      }
      setCases(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOnboardingCases();
  }, []);

  const handleUpdateDocReview = async () => {
    if (!selectedCase || !selectedDoc) return;
    setActionLoading(true);
    try {
      await updateDocumentStatus({
        onboardingId: selectedCase.id,
        documentType: selectedDoc.type,
        status: docReviewStatus,
        watermarkStatus,
        notes: reviewNotes,
      });
      setReviewModalOpen(false);
      loadOnboardingCases();
    } catch (err: any) {
      alert(err.message || 'Failed to update document status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleAccessItem = async (caseId: string, itemKey: string, currentVal: boolean) => {
    const targetCase = cases.find(c => c.id === caseId);
    if (!targetCase) return;
    const checklist = (targetCase.accessChecklist || []).map((item: any) =>
      item.key === itemKey ? { ...item, completed: !currentVal, completedAt: new Date().toISOString() } : item
    );
    await updateDoc(doc(db, 'onboardingCases', caseId), {
      accessChecklist: checklist,
      updatedAt: serverTimestamp(),
    });
    setCases(prev => prev.map(c => c.id === caseId ? { ...c, accessChecklist: checklist } : c));
  };

  const handleFinalizeOnboarding = async (onbId: string) => {
    if (!window.confirm('Verify and complete onboarding for this candidate? This will activate their PeopleRecord.')) return;
    setActionLoading(true);
    try {
      const res: any = await completeOnboarding(onbId);
      alert(res.message || 'Onboarding completed successfully!');
      loadOnboardingCases();
    } catch (err: any) {
      alert(err.message || 'Cannot complete onboarding');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Onboarding Cases & Document Verification</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Verify required documents (CNIC, Transcripts, Speed Tests, Specs, Agreement) and complete employee provisioning
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setCnicTargetName('Candidate');
            setCnicModalOpen(true);
          }}
          className="border-sky-300 text-sky-700 bg-sky-50 hover:bg-sky-100"
        >
          <ShieldCheck className="w-3.5 h-3.5 mr-1 text-sky-600" />
          Watermark CNIC Tool
        </Button>
      </div>

      {cases.length === 0 ? (
        <div className="p-12 bg-white rounded-xl border border-dashed text-center text-xs text-slate-500">
          {loading ? 'Loading onboarding cases...' : 'No active onboarding cases.'}
        </div>
      ) : (
        <div className="space-y-4">
          {cases.map((c) => {
            const docs = c.documentChecklist || [];
            const acceptedCount = docs.filter((d: any) => d.status === 'ACCEPTED').length;
            const requiredCount = docs.filter((d: any) => d.required).length;
            const allAccepted = acceptedCount >= requiredCount && requiredCount > 0;

            return (
              <div key={c.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-sm">
                      {c.candidateName ? c.candidateName[0] : 'O'}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{c.candidateName}</h4>
                      <span className="text-slate-500 text-[11px]">
                        Role: {c.role || 'Intern'} ? Dept: {c.department} ? 4-Month Internship
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Badge variant={c.status === 'COMPLETED' ? 'success' : 'warning'}>{c.status}</Badge>
                    {isSupervisor && c.status !== 'COMPLETED' && (
                      <Button
                        size="sm"
                        variant={allAccepted ? 'success' : 'outline'}
                        onClick={() => handleFinalizeOnboarding(c.id)}
                        loading={actionLoading}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        Complete Onboarding
                      </Button>
                    )}
                  </div>
                </div>

                {/* Document Verification Grid */}
                <div>
                  <h5 className="font-semibold text-slate-800 mb-2 flex items-center justify-between">
                    <span>1. Required Documents Checklist ({acceptedCount}/{requiredCount} Verified)</span>
                  </h5>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                    {docs.map((docItem: any, dIdx: number) => {
                      const isCnic = docItem.type === 'CNIC_FRONT' || docItem.type === 'CNIC_BACK';
                      return (
                        <div
                          key={dIdx}
                          onClick={() => {
                            setSelectedCase(c);
                            setSelectedDoc(docItem);
                            setDocReviewStatus(docItem.status || 'ACCEPTED');
                            setWatermarkStatus(docItem.watermarkStatus || 'VERIFIED');
                            setReviewNotes(docItem.notes || '');
                            setReviewModalOpen(true);
                          }}
                          className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer flex flex-col justify-between"
                        >
                          <div>
                            <span className="font-semibold text-slate-800 block truncate">{docItem.name}</span>
                            <div className="flex items-center space-x-1 mt-1">
                              <Badge variant={docItem.status === 'ACCEPTED' ? 'success' : docItem.status === 'RECEIVED' ? 'info' : 'neutral'}>
                                {docItem.status}
                              </Badge>
                            </div>
                          </div>
                          {isCnic && !canViewCNIC && (
                            <span className="text-[10px] text-slate-400 mt-2 flex items-center">
                              <Lock className="w-3 h-3 mr-0.5 text-rose-500" /> Restricted
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Access Checklist */}
                <div>
                  <h5 className="font-semibold text-slate-800 mb-2">2. Internal Access Provisioning Checklist</h5>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {(c.accessChecklist || []).map((acc: any) => (
                      <label
                        key={acc.key}
                        className="p-2 rounded border border-slate-200 bg-slate-50/70 flex items-center space-x-2 cursor-pointer hover:bg-slate-100"
                      >
                        <input
                          type="checkbox"
                          checked={acc.completed}
                          onChange={() => handleToggleAccessItem(c.id, acc.key, acc.completed)}
                          className="rounded text-sky-600 focus:ring-sky-500"
                        />
                        <span className={`text-[11px] ${acc.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                          {acc.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Document Review Modal */}
      {selectedDoc && (
        <Modal isOpen={reviewModalOpen} onClose={() => setReviewModalOpen(false)} title={`Review Document: ${selectedDoc.name}`} maxWidth="md">
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
              <span className="text-slate-500">Document Type: <strong>{selectedDoc.type}</strong></span>
              {selectedDoc.isSensitive && (
                <div className="flex items-center text-rose-600 space-x-1 text-[11px]">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Confidential Identity Document. Watermark verification required.</span>
                </div>
              )}
            </div>

            {/* CNIC Specific Watermark Stamping Quick Button */}
            {(selectedDoc.type === 'CNIC_FRONT' || selectedDoc.type === 'CNIC_BACK') && (
              <div className="p-3 bg-sky-50 border border-sky-200 rounded-lg flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sky-900 text-[11px]">Government CNIC Protection</p>
                  <p className="text-[10px] text-sky-700">Stamp company purpose and date watermark to protect identity scan.</p>
                </div>
                <Button
                  size="sm"
                  type="button"
                  onClick={() => {
                    setCnicTargetName(selectedCase?.candidateName || 'Candidate');
                    setCnicModalOpen(true);
                  }}
                  className="bg-sky-600 hover:bg-sky-700 text-white"
                >
                  <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                  Open Watermark Tool
                </Button>
              </div>
            )}

            <div>
              <label className="block font-medium text-slate-700 mb-1">Verification Status</label>
              <select
                value={docReviewStatus}
                onChange={(e) => setDocReviewStatus(e.target.value)}
                className="w-full p-2 border rounded-lg bg-white"
              >
                <option value="ACCEPTED">ACCEPTED (Verified)</option>
                <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                <option value="REUPLOAD_REQUIRED">REUPLOAD_REQUIRED</option>
                <option value="REJECTED">REJECTED</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Watermark Status</label>
              <select
                value={watermarkStatus}
                onChange={(e) => setWatermarkStatus(e.target.value)}
                className="w-full p-2 border rounded-lg bg-white"
              >
                <option value="VERIFIED">VERIFIED (Correct Watermark)</option>
                <option value="UNKNOWN">UNKNOWN</option>
                <option value="MISSING">MISSING (Watermark required)</option>
                <option value="INVALID">INVALID</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Review Notes</label>
              <input
                type="text"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Legibility, expiry, device specifications noted..."
                className="w-full p-2 border rounded-lg"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <Button size="sm" variant="outline" onClick={() => setReviewModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleUpdateDocReview} loading={actionLoading}>
                Save Document Review
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* CNIC Security Watermark Tool Modal */}
      <CnicWatermarkModal
        isOpen={cnicModalOpen}
        onClose={() => setCnicModalOpen(false)}
        personName={cnicTargetName}
        onSaveWatermarked={() => setWatermarkStatus('VERIFIED')}
      />
    </div>
  );
};
