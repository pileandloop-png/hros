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
  HelpCircle
} from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { sendHrEmail, transitionApplicationStage } from '../../services/api';
import {
  extractCvTextFromFile,
  parseCvData,
  calculateScreeningMatch,
  generateInitialCandidateEmail,
  ParsedCvData,
  ScreeningAnalysis
} from '../../services/cvAnalysisService';

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

  // 1-Click Initial Email Composer State
  const [showEmailDraft, setShowEmailDraft] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

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

      // Also set CV URL to object URL if PDF
      if (file.type.includes('pdf')) {
        const objUrl = URL.createObjectURL(file);
        setCvUrl(objUrl);
        setExternalUrlInput(objUrl);
      }

      toast.success(`CV parsed successfully! Fit Score: ${computed.matchRatio}%`);
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
    toast.success(`Screening ratio recalculated: ${computed.matchRatio}% (${computed.grade})`);
  };

  // 1-Click Generate Initial Email
  const handleGenerateInitialEmail = () => {
    const draft = generateInitialCandidateEmail(
      candidate?.fullName || 'Candidate',
      application?.positionAppliedFor || 'Position',
      analysis
    );
    setEmailSubject(draft.subject);
    setEmailBody(draft.body);
    setShowEmailDraft(true);
    toast.info('Initial candidate email draft generated from screening analysis.');
  };

  // 1-Click Send Initial Email via cPanel SMTP
  const handleSendInitialEmail = async () => {
    if (!candidate?.personalEmail) {
      toast.error('Candidate email address is missing');
      return;
    }

    setSendingEmail(true);
    try {
      await sendHrEmail({
        to: candidate.personalEmail,
        subject: emailSubject,
        htmlBody: `<div style="font-family: sans-serif; font-size: 14px; line-height: 1.6; color: #1e293b;">${emailBody.replace(/\n/g, '<br/>')}</div>`,
        textBody: emailBody,
        candidateId: candidate.candidateId,
        applicationId: application?.applicationId,
        idempotencyKey: `initial_email_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      });

      // Automatically transition application stage to INITIAL_EMAIL_SENT
      if (application?.applicationId) {
        await transitionApplicationStage(
          application.applicationId,
          'INITIAL_EMAIL_SENT',
          'Initial screening email dispatched via cPanel SMTP'
        );
        if (onStageUpdated) onStageUpdated();
      }

      toast.success(`Initial email sent to ${candidate.personalEmail} via hr@pileandloop.com!`);
      setShowEmailDraft(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to send initial email');
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="space-y-6">
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
                  In-App CV Reader & Screening Ratio Engine
                </h3>
                <p className="text-[11px] text-slate-500">
                  Read applicant CV within the app, review Indeed profiles, check fit score, and send initial emails.
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

            <Button
              size="sm"
              onClick={handleGenerateInitialEmail}
              className="bg-sky-600 hover:bg-sky-700 text-white font-semibold"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              1-Click AI Initial Email
            </Button>
          </div>
        </div>

        {/* AI Screening Ratio Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
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

          {/* Recommendation Verdict */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 md:col-span-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              AI Recommendation
            </span>
            <p className="text-xs font-semibold text-slate-800 mt-1">
              {analysis.verdictLabel}
            </p>
            <div className="flex items-center space-x-2 mt-1.5">
              <span className="text-[10px] text-slate-500">Position Target:</span>
              <Badge variant="info">{application?.positionAppliedFor || 'Internship'}</Badge>
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
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800">
                Candidate CV Preview: {candidate?.fullName}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                Source: {application?.source || 'Direct Application'}
              </span>
            </div>

            {/* Document Content View */}
            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200/80 font-sans space-y-4 max-h-[500px] overflow-y-auto">
              <div className="border-b border-slate-200 pb-3">
                <h4 className="text-lg font-bold text-slate-900">{candidate?.fullName}</h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  {candidate?.personalEmail} • {candidate?.phone || 'No phone'} • {candidate?.city || 'Remote'}
                </p>
              </div>

              <div>
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Role Applied For
                </h5>
                <p className="text-xs font-semibold text-slate-800">
                  {application?.positionAppliedFor || 'Software Engineer Intern'}
                </p>
              </div>

              <div>
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Extracted Resume Content
                </h5>
                <div className="bg-white p-4 rounded-lg border border-slate-200 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap font-mono text-[11px]">
                  {rawText}
                </div>
              </div>

              {/* Suggested Interview Questions based on CV */}
              <div className="bg-sky-50/70 p-4 rounded-lg border border-sky-200/70 space-y-2">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-sky-900">
                  <HelpCircle className="w-3.5 h-3.5 text-sky-600" />
                  <span>AI Suggested Screening Questions for this Candidate</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-xs text-sky-800">
                  {analysis.suggestedInterviewQuestions.map((q, qIdx) => (
                    <li key={qIdx}>{q}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeMode === 'BROWSER' && (
          <div className="w-full h-[600px] relative bg-slate-100 flex flex-col">
            <div className="p-2 bg-slate-800 text-white flex items-center justify-between text-xs px-4">
              <div className="flex items-center space-x-2 truncate">
                <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate font-mono text-[11px] text-slate-300">{cvUrl}</span>
              </div>
              <a
                href={cvUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-400 hover:underline flex items-center space-x-1 shrink-0 ml-4"
              >
                <span>Open in Full Browser</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <iframe
              src={cvUrl}
              title="In-App CV / Indeed Viewer"
              className="w-full flex-1 border-none bg-white"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          </div>
        )}

        {activeMode === 'TEXT_OCR' && (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-800">Raw OCR Extracted Text</h4>
                <p className="text-[11px] text-slate-400">You can edit or paste raw resume text here to update screening</p>
              </div>
              <Button size="sm" variant="secondary" onClick={handleRecalculateScreening}>
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                Re-Analyze Text
              </Button>
            </div>

            <textarea
              rows={12}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              className="w-full p-3 border border-slate-200 rounded-lg text-xs font-mono bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="Paste or edit resume text..."
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
                1-Click Initial Screening Email (Auto-Generated from CV)
              </h4>
            </div>
            <Badge variant="info">Ready to Dispatch via hr@pileandloop.com</Badge>
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
                rows={8}
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                className="w-full text-xs p-3 border border-slate-200 rounded-lg font-sans leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-400">
                Recipient: <strong>{candidate?.personalEmail}</strong> • Sender: <strong>hr@pileandloop.com</strong>
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
