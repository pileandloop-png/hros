import React, { useState } from 'react';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import {
  Calendar,
  Clock,
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  X,
  FileText,
  UserX,
  ArrowRight,
  ShieldCheck,
  Building2
} from 'lucide-react';
import { recordContractRenewalOrExtension } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

interface ContractTenureModalProps {
  isOpen: boolean;
  onClose: () => void;
  person: any;
  onUpdated?: () => void;
}

export const ContractTenureModal: React.FC<ContractTenureModalProps> = ({
  isOpen,
  onClose,
  person,
  onUpdated
}) => {
  const { toast } = useToast();

  const [selectedAction, setSelectedAction] = useState<'EXTEND_MONTHS' | 'CONVERT_PERMANENT' | 'INITIATE_OFFBOARDING'>('EXTEND_MONTHS');
  const [extensionMonths, setExtensionMonths] = useState<number>(3);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !person) return null;

  const currentEnd = person.expectedEndDate?.toDate
    ? person.expectedEndDate.toDate()
    : person.expectedEndDate
    ? new Date(person.expectedEndDate)
    : null;

  const getDaysRemaining = () => {
    if (!currentEnd) return null;
    const now = new Date();
    return Math.ceil((currentEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  const daysLeft = getDaysRemaining();

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await recordContractRenewalOrExtension({
        personId: person.id || person.personId,
        action: selectedAction,
        extensionMonths,
        notes
      });

      toast.success(
        selectedAction === 'EXTEND_MONTHS'
          ? `Extended ${person.fullName}'s contract by ${extensionMonths} months!`
          : selectedAction === 'CONVERT_PERMANENT'
          ? `Converted ${person.fullName} to permanent team member!`
          : `Initiated offboarding case for ${person.fullName}!`
      );

      if (onUpdated) onUpdated();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update contract tenure');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150 select-none">
      <div className="bg-white border border-slate-200/90 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl text-slate-900 space-y-0 relative animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-sky-50 text-sky-600">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Employee Tenure & Contract Renewal Manager
              </h3>
              <p className="text-[11px] text-slate-500">
                Track contract milestones, upcoming tenure end dates, and renewals
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Employee Status Card */}
          <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                  {person.fullName ? person.fullName[0].toUpperCase() : 'U'}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{person.fullName}</h4>
                  <p className="text-[11px] text-slate-500">{person.jobTitle} • {person.department}</p>
                </div>
              </div>

              <Badge variant={person.status === 'ACTIVE' ? 'success' : 'info'}>
                {person.contractType || person.workerType || 'CONTRACTUAL'}
              </Badge>
            </div>

            {/* Timeline Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-1">
              <div className="p-2.5 bg-white rounded-xl border border-slate-200/70 shadow-2xs">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">Joining Date</span>
                <span className="font-semibold text-slate-800 text-[11px] block mt-0.5">
                  {person.joiningDate ? new Date(person.joiningDate).toLocaleDateString() : 'Active'}
                </span>
              </div>

              <div className="p-2.5 bg-white rounded-xl border border-slate-200/70 shadow-2xs">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">Contract End Date</span>
                <span className="font-semibold text-slate-800 text-[11px] block mt-0.5">
                  {currentEnd ? currentEnd.toLocaleDateString() : 'Open / Permanent'}
                </span>
              </div>

              <div className="p-2.5 bg-white rounded-xl border border-slate-200/70 shadow-2xs col-span-2 sm:col-span-1">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">Days Remaining</span>
                <span className={`font-bold text-[11px] block mt-0.5 ${
                  daysLeft !== null && daysLeft <= 30 ? 'text-amber-600' : 'text-emerald-700'
                }`}>
                  {daysLeft !== null ? `${daysLeft} Days Left` : 'Ongoing'}
                </span>
              </div>
            </div>
          </div>

          {/* Action Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
              Select Contract Renewal Action
            </label>
            <div className="space-y-2">
              <label
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  selectedAction === 'EXTEND_MONTHS'
                    ? 'bg-sky-50/80 border-sky-400 text-sky-950 shadow-2xs'
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <input
                    type="radio"
                    name="contractAction"
                    checked={selectedAction === 'EXTEND_MONTHS'}
                    onChange={() => setSelectedAction('EXTEND_MONTHS')}
                    className="w-4 h-4 text-sky-600"
                  />
                  <div>
                    <span className="text-xs font-bold block">Extend Contract Tenure</span>
                    <span className="text-[11px] text-slate-500">Extend current agreement by fixed months</span>
                  </div>
                </div>

                {selectedAction === 'EXTEND_MONTHS' && (
                  <select
                    value={extensionMonths}
                    onChange={(e) => setExtensionMonths(Number(e.target.value))}
                    className="text-xs font-semibold px-2 py-1 rounded-lg border border-slate-200 bg-white"
                  >
                    <option value={3}>+3 Months</option>
                    <option value={6}>+6 Months</option>
                    <option value={12}>+1 Year</option>
                  </select>
                )}
              </label>

              <label
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  selectedAction === 'CONVERT_PERMANENT'
                    ? 'bg-emerald-50/80 border-emerald-400 text-emerald-950 shadow-2xs'
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <input
                    type="radio"
                    name="contractAction"
                    checked={selectedAction === 'CONVERT_PERMANENT'}
                    onChange={() => setSelectedAction('CONVERT_PERMANENT')}
                    className="w-4 h-4 text-emerald-600"
                  />
                  <div>
                    <span className="text-xs font-bold block">Convert to Permanent Employment</span>
                    <span className="text-[11px] text-slate-500">Remove contract end date and assign full-time status</span>
                  </div>
                </div>
                <UserCheck className="w-4 h-4 text-emerald-600" />
              </label>

              <label
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  selectedAction === 'INITIATE_OFFBOARDING'
                    ? 'bg-rose-50/80 border-rose-400 text-rose-950 shadow-2xs'
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <input
                    type="radio"
                    name="contractAction"
                    checked={selectedAction === 'INITIATE_OFFBOARDING'}
                    onChange={() => setSelectedAction('INITIATE_OFFBOARDING')}
                    className="w-4 h-4 text-rose-600"
                  />
                  <div>
                    <span className="text-xs font-bold block">Prepare for Natural End / Offboarding</span>
                    <span className="text-[11px] text-slate-500">Generate completion checklist and handover schedule</span>
                  </div>
                </div>
                <UserX className="w-4 h-4 text-rose-600" />
              </label>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              HR Justification / Agreement Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Performance appraisal approved, extending contract through Q3"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Updates internal records and notification alerts</span>
          </span>

          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={onClose}
              disabled={loading}
              className="text-slate-500 hover:text-slate-900"
            >
              Cancel
            </Button>

            <Button
              size="sm"
              onClick={handleSubmit}
              loading={loading}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl shadow-xs cursor-pointer"
            >
              Confirm Update
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
};
