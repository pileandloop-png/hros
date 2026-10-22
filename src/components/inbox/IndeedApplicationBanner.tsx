import React, { useState } from 'react';
import { EmailThread, EmailMessage } from '../../types/email';
import {
  parseIndeedApplicationEmail,
  IndeedApplicationDetails,
  generateInitialCandidateEmail,
  generate5ScreeningQuestions,
  generateInitial5QuestionsEmail,
  calculateScreeningMatch,
  parseCvData
} from '../../services/cvAnalysisService';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  ExternalLink,
  Sparkles,
  Globe,
  Mail,
  UserX,
  UserCheck,
  ShieldAlert,
  Info,
  RotateCcw
} from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

interface IndeedApplicationBannerProps {
  thread: EmailThread;
  message?: EmailMessage;
  onOpenCvModal: (details: IndeedApplicationDetails) => void;
  onPopulateReply: (subject: string, body: string) => void;
}

export const IndeedApplicationBanner: React.FC<IndeedApplicationBannerProps> = ({
  thread,
  message,
  onOpenCvModal,
  onPopulateReply
}) => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const details: IndeedApplicationDetails = parseIndeedApplicationEmail(
    thread.subject,
    message?.textBody || thread.lastMessageSnippet || '',
    message?.htmlBody || '',
    message?.from || thread.participantEmails[0] || ''
  );

  // Auto-skip toggle state for Below Bachelor (defaults to true if candidate is Below Bachelor)
  const [autoSkipBelowBachelor, setAutoSkipBelowBachelor] = useState<boolean>(
    details.educationClassification.isBelowBachelor
  );
  const [overrideActive, setOverrideActive] = useState(false);

  // If this thread is not an Indeed or application email, do not render banner
  if (!details.isIndeed && thread.category !== 'New Application' && !thread.subject.toLowerCase().includes('application')) {
    return null;
  }

  const { educationClassification } = details;
  const isBelowBachelor = educationClassification.isBelowBachelor;

  // 1-Click Action: Prepare 5 AI Screening Questions Email
  const handlePrepare5QuestionsEmail = () => {
    const parsed = parseCvData(details.resumeSnippet || details.candidateName);
    const questions = generate5ScreeningQuestions(parsed, details.positionApplied, '', parsed.skillsFound);
    const draft = generateInitial5QuestionsEmail(details.candidateName, details.positionApplied, questions, 'Pile & Loop');
    onPopulateReply(draft.subject, draft.body);
    toast.success(`Generated 5 AI screening questions for ${details.candidateName}!`);
  };

  // 1-Click Action: Prepare Respectful Degree Qualification Notice (Polite Rejection)
  const handlePrepareRejectionNotice = () => {
    const parsed = parseCvData(details.resumeSnippet || details.candidateName);
    const analysis = calculateScreeningMatch(parsed, details.positionApplied);
    const draft = generateInitialCandidateEmail(details.candidateName, details.positionApplied, analysis, true);
    onPopulateReply(draft.subject, draft.body);
    toast.info(`Generated educational qualification notice for ${details.candidateName}`);
  };

  return (
    <div className={`p-4 rounded-xl border transition-all shadow-xs ${
      isBelowBachelor
        ? 'bg-amber-50/70 border-amber-200'
        : 'bg-sky-50/70 border-sky-200'
    }`}>
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-200/60">
        <div className="flex items-center space-x-2.5">
          <span className={`p-1.5 rounded-lg ${
            isBelowBachelor ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'
          }`}>
            {isBelowBachelor ? <ShieldAlert className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
          </span>
          <div>
            <div className="flex items-center space-x-2">
              <h4 className="text-xs font-bold text-slate-900">
                Indeed Inbound Application
              </h4>
              <Badge variant={isBelowBachelor ? 'warning' : 'success'}>
                {isBelowBachelor ? '⚠️ Below Bachelor Filter Active' : '✅ Degree Qualified'}
              </Badge>
            </div>
            <p className="text-[11px] text-slate-600">
              Candidate: <strong className="text-slate-800">{details.candidateName}</strong> • Role: <strong className="text-slate-800">{details.positionApplied}</strong>
            </p>
          </div>
        </div>

        {/* Candidate Contact Pills */}
        <div className="flex items-center space-x-2 text-[10px]">
          <span className="bg-white px-2 py-0.5 rounded border border-slate-200 font-mono text-slate-600 truncate max-w-xs">
            {details.candidateEmail}
          </span>
          {details.candidatePhone && (
            <span className="bg-white px-2 py-0.5 rounded border border-slate-200 font-mono text-slate-600">
              {details.candidatePhone}
            </span>
          )}
        </div>
      </div>

      {/* Education Classification & Policy Feedback */}
      <div className="py-3 space-y-2">
        <div className="flex items-start space-x-2">
          {isBelowBachelor ? (
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
          )}
          <div className="text-xs flex-1">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-900">
                Education Audit Verdict:
              </span>
              <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                isBelowBachelor
                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
              }`}>
                {educationClassification.level === 'BELOW_BACHELOR'
                  ? `BELOW BACHELOR (${educationClassification.highestDegreeFound})`
                  : `${educationClassification.highestDegreeFound}`}
              </span>
            </div>
            <p className="text-slate-600 mt-1 leading-relaxed">
              {educationClassification.reasoning}
            </p>
          </div>
        </div>

        {/* Below Bachelor Policy Enforcer Toggle */}
        {isBelowBachelor && (
          <div className="bg-white p-3 rounded-lg border border-amber-200 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoSkipBelowBachelor}
                  onChange={(e) => {
                    setAutoSkipBelowBachelor(e.target.checked);
                    if (e.target.checked) setOverrideActive(false);
                  }}
                  className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
                />
                <span className="text-xs font-semibold text-slate-800">
                  Do Not Auto-Reply to Below Bachelor Candidates (Auto-Skip Policy)
                </span>
              </label>

              <span className="text-[10px] text-amber-800 font-bold bg-amber-100 px-2 py-0.5 rounded">
                Recommended HR Safety Guard
              </span>
            </div>

            <p className="text-[11px] text-slate-500">
              {autoSkipBelowBachelor ? (
                <span>
                  🛡️ <strong>Auto-Reply Suppressed</strong>: Candidate does not hold a 4-year Bachelor degree. No automated email will be sent unless manually overridden.
                </span>
              ) : (
                <span>
                  ⚠️ <strong>Manual Override Enabled</strong>: You may compose and dispatch a custom email or educational requirement feedback notice.
                </span>
              )}
            </p>
          </div>
        )}
      </div>

      {/* Action Buttons Row */}
      <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/60">
        <div className="flex items-center space-x-2">
          {/* Open In-App CV & OCR Viewer */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => onOpenCvModal(details)}
            className="bg-white text-xs font-semibold shadow-2xs"
          >
            <FileText className="w-3.5 h-3.5 mr-1.5 text-sky-600" />
            View Resume & OCR
          </Button>

          {/* Open Indeed External Link if available */}
          {details.indeedResumeUrl && (
            <a
              href={details.indeedResumeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition shadow-2xs"
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1 text-slate-500" />
              Indeed Profile
            </a>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {isBelowBachelor ? (
            <>
              {autoSkipBelowBachelor && !overrideActive ? (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setOverrideActive(true);
                    setAutoSkipBelowBachelor(false);
                    toast.info('Below Bachelor filter overridden. You can now draft a custom response.');
                  }}
                  className="text-xs"
                >
                  Override & Reply Anyway
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePrepareRejectionNotice}
                  className="bg-white text-xs font-semibold border-amber-300 text-amber-800 hover:bg-amber-50"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
                  Draft Degree Requirement Notice
                </Button>
              )}
            </>
          ) : (
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(`/browser-agent?url=${encodeURIComponent(details.indeedResumeUrl || '')}&name=${encodeURIComponent(details.candidateName)}&role=${encodeURIComponent(details.positionApplied)}`)}
                className="bg-white text-slate-700 text-xs font-semibold shadow-2xs border-slate-300 hover:bg-slate-50"
              >
                <Globe className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                Run Browser Agent
              </Button>

              <Button
                size="sm"
                variant="primary"
                onClick={handlePrepare5QuestionsEmail}
                className="bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                Send 5 Screening Questions
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
