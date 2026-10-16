import React, { useState } from 'react';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import {
  FileText,
  ExternalLink,
  Sparkles,
  Send,
  Upload,
  CheckCircle2,
  AlertCircle,
  Eye,
  RefreshCw,
  Globe,
  Maximize2,
  Check,
  HelpCircle,
  ShieldAlert,
  GraduationCap
} from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { sendHrEmail, transitionApplicationStage } from '../../services/api';
import {
  extractCvTextFromFile,
  parseCvData,
  calculateScreeningMatch,
  generateInitialCandidateEmail,
  ParsedCvData,
  ScreeningAnalysis,
  DeliverabilityTelemetry
} from '../../services/cvAnalysisService';
import { DeliverabilityCard } from '../email/DeliverabilityCard';

interface InAppCvViewerProps {
  candidate: any;
  application: any;
  onStageUpdated?: () => void;
}

export const InAppCvViewer: React.FC<InAppCvViewerProps> = ({
  candidate,
  application,
  onStageUpdated
}) => {
  const { toast } = useToast();

  // CV / Indeed URL State
  const [cvUrl, setCvUrl] = useState(
    application?.resumeUrl || candidate?.resumeUrl || 'https://www.indeed.com'
  );
  const [externalUrlInput, setExternalUrlInput] = useState(cvUrl);
  const [activeMode, setActiveMode] = useState<'DOCUMENT' | 'BROWSER' | 'TEXT_OCR'>('DOCUMENT');

  // OCR & Parsed CV State
  const [rawText, setRawText] = useState(
    candidate?.notes || application?.coverLetter || `Resume for ${candidate?.fullName || 'Candidate'}\nEmail: ${candidate?.personalEmail || ''}\nPhone: ${candidate?.phone || ''}\nSkills: React, TypeScript, TailwindCSS, Git, Problem Solving, REST APIs\nEducation: BS Computer Science`
  );
  const [parsingLoading, setParsingLoading] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedCvData>(() => parseCvData(rawText));

  // Screening Analysis State
  const defaultRequiredSkills = ['React', 'TypeScript', 'JavaScript', 'HTML/CSS', 'Git'];
  const [analysis, setAnalysis] = useState<ScreeningAnalysis>(() =>
    calculateScreeningMatch(
      parsedData,
      application?.positionAppliedFor || 'Candidate Role',
      defaultRequiredSkills
    )
  );

  // Education Policy State
  const [autoSkipBelowBachelor, setAutoSkipBelowBachelor] = useState<boolean>(
    analysis.educationClassification.isBelowBachelor
  );
  const [manualOverride, setManualOverride] = useState<boolean>(false);

  // 1-Click Initial Email Composer State
  const [showEmailDraft, setShowEmailDraft] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [lastTelemetry, setLastTelemetry] = useState<DeliverabilityTelemetry | null>(null);

  // File Upload Handler with OCR extraction
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsingLoading(true);
    try {
      toast.info(`Extracting content from ${file.name}...`);
      const extracted = await extractCvTextFromFile(file);
      setRawText(extracted);

      const parsed = parseCvData(extracted);
      setParsedData(parsed);

      const computed = calculateScreeningMatch(
        parsed,
        application?.positionAppliedFor || 'Candidate Role',
        defaultRequiredSkills
      );
      setAnalysis(computed);
      setAutoSkipBelowBachelor(computed.educationClassification.isBelowBachelor);
      setManualOverride(false);

      // Also set CV URL to object URL if PDF
      if (file.type.includes('pdf')) {
        const objUrl = URL.createObjectURL(file);
        setCvUrl(objUrl);
        setExternalUrlInput(objUrl);
      }

      toast.success(`CV parsed successfully! Fit Score: ${computed.matchRatio}% (${computed.educationClassification.highestDegreeFound})`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to extract CV text');
    } finally {
      setParsingLoading(false);
    }
  };

  // Re-run Screening with current text
  const handleRecalculateScreening = () => {
    const parsed = parseCvData(rawText);
    setParsedData(parsed);
    const computed = calculateScreeningMatch(
      parsed,
      application?.positionAppliedFor || 'Candidate Role',
      defaultRequiredSkills
    );
    setAnalysis(computed);
    setAutoSkipBelowBachelor(computed.educationClassification.isBelowBachelor);
    toast.success(`Screening ratio recalculated: ${computed.matchRatio}% (${computed.grade})`);
  };

  // 1-Click Generate Initial Email
  const handleGenerateInitialEmail = (forcePoliteRejection: boolean = false) => {
    const isRejection = forcePoliteRejection || (analysis.educationClassification.isBelowBachelor && !manualOverride);
    const draft = generateInitialCandidateEmail(
      candidate?.fullName || 'Candidate',
      application?.positionAppliedFor || 'Position',
      analysis,
      isRejection
    );
    setEmailSubject(draft.subject);
    setEmailBody(draft.body);
    setShowEmailDraft(true);
    toast.info(isRejection ? 'Generated degree requirement notice.' : 'Initial candidate screening email draft generated.');
  };

  // 1-Click Send Initial Email via cPanel SMTP
  const handleSendInitialEmail = async () => {
    const targetEmail = candidate?.personalEmail || candidate?.email;
    if (!targetEmail) {
      toast.error('Candidate email address is missing');
      return;
    }

    setSendingEmail(true);
    try {
      const res = await sendHrEmail({
        to: targetEmail,
        subject: emailSubject,
        htmlBody: `<div style="font-family: sans-serif; font-size: 14px; line-height: 1.6; color: #1e293b;">${emailBody.replace(/\n/g, '<br/>')}</div>`,
        textBody: emailBody,
        candidateId: candidate.candidateId || candidate.id,
        applicationId: application?.applicationId || application?.id,
        idempotencyKey: `initial_email_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      });

      // Save telemetry to render real-time delivery report
      if (res.telemetry) {
        setLastTelemetry(res.telemetry);
      }

      // Automatically transition application stage to INITIAL_EMAIL_SENT
      if (application?.applicationId || application?.id) {
        await transitionApplicationStage(
          application.applicationId || application.id,
          'INITIAL_EMAIL_SENT',
          'Initial email dispatched via cPanel SMTP'
        );
        if (onStageUpdated) onStageUpdated();
      }

      toast.success(`Email dispatched via cPanel SMTP to ${targetEmail}!`);
      setShowEmailDraft(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to send initial email');
    } finally {
      setSendingEmail(false);
    }
  };

  const isBelowBachelor = analysis.educationClassification.isBelowBachelor;

  return (
    <div className="space-y-6">
      {/* Live Deliverability Telemetry Card (Shown when an email was dispatched) */}
      {lastTelemetry && (
        <DeliverabilityCard
          telemetry={lastTelemetry}
          onClose={() => setLastTelemetry(null)}
        />
      )}

      {/* Top Banner: In-App Viewer & Screening Ratio Dashboard */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center space-x-2.5">
              <span className="p-1.5 rounded-lg bg-sky-50 text-sky-600">
                <FileText className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  In-App CV Reader, Indeed OCR & Screening Engine
                </h3>
                <p className="text-[11px] text-slate-500">
                  Read applicant CV within the app, review Indeed profiles, audit education credentials, and send verified responses.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <label className="cursor-pointer inline-flex items-center px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition shadow-2xs">
              <input
                type="file"
                accept=".pdf,.docx,.txt,.html"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Upload className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
              {parsingLoading ? 'Reading CV...' : 'Upload & Read CV'}
            </label>

            {isBelowBachelor && autoSkipBelowBachelor && !manualOverride ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setManualOverride(true);
                  setAutoSkipBelowBachelor(false);
                  handleGenerateInitialEmail(true);
                }}
                className="border-amber-300 text-amber-800 hover:bg-amber-50 font-semibold"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
                Draft Degree Notice (Override)
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => handleGenerateInitialEmail(false)}
                className="bg-sky-600 hover:bg-sky-700 text-white font-semibold"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                1-Click AI Response
              </Button>
            )}
          </div>
        </div>

        {/* AI Screening Ratio Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Fit Score Card */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Screening Match Ratio
              </span>
              <div className="flex items-baseline space-x-1.5 mt-0.5">
                <span className={`text-2xl font-black ${
                  analysis.matchRatio >= 80 ? 'text-emerald-600' : analysis.matchRatio >= 60 ? 'text-amber-600' : 'text-rose-600'
                }`}>
                  {analysis.matchRatio}%
                </span>
                <span className="text-xs font-bold text-slate-500">Grade {analysis.grade}</span>
              </div>
            </div>
            <span className={`w-3 h-3 rounded-full ${
              analysis.matchRatio >= 80 ? 'bg-emerald-500' : analysis.matchRatio >= 60 ? 'bg-amber-500' : 'bg-rose-500'
            }`} />
          </div>

          {/* Education Tier Card */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Education Credential
            </span>
            <div className="flex items-center space-x-1.5 mt-1">
              <GraduationCap className={`w-4 h-4 ${isBelowBachelor ? 'text-rose-500' : 'text-emerald-600'}`} />
              <span className={`text-xs font-bold ${isBelowBachelor ? 'text-rose-600' : 'text-emerald-700'}`}>
                {isBelowBachelor ? 'Below Bachelor' : 'Bachelor+ Qualified'}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 truncate mt-0.5">
              {analysis.educationClassification.highestDegreeFound}
            </p>
          </div>

          {/* Recommendation Verdict */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              AI Recommendation
            </span>
            <p className="text-xs font-semibold text-slate-800 mt-1 truncate">
              {analysis.verdictLabel}
            </p>
            <div className="flex items-center space-x-1.5 mt-1">
              <span className="text-[10px] text-slate-400">Target:</span>
              <Badge variant="info">{application?.positionAppliedFor || 'Role'}</Badge>
            </div>
          </div>

          {/* Matched Skills Count */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Skills Verified
            </span>
            <p className="text-xl font-bold text-slate-800 mt-0.5">
              {analysis.matchedSkills.length} Matched
            </p>
            <p className="text-[10px] text-slate-400">
              {analysis.missingSkills.length} Missing Prerequisites
            </p>
          </div>
        </div>

        {/* Below Bachelor Alert & Policy Toggle Banner */}
        {isBelowBachelor && (
          <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="text-xs font-bold text-amber-900">
                  Below Bachelor Disqualification Detected: {analysis.educationClassification.highestDegreeFound}
                </span>
              </div>
              <Badge variant="warning">Auto-Skip Recommended</Badge>
            </div>

            <p className="text-[11px] text-amber-800 leading-relaxed">
              {analysis.educationClassification.reasoning}
            </p>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1.5 border-t border-amber-200/60">
              <label className="flex items-center space-x-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoSkipBelowBachelor}
                  onChange={(e) => {
                    setAutoSkipBelowBachelor(e.target.checked);
                    if (e.target.checked) setManualOverride(false);
                  }}
                  className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
                />
                <span className="text-xs font-semibold text-amber-950">
                  Do Not Auto-Reply to this candidate (Suppression Filter)
                </span>
              </label>

              <div className="flex items-center space-x-2">
                {autoSkipBelowBachelor && !manualOverride ? (
                  <span className="text-[10px] text-amber-700 font-medium">
                    Email auto-dispatch is locked to protect recruiter time.
                  </span>
                ) : (
                  <span className="text-[10px] text-rose-700 font-bold">
                    Manual override active: Custom notice can be dispatched.
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Matched Skills & Strengths Pills */}
        <div className="pt-2 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-500">Skills Found in CV:</span>
          {analysis.matchedSkills.map((s, idx) => (
            <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Check className="w-3 h-3 mr-1 text-emerald-600" />
              {s}
            </span>
          ))}
          {analysis.missingSkills.map((s, idx) => (
            <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
              <AlertCircle className="w-3 h-3 mr-1 text-rose-500" />
              Missing: {s}
            </span>
          ))}
        </div>
      </div>

      {/* Mode Switcher & URL Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setActiveMode('DOCUMENT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeMode === 'DOCUMENT'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Embedded CV Document
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('BROWSER')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeMode === 'BROWSER'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            In-App Browser / Indeed Link
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('TEXT_OCR')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeMode === 'TEXT_OCR'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            OCR Raw Extracted Text
          </button>
        </div>

        {activeMode === 'BROWSER' && (
          <div className="flex items-center space-x-2 flex-1 max-w-md">
            <input
              type="url"
              value={externalUrlInput}
              onChange={(e) => setExternalUrlInput(e.target.value)}
              placeholder="Paste Indeed applicant URL or LinkedIn link..."
              className="w-full text-xs p-1.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
            <Button size="sm" variant="secondary" onClick={() => setCvUrl(externalUrlInput)}>
              Load
            </Button>
            <a
              href={cvUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg border border-slate-200 hover:bg-slate-50"
              title="Open externally in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
      </div>

      {/* Main Viewer Display Area */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        {activeMode === 'DOCUMENT' && (
          <div className="h-[520px] bg-slate-100 flex flex-col items-center justify-center p-6 text-center">
            {cvUrl && cvUrl.startsWith('blob:') ? (
              <iframe
                src={cvUrl}
                title="CV Document Preview"
                className="w-full h-full rounded border-0"
              />
            ) : (
              <div className="max-w-md space-y-3">
                <FileText className="w-12 h-12 text-slate-400 mx-auto" />
                <h4 className="text-sm font-bold text-slate-700">CV Document Ready for Review</h4>
                <p className="text-xs text-slate-500">
                  You can upload any candidate PDF/DOCX resume using the button above to run OCR and screening.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => setActiveMode('TEXT_OCR')}
                    className="text-xs font-semibold text-sky-600 hover:text-sky-800 underline cursor-pointer"
                  >
                    View Extracted Plain Text & Education Analysis &rarr;
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeMode === 'BROWSER' && (
          <div className="h-[520px] bg-white flex flex-col">
            <div className="p-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600 font-mono">
              <span className="truncate max-w-lg">{cvUrl}</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                Secure In-App Sandbox
              </span>
            </div>
            <iframe
              src={cvUrl}
              title="Indeed In-App Sandbox"
              className="flex-1 w-full border-0"
              sandbox="allow-scripts allow-same-origin allow-forms"
            />
          </div>
        )}

        {activeMode === 'TEXT_OCR' && (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">
                OCR Extracted Document Content
              </span>
              <Button size="sm" variant="outline" onClick={handleRecalculateScreening}>
                <RefreshCw className="w-3.5 h-3.5 mr-1 text-sky-600" />
                Recalculate Fit & Education
              </Button>
            </div>
            <textarea
              rows={16}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              className="w-full text-xs font-mono p-3 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500 leading-relaxed"
            />
          </div>
        )}
      </div>

      {/* 1-Click Initial Email Composer Modal / Accordion */}
      {showEmailDraft && (
        <div className="bg-white rounded-xl border border-sky-200 p-5 shadow-md space-y-4 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-sky-600" />
              <h4 className="text-sm font-bold text-slate-900">
                1-Click Tailored Response Composer
              </h4>
            </div>
            <Badge variant={isBelowBachelor && !manualOverride ? 'warning' : 'info'}>
              {isBelowBachelor && !manualOverride ? 'Degree Prerequisite Notice' : 'Screening Invitation'}
            </Badge>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Subject</label>
              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="w-full text-xs p-2 border border-slate-200 rounded-lg font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Body</label>
              <textarea
                rows={9}
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                className="w-full text-xs p-3 border border-slate-200 rounded-lg font-sans leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-400">
                Recipient: <strong>{candidate?.personalEmail || candidate?.email}</strong> • Sender: <strong>hr@pileandloop.com</strong>
              </span>
              <div className="flex items-center space-x-2">
                <Button size="sm" variant="ghost" onClick={() => setShowEmailDraft(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSendInitialEmail}
                  loading={sendingEmail}
                  className="bg-sky-600 hover:bg-sky-700 text-white font-semibold"
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  Review & Send via cPanel SMTP
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
