import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import {
  UserX,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
  Lock,
  FileText,
  Award,
  Key,
  XCircle,
  Laptop
} from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { store } from '../../services/store';

interface OffboardingHandoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  person: any;
  onSuccess: (updatedPerson: any) => void;
  onOpenExperienceLetter?: (person: any) => void;
  onOpenCertificate?: (person: any) => void;
}

export const OffboardingHandoverModal: React.FC<OffboardingHandoverModalProps> = ({
  isOpen,
  onClose,
  person,
  onSuccess,
  onOpenExperienceLetter,
  onOpenCertificate
}) => {
  const toast = useToast();

  const nowPkt = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' PKT';
  const todayDate = new Date().toISOString().split('T')[0];

  const [offboardDate, setOffboardDate] = useState<string>(todayDate);
  const [offboardTime, setOffboardTime] = useState<string>('17:00');
  const [offboardType, setOffboardType] = useState<'CONTRACT_COMPLETED' | 'RESIGNED' | 'TERMINATED'>('CONTRACT_COMPLETED');
  const [reasonNotes, setReasonNotes] = useState<string>('Standard 4-month internship program successfully completed.');
  
  // Access Handover Checklist
  const [emailRevoked, setEmailRevoked] = useState<boolean>(true);
  const [githubRevoked, setGithubRevoked] = useState<boolean>(true);
  const [slackRevoked, setSlackRevoked] = useState<boolean>(true);
  const [toolsRevoked, setToolsRevoked] = useState<boolean>(true);
  const [assetsReturned, setAssetsReturned] = useState<boolean>(true);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [offboardingCompleted, setOffboardingCompleted] = useState<boolean>(false);
  const [savedRecord, setSavedRecord] = useState<any>(null);

  if (!isOpen || !person) return null;

  const totalHandoverItems = 5;
  const completedHandoverItems = [emailRevoked, githubRevoked, slackRevoked, toolsRevoked, assetsReturned].filter(Boolean).length;
  const handoverCompliant = completedHandoverItems === totalHandoverItems;

  const handleExecuteOffboarding = () => {
    setSubmitting(true);
    try {
      const fullTimestamp = `${offboardDate} ${offboardTime}:00 PKT`;
      const finalStatus = offboardType === 'TERMINATED' ? 'TERMINATED' : 'OFFBOARDED';

      const updatedData = {
        ...person,
        status: finalStatus,
        offboardedAt: fullTimestamp,
        actualEndDate: offboardDate,
        offboardingReason: offboardType,
        offboardingNotes: reasonNotes,
        accessHandover: {
          emailRevoked,
          githubRevoked,
          slackRevoked,
          toolsRevoked,
          assetsReturned,
          clearedAt: fullTimestamp,
          complianceRate: Math.round((completedHandoverItems / totalHandoverItems) * 100)
        },
        updatedAt: new Date().toISOString()
      };

      // Persist in store
      store.updateDocument('people', person.id || person.personId, updatedData);
      setSavedRecord(updatedData);
      setOffboardingCompleted(true);
      onSuccess(updatedData);

      toast.success(
        offboardType === 'TERMINATED' ? 'Employee Terminated & Access Revoked' : 'Offboarding Completed & Handover Logged',
        `${person.fullName} has been archived with timestamp ${fullTimestamp}. Access clearance: ${completedHandoverItems}/${totalHandoverItems}.`
      );
    } catch (e: any) {
      toast.error('Offboarding Error', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Employee Offboarding & Access Handover Manager" maxWidth="lg">
      <div className="space-y-5 text-slate-900">
        
        {/* Person Dossier Header */}
        <div className="p-4 bg-slate-50 border border-slate-200/90 rounded-2xl flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white font-bold flex items-center justify-center text-sm shadow-xs">
              {person.fullName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-900">{person.fullName}</h4>
                <Badge variant={person.workerType === 'EMPLOYEE' ? 'info' : 'purple'}>
                  {person.workerType || 'INTERN'}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {person.jobTitle} &bull; {person.department} Department
              </p>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                Joined: {person.joiningDate || person.joinDate || 'N/A'} &bull; Current Status: {person.status}
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Active Session</span>
            <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              {person.email || person.personalEmail}
            </span>
          </div>
        </div>

        {!offboardingCompleted ? (
          <div className="space-y-4">
            
            {/* Step 1: Offboarding Timestamp & Type */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Offboarding Date *</label>
                <input
                  type="date"
                  value={offboardDate}
                  onChange={(e) => setOffboardDate(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs font-medium bg-white focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Time (PKT) *</label>
                <input
                  type="time"
                  value={offboardTime}
                  onChange={(e) => setOffboardTime(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs font-medium bg-white focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Departure Nature *</label>
                <select
                  value={offboardType}
                  onChange={(e) => {
                    const val = e.target.value as any;
                    setOffboardType(val);
                    if (val === 'TERMINATED') {
                      setReasonNotes('Discontinued / Terminated: attendance violation or contract breach.');
                    } else if (val === 'RESIGNED') {
                      setReasonNotes('Voluntary resignation submitted and accepted.');
                    } else {
                      setReasonNotes('Standard contractual program successfully completed.');
                    }
                  }}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs font-bold bg-white focus:ring-2 focus:ring-slate-900"
                >
                  <option value="CONTRACT_COMPLETED">Program / Contract Completed</option>
                  <option value="RESIGNED">Voluntary Resignation</option>
                  <option value="TERMINATED">Terminated / Kicked Out</option>
                </select>
              </div>
            </div>

            {/* Step 2: Notes / Reason */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Offboarding Reason &amp; Official Notes</label>
              <textarea
                rows={2}
                value={reasonNotes}
                onChange={(e) => setReasonNotes(e.target.value)}
                placeholder="Document conduct summary, project deliverables handover, or specific reasons..."
                className="w-full p-2 border border-slate-200 rounded-lg text-xs font-medium bg-white focus:ring-2 focus:ring-slate-900"
              />
            </div>

            {/* Step 3: Access Revocation & Handover Checklist */}
            <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Lock className="w-4 h-4 text-slate-700" />
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Access Revocation &amp; Clearance Protocol
                  </h4>
                </div>
                <Badge variant={handoverCompliant ? 'success' : 'warning'}>
                  {completedHandoverItems} of {totalHandoverItems} Cleared
                </Badge>
              </div>
              <p className="text-[11px] text-slate-500">
                Confirm all credentials, communication channels, and physical assets are revoked or returned.
              </p>

              <div className="space-y-2 pt-1">
                <label className="flex items-center space-x-3 p-2 bg-white rounded-xl border border-slate-200/80 cursor-pointer hover:bg-slate-50 transition">
                  <input
                    type="checkbox"
                    checked={emailRevoked}
                    onChange={(e) => setEmailRevoked(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-slate-800">Corporate Email &amp; Outlook Account Revoked</span>
                    <p className="text-[10px] text-slate-400">Password reset or suspended on mail.pileandloop.com</p>
                  </div>
                </label>

                <label className="flex items-center space-x-3 p-2 bg-white rounded-xl border border-slate-200/80 cursor-pointer hover:bg-slate-50 transition">
                  <input
                    type="checkbox"
                    checked={githubRevoked}
                    onChange={(e) => setGithubRevoked(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-slate-800">GitHub Organization &amp; Codebase Access Removed</span>
                    <p className="text-[10px] text-slate-400">Revoked from repository collaborator list and SSH keys invalidated</p>
                  </div>
                </label>

                <label className="flex items-center space-x-3 p-2 bg-white rounded-xl border border-slate-200/80 cursor-pointer hover:bg-slate-50 transition">
                  <input
                    type="checkbox"
                    checked={slackRevoked}
                    onChange={(e) => setSlackRevoked(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-slate-800">Slack, Discord &amp; Team Chat Channels Deactivated</span>
                    <p className="text-[10px] text-slate-400">Removed from company communication workspaces</p>
                  </div>
                </label>

                <label className="flex items-center space-x-3 p-2 bg-white rounded-xl border border-slate-200/80 cursor-pointer hover:bg-slate-50 transition">
                  <input
                    type="checkbox"
                    checked={toolsRevoked}
                    onChange={(e) => setToolsRevoked(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-slate-800">Internal Tools, Database &amp; Cloud API Keys Revoked</span>
                    <p className="text-[10px] text-slate-400">Notion, Supabase, AWS staging sandbox, and API credentials rotated</p>
                  </div>
                </label>

                <label className="flex items-center space-x-3 p-2 bg-white rounded-xl border border-slate-200/80 cursor-pointer hover:bg-slate-50 transition">
                  <input
                    type="checkbox"
                    checked={assetsReturned}
                    onChange={(e) => setAssetsReturned(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-slate-800">Company Laptop, Hardware &amp; Security Badges Returned</span>
                    <p className="text-[10px] text-slate-400">All physical property confirmed returned to operations desk</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-[11px] text-slate-500">
                Timestamp: <strong>{offboardDate} {offboardTime}:00 PKT</strong>
              </span>

              <div className="flex items-center space-x-2">
                <Button size="sm" variant="outline" onClick={onClose} disabled={submitting}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleExecuteOffboarding}
                  loading={submitting}
                  className={offboardType === 'TERMINATED' ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-slate-900 text-white'}
                >
                  <UserX className="w-3.5 h-3.5 mr-1" />
                  {offboardType === 'TERMINATED' ? 'Confirm Termination & Revoke' : 'Finalize Offboarding'}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* Post-Offboarding Success Panel with 1-Click Document Generators */
          <div className="py-4 space-y-5 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h4 className="text-base font-bold text-slate-900">
                {savedRecord?.status === 'TERMINATED' ? 'Employee Terminated & Archived' : 'Offboarding Completed Successfully!'}
              </h4>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                Offboarding timestamp recorded as <strong className="font-mono text-slate-800">{savedRecord?.offboardedAt}</strong>. 
                All handover checklist states have been synchronized into the employee database.
              </p>
            </div>

            {/* 1-Click Generation of Official Letters */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-left space-y-3">
              <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-600" />
                1-Click Official Letters &amp; Credentials Generated
              </h5>
              <p className="text-[11px] text-slate-500">
                The exact start date, end date, and clearance status have been automatically mapped into official documents:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenExperienceLetter) onOpenExperienceLetter(savedRecord);
                  }}
                  className="p-3 bg-white rounded-xl border border-slate-200 hover:border-emerald-500 hover:shadow-xs transition text-left flex items-start gap-2.5"
                >
                  <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700 shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h6 className="text-xs font-bold text-slate-900">Experience Letter</h6>
                    <p className="text-[10px] text-slate-500 mt-0.5">Printable corporate letterhead with exact tenure and clearance</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (onOpenCertificate) onOpenCertificate(savedRecord);
                  }}
                  className="p-3 bg-white rounded-xl border border-slate-200 hover:border-amber-500 hover:shadow-xs transition text-left flex items-start gap-2.5"
                >
                  <div className="p-2 rounded-lg bg-amber-50 text-amber-700 shrink-0">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <h6 className="text-xs font-bold text-slate-900">Internship Certificate</h6>
                    <p className="text-[10px] text-slate-500 mt-0.5">High-definition certificate of completion with verification QR</p>
                  </div>
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button size="sm" variant="primary" onClick={onClose} className="bg-slate-900 text-white">
                Done &amp; Close
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
