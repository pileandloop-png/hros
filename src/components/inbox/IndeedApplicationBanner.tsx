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
  RotateCcw,
  Copy,
  Check,
  Zap,
  Send,
  ArrowRight,
  Clock,
  Cpu
} from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { sendHrEmail } from '../../services/api';
import { store } from '../../services/store';

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
  const [copiedText, setCopiedText] = useState(false);
  const [autoRunning, setAutoRunning] = useState(false);
  const [autoStep, setAutoStep] = useState<string | null>(null);
  const [dispatchComplete, setDispatchComplete] = useState(false);

  // If this thread is not an Indeed or application email, do not render banner
  if (!details.isIndeed && thread.category !== 'New Application' && !thread.subject.toLowerCase().includes('application')) {
    return null;
  }

  const { educationClassification } = details;
  const isBelowBachelor = educationClassification.isBelowBachelor;

  // 1-Click Action: Copy Resume Text
  const handleCopyResumeText = () => {
    const textToCopy = details.resumeSnippet || message?.textBody || '';
    if (!textToCopy) {
      toast.error('No resume text available to copy');
      return;
    }
    navigator.clipboard.writeText(textToCopy);
    setCopiedText(true);
    toast.success(`Copied resume text for ${details.candidateName}!`);
    setTimeout(() => setCopiedText(false), 2500);
  };

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

  // 1-Click Complete Pipeline Auto-Pilot: Extract -> Analyze -> Reply -> Update Candidate
  const handleOneClickAutoPipeline = async () => {
    setAutoRunning(true);
    try {
      setAutoStep('Step 1/4: Extracting candidate CV text & skills...');
      await new Promise(r => setTimeout(r, 600));

      const parsed = parseCvData(details.resumeSnippet || details.candidateName);
      
      setAutoStep('Step 2/4: Auditing educational qualification against Bachelor policy...');
      await new Promise(r => setTimeout(r, 600));

      if (isBelowBachelor && !overrideActive) {
        toast.warning(`Candidate is Below Bachelor (${details.educationClassification.highestDegreeFound}). Suppressed by safety guard.`);
        setAutoStep(null);
        setAutoRunning(false);
        return;
      }

      setAutoStep('Step 3/4: Formulating 5 personalized technical & role screening questions...');
      await new Promise(r => setTimeout(r, 600));

      const questions = generate5ScreeningQuestions(parsed, details.positionApplied, '', parsed.skillsFound);
      const emailDraft = generateInitial5QuestionsEmail(details.candidateName, details.positionApplied, questions, 'Pile & Loop');

      setAutoStep('Step 4/4: Dispatching email via SMTP mail.pileandloop.com & updating candidate record...');
      const targetEmail = details.candidateEmail || thread.participantEmails[0];
      const candId = `cand-${details.candidateName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
      const appId = `app-${details.candidateName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

      await sendHrEmail({
        to: targetEmail,
        subject: emailDraft.subject,
        htmlBody: `<div style="font-family: sans-serif; font-size: 14px; line-height: 1.6; color: #1e293b;">${emailDraft.body.replace(/\n/g, '<br/>')}</div>`,
        textBody: emailDraft.body,
        candidateId: candId,
        applicationId: appId,
        idempotencyKey: `auto_indeed_${Date.now()}_${candId}`
      });

      const timestampStr = new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi' }) + ' PKT';

      // Update candidate in store
      store.setDocument('candidates', candId, {
        id: candId,
        candidateId: candId,
        fullName: details.candidateName,
        email: targetEmail,
        personalEmail: targetEmail,
        phone: details.candidatePhone || '+92 300 0000000',
        vacancyTitle: details.positionApplied,
        stage: 'SCREENING',
        source: 'Indeed',
        rating: isBelowBachelor ? 3 : 5,
        notes: `Automated screening questions sent via 1-Click Pipeline at ${timestampStr}. Education: ${details.educationClassification.highestDegreeFound}.`,
        screeningQuestions: questions.map(q => q.question),
        appliedDate: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, true);

      // Update application
      store.setDocument('applications', appId, {
        id: appId,
        applicationId: appId,
        candidateId: candId,
        positionAppliedFor: details.positionApplied,
        currentStage: 'INITIAL_EMAIL_SENT',
        source: 'Indeed',
        education: details.educationClassification.highestDegreeFound,
        aiFitScore: isBelowBachelor ? 40 : 92,
        screeningQuestionsAndAnswers: questions.map(q => ({
          question: q.question,
          answer: 'Awaiting candidate email response to 5 questions',
          passed: false
        })),
        updatedAt: new Date().toISOString()
      }, true);

      // Log audit entry
      const auditId = `audit-${Date.now()}`;
      store.setDocument('auditLogs', auditId, {
        id: auditId,
        action: 'INDEED_APPLICATION_AUTO_SCREENED',
        actorEmail: 'hr@pileandloop.com',
        actorRole: 'SYSTEM_AUTOPILOT',
        targetEntity: details.candidateName,
        details: `Processed Indeed application for ${details.candidateName} (${details.positionApplied}). 5 Screening questions dispatched via SMTP and stage transitioned to INITIAL_EMAIL_SENT at ${timestampStr}.`,
        timestamp: new Date().toISOString()
      });

      setDispatchComplete(true);
      toast.success(`✅ Pipeline Complete! 5 Questions dispatched to ${details.candidateName} via SMTP and candidate record updated.`);
    } catch (err: any) {
      toast.error(err.message || 'Auto-pipeline failed');
    } finally {
      setAutoRunning(false);
      setAutoStep(null);
    }
  };

  return (
    <div className={`p-4 rounded-2xl border transition-all shadow-xs ${
      isBelowBachelor
        ? 'bg-amber-50/70 border-amber-200'
        : 'bg-white border-slate-200 shadow-sm'
    }`}>
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-200/60">
        <div className="flex items-center space-x-2.5">
          <span className={`p-1.5 rounded-lg ${
            isBelowBachelor ? 'bg-amber-100 text-amber-700' : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
          }`}>
            {isBelowBachelor ? <ShieldAlert className="w-4 h-4" /> : <Zap className="w-4 h-4 text-emerald-600" />}
          </span>
          <div>
            <div className="flex items-center space-x-2">
              <h4 className="text-xs font-bold text-slate-900">
                Indeed Inbound Application Pipeline
              </h4>
              <Badge variant={isBelowBachelor ? 'warning' : 'success'}>
                {isBelowBachelor ? '⚠️ Below Bachelor Filter Active' : '✅ Degree Qualified'}
              </Badge>
              {dispatchComplete && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Reply Dispatched & Candidate Updated
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-600">
              Candidate: <strong className="text-slate-900">{details.candidateName}</strong> &bull; Role: <strong className="text-slate-900">{details.positionApplied}</strong>
            </p>
          </div>
        </div>

        {/* Candidate Contact Pills */}
        <div className="flex items-center space-x-2 text-[10px]">
          <span className="bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 font-mono text-slate-700 truncate max-w-xs shadow-2xs">
            {details.candidateEmail}
          </span>
          {details.candidatePhone && (
            <span className="bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 font-mono text-slate-700 shadow-2xs">
              {details.candidatePhone}
            </span>
          )}
        </div>
      </div>

      {/* Visual Workflow Steps Guide */}
      <div className="py-2.5 border-b border-slate-200/60">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-[10px] font-semibold">
          <div className="p-1.5 bg-emerald-50/80 text-emerald-800 rounded-lg border border-emerald-200 flex items-center justify-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
            <span>1. Inbound Received</span>
          </div>
          <div className="p-1.5 bg-slate-50 text-slate-700 rounded-lg border border-slate-200 flex items-center justify-center gap-1">
            <FileText className="w-3 h-3 text-sky-600 shrink-0" />
            <span>2. Extract Resume</span>
          </div>
          <div className={`p-1.5 rounded-lg border flex items-center justify-center gap-1 ${
            isBelowBachelor ? 'bg-amber-100/70 text-amber-800 border-amber-300' : 'bg-slate-50 text-slate-700 border-slate-200'
          }`}>
            <Cpu className="w-3 h-3 text-purple-600 shrink-0" />
            <span>3. Bachelor Check</span>
          </div>
          <div className="p-1.5 bg-slate-50 text-slate-700 rounded-lg border border-slate-200 flex items-center justify-center gap-1">
            <Sparkles className="w-3 h-3 text-indigo-600 shrink-0" />
            <span>4. 5 AI Questions</span>
          </div>
          <div className={`p-1.5 rounded-lg border flex items-center justify-center gap-1 ${
            dispatchComplete ? 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold' : 'bg-slate-50 text-slate-700 border-slate-200'
          }`}>
            <Send className="w-3 h-3 text-emerald-600 shrink-0" />
            <span>5. Reply & Update</span>
          </div>
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
            <p className="text-slate-600 mt-1 leading-relaxed text-[11px]">
              {educationClassification.reasoning}
            </p>
          </div>
        </div>

        {/* Below Bachelor Policy Enforcer Toggle */}
        {isBelowBachelor && (
          <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-2xs space-y-2">
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

        {/* Auto Running Progress Indicator */}
        {autoRunning && autoStep && (
          <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl flex items-center space-x-2 text-xs text-sky-900 animate-pulse">
            <Cpu className="w-4 h-4 text-sky-600 animate-spin" />
            <span className="font-semibold">{autoStep}</span>
          </div>
        )}
      </div>

      {/* Action Buttons Row */}
      <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/60">
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Open In-App CV & OCR Viewer */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => onOpenCvModal(details)}
            className="bg-white text-xs font-semibold shadow-2xs cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 mr-1.5 text-sky-600" />
            View Resume & OCR
          </Button>

          {/* Copy Extracted CV Text Button */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopyResumeText}
            className="bg-white text-xs font-semibold shadow-2xs cursor-pointer"
          >
            {copiedText ? (
              <>
                <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                Text Copied
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                Copy CV Text
              </>
            )}
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

        <div className="flex flex-wrap items-center gap-2">
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
                  className="text-xs cursor-pointer"
                >
                  Override & Reply Anyway
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePrepareRejectionNotice}
                  className="bg-white text-xs font-semibold border-amber-300 text-amber-800 hover:bg-amber-50 cursor-pointer"
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
                className="bg-white text-slate-700 text-xs font-semibold shadow-2xs border-slate-300 hover:bg-slate-50 cursor-pointer"
              >
                <Globe className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                Run Browser Agent
              </Button>

              {/* 1-Click Complete Auto-Pilot */}
              <Button
                size="sm"
                variant="primary"
                onClick={handleOneClickAutoPipeline}
                disabled={autoRunning}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 mr-1.5" />
                {autoRunning ? 'Running Pipeline...' : '⚡ 1-Click Auto-Ingest & Reply'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
