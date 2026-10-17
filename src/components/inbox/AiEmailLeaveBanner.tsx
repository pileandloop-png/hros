import React, { useState } from 'react';
import { EmailThread, EmailMessage } from '../../types/email';
import { detectLeaveIntentFromEmail, InboundEmailLeaveDetails } from '../../services/cvAnalysisService';
import { createLeaveRequestFromAiEmail } from '../../services/api';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import {
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Zap,
  Building2,
  ShieldCheck,
  Check,
  ExternalLink
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';

interface AiEmailLeaveBannerProps {
  thread: EmailThread;
  message?: EmailMessage;
  existingPeople: any[];
  onLeaveProcessed?: () => void;
}

export const AiEmailLeaveBanner: React.FC<AiEmailLeaveBannerProps> = ({
  thread,
  message,
  existingPeople,
  onLeaveProcessed
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [actionLoading, setActionLoading] = useState(false);
  const [processedStatus, setProcessedStatus] = useState<string | null>(null);

  const textToScan = message?.textBody || thread.lastMessageSnippet || '';
  const senderEmail = message?.from || thread.participantEmails[0] || '';

  const leaveDetails: InboundEmailLeaveDetails = detectLeaveIntentFromEmail(
    thread.subject,
    textToScan,
    senderEmail,
    existingPeople
  );

  if (!leaveDetails.isLeaveRequest) {
    return null;
  }

  const handleApproveAndSchedule = async () => {
    setActionLoading(true);
    try {
      await createLeaveRequestFromAiEmail(leaveDetails);
      setProcessedStatus('SCHEDULED_AND_RECORDED');
      toast.success(`⚡ Leave request recorded for ${leaveDetails.employeeName}!`);
      if (onLeaveProcessed) onLeaveProcessed();
    } catch (err: any) {
      toast.error(err.message || 'Failed to record leave request');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 shadow-xs space-y-3 transition-all animate-in fade-in select-none">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2.5 border-b border-amber-200/70">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 rounded-xl bg-amber-100 text-amber-700">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h4 className="text-xs font-bold text-slate-900">
                AI Detected Employee Leave Application
              </h4>
              <Badge variant="warning">
                {leaveDetails.leaveType} LEAVE • {leaveDetails.confidenceScore}% AI Confidence
              </Badge>
            </div>
            <p className="text-[11px] text-slate-600">
              Sender: <strong className="text-slate-800">{leaveDetails.employeeName}</strong> ({leaveDetails.matchedDepartment}) • <span className="font-mono text-slate-500">{leaveDetails.employeeEmail}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="font-mono text-xs font-bold text-amber-900 bg-amber-100/80 px-2.5 py-1 rounded-lg border border-amber-200">
            {leaveDetails.requestedDays} Day(s) Requested
          </span>
        </div>
      </div>

      {/* Extracted Leave Details Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
        <div className="bg-white p-2.5 rounded-xl border border-amber-200/60 shadow-2xs">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">Leave Period</span>
          <span className="font-bold text-slate-800 text-[11px] block mt-0.5">
            {leaveDetails.startDate} {leaveDetails.startDate !== leaveDetails.endDate ? `to ${leaveDetails.endDate}` : '(Single Day)'}
          </span>
        </div>

        <div className="bg-white p-2.5 rounded-xl border border-amber-200/60 shadow-2xs">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">Category</span>
          <span className="font-bold text-slate-800 text-[11px] block mt-0.5">
            {leaveDetails.leaveType === 'SICK' ? 'Medical / Sick Leave' : leaveDetails.leaveType === 'EMERGENCY' ? 'Family Emergency' : 'Casual / Personal Leave'}
          </span>
        </div>

        <div className="bg-white p-2.5 rounded-xl border border-amber-200/60 shadow-2xs sm:col-span-1">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">Auto-Linked Employee</span>
          <span className="font-bold text-slate-800 text-[11px] block mt-0.5 truncate">
            {leaveDetails.employeeName}
          </span>
        </div>
      </div>

      {/* Extracted Reason */}
      <div className="p-2.5 bg-white rounded-xl border border-amber-200/60 text-[11px] text-slate-700">
        <span className="text-slate-400 font-semibold block text-[10px] uppercase tracking-wider mb-0.5">
          Extracted Stated Reason:
        </span>
        <span className="italic leading-relaxed">{leaveDetails.reasonSummary}</span>
      </div>

      {/* Action Buttons Row */}
      <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-amber-200/70">
        <span className="text-[10px] text-slate-500 flex items-center space-x-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Synced directly to HR Leave Schedule</span>
        </span>

        <div className="flex items-center space-x-2">
          {processedStatus === 'SCHEDULED_AND_RECORDED' ? (
            <div className="inline-flex items-center px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-xs">
              <Check className="w-4 h-4 mr-1.5" />
              <span>Leave Application Registered & Synced</span>
            </div>
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate('/leave')}
                className="bg-white text-xs font-semibold shadow-2xs border-slate-300"
              >
                <ExternalLink className="w-3.5 h-3.5 mr-1 text-slate-500" />
                Open Leave Management
              </Button>

              <Button
                size="sm"
                onClick={handleApproveAndSchedule}
                loading={actionLoading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 mr-1 fill-white" />
                ⚡ 1-Click Record & Schedule Leave
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
