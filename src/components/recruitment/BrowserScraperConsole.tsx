import React, { useState } from 'react';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import {
  Globe,
  Play,
  Terminal,
  Sparkles,
  FileText,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Cpu,
  Mail,
  Copy,
  Check,
  RefreshCw,
  Settings2,
  Code2
} from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import {
  runSimulatedBrowserExtraction,
  generate5ScreeningQuestions,
  generateInitial5QuestionsEmail,
  BrowserScrapeResult,
  ScreeningQuestionItem
} from '../../services/cvAnalysisService';
import { store } from '../../services/store';

export const BrowserScraperConsole: React.FC = () => {
  const { toast } = useToast();

  const [targetUrl, setTargetUrl] = useState('https://employers.indeed.com/c#candidates/view?id=ind-shiza-tariq');
  const [candidateName, setCandidateName] = useState('Shiza Tariq');
  const [targetRole, setTargetRole] = useState('Growth & Content Intern');
  const [browserEngine, setBrowserEngine] = useState<'playwright' | 'browser-use' | 'stagehand'>('playwright');
  const [headlessMode, setHeadlessMode] = useState(true);

  // Execution state
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<BrowserScrapeResult | null>(null);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [generatedQuestions, setGeneratedQuestions] = useState<ScreeningQuestionItem[]>([]);
  const [generatedEmailDraft, setGeneratedEmailDraft] = useState<{ subject: string; body: string } | null>(null);
  const [copiedText, setCopiedText] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('http://localhost:8000/api/scrape-cv');

  // Quick preset candidates
  const PRESET_APPLICANTS = [
    {
      name: 'Shiza Tariq',
      role: 'Growth & Content Intern',
      url: 'https://employers.indeed.com/c#candidates/view?id=ind-shiza-tariq',
      edu: 'BS English (PU)'
    },
    {
      name: 'Bilal Khan',
      role: 'Full-Stack Developer Intern',
      url: 'https://employers.indeed.com/c#candidates/view?id=ind-bilal-khan',
      edu: 'BS CS (COMSATS)'
    },
    {
      name: 'Hamza Farooq',
      role: 'Full-Stack Developer Intern',
      url: 'https://employers.indeed.com/c#candidates/view?id=ind-hamza-farooq',
      edu: 'DAE Electronics (Below Bachelor)'
    },
    {
      name: 'Ayesha Siddiqui',
      role: 'UI/UX Design Intern',
      url: 'https://employers.indeed.com/c#candidates/view?id=ind-ayesha-siddiqui',
      edu: 'BS Design (PU CAD)'
    }
  ];

  const handleRunBrowserAgent = async () => {
    setIsRunning(true);
    setTerminalLogs([
      `[${new Date().toLocaleTimeString()}] Initializing Autonomous Browser Agent...`,
      `[${new Date().toLocaleTimeString()}] Engine: ${browserEngine.toUpperCase()} (Headless: ${headlessMode ? 'ENABLED' : 'DISABLED'})`,
      `[${new Date().toLocaleTimeString()}] Target Candidate: ${candidateName} (${targetRole})`,
      `[${new Date().toLocaleTimeString()}] Target URL: ${targetUrl}`
    ]);

    try {
      const res = await runSimulatedBrowserExtraction(targetUrl, candidateName);
      setResult(res);
      setTerminalLogs(res.executionLogs);

      // Automatically generate 5 AI Screening Questions based on the extracted resume & role
      const questions = generate5ScreeningQuestions(
        {
          extractedText: res.extractedRawText,
          skillsFound: res.skillsFound,
          education: [res.educationClassification.highestDegreeFound],
          educationClassification: res.educationClassification,
          experienceYears: res.experienceYears,
          portfolioUrls: []
        },
        targetRole,
        '',
        res.skillsFound
      );
      setGeneratedQuestions(questions);

      const emailDraft = generateInitial5QuestionsEmail(candidateName, targetRole, questions, 'Pile & Loop');
      setGeneratedEmailDraft(emailDraft);

      // Save/update applicant into store
      const autoId = `app-browser-${Date.now().toString(36)}`;
      store.setDocument('applications', autoId, {
        applicationId: autoId,
        id: autoId,
        candidateId: `cand-${candidateName.toLowerCase().replace(/\s+/g, '-')}`,
        positionAppliedFor: targetRole,
        source: 'Indeed (Browser-Use)',
        sourcedPlatform: 'Indeed',
        currentStage: res.educationClassification.isBelowBachelor ? 'DISQUALIFIED' : 'NEW_APPLICATION',
        yearsOfExperience: res.experienceYears,
        education: res.educationClassification.highestDegreeFound,
        aiFitScore: res.educationClassification.isBelowBachelor ? 35 : 92,
        aiFitRecommendation: res.educationClassification.isBelowBachelor ? 'UNDER_QUALIFIED' : 'BEST_FIT',
        aiFitReasoning: res.educationClassification.reasoning,
        screeningQuestionsAndAnswers: questions.map(q => ({
          question: q.question,
          answer: 'Awaiting candidate email response to 5 questions',
          passed: false
        })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, true);

      if (res.educationClassification.isBelowBachelor) {
        toast.warning(`⚠️ Below Bachelor credential detected: ${res.educationClassification.highestDegreeFound}. Auto-reply suppressed.`);
      } else {
        toast.success(`✅ Browser Agent successfully extracted CV & generated 5 screening questions!`);
      }
    } catch (err: any) {
      toast.error(`Browser Agent error: ${err?.message || 'Failed to extract CV'}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleCopyExtractedText = () => {
    if (!result?.extractedRawText) return;
    navigator.clipboard.writeText(result.extractedRawText);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
    toast.success('Extracted CV text copied to clipboard!');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Hero Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <Globe className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Autonomous Browser Agent &amp; CV Extractor
            </h1>
            <Badge variant="success">Playwright / Browser-Use 2.0</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1.5 max-w-2xl leading-relaxed">
            Headless browser agent that navigates to Indeed candidate profiles, extracts full resume text and contact data, enforces the <strong>strict Bachelor+ education gatekeeper</strong>, and automatically generates <strong>5 tailored AI screening questions</strong>.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowConfig(!showConfig)}
            className="text-xs font-semibold"
          >
            <Settings2 className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
            {showConfig ? 'Hide Config' : 'Bridge Config'}
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleRunBrowserAgent}
            disabled={isRunning || !targetUrl}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs"
          >
            {isRunning ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Executing Agent...
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />
                Run Browser Agent
              </>
            )}
          </Button>
        </div>
      </div>

      {/* External Bridge Config Drawer */}
      {showConfig && (
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
              <Code2 className="w-4 h-4 text-emerald-600" />
              External Python browser-use / Playwright Bridge
            </h4>
            <span className="text-[10px] text-slate-400 font-mono">POST /api/scrape-cv</span>
          </div>
          <p className="text-slate-600 text-[11px]">
            If you run a local Python <code>browser-use</code> agent or Playwright microservice, configure the webhook endpoint below. The system automatically pipes extracted resume tokens into the ATS evaluation pipeline.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono text-xs focus:ring-2 focus:ring-emerald-500"
              placeholder="http://localhost:8000/api/scrape-cv"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => toast.success('Webhook bridge endpoint saved successfully!')}
            >
              Save Endpoint
            </Button>
          </div>
        </div>
      )}

      {/* Control Panel Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Input Target & Presets */}
        <div className="lg:col-span-1 space-y-5">
          {/* Preset Inbound Candidates */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Recent Indeed Inbound Candidates
            </h3>
            <div className="space-y-2">
              {PRESET_APPLICANTS.map((app, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setCandidateName(app.name);
                    setTargetRole(app.role);
                    setTargetUrl(app.url);
                  }}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                    targetUrl === app.url
                      ? 'border-emerald-500 bg-emerald-50/50 shadow-2xs'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{app.name}</span>
                    <Badge variant={app.edu.includes('Below') ? 'warning' : 'success'}>
                      {app.edu.includes('Below') ? '⚠️ Below Bachelor' : '✅ Bachelor+'}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1">{app.role}</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">{app.url}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Manual URL Input & Browser Controls */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Scraper Target Parameters
            </h3>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Candidate Name
              </label>
              <input
                type="text"
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                placeholder="Candidate Full Name"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Position Applied For
              </label>
              <input
                type="text"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                placeholder="Target Job Opening"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Indeed Resume / Profile URL
              </label>
              <input
                type="text"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                placeholder="https://employers.indeed.com/c#candidates/view?id=..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Engine
                </label>
                <select
                  value={browserEngine}
                  onChange={(e: any) => setBrowserEngine(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                >
                  <option value="playwright">Playwright</option>
                  <option value="browser-use">browser-use (Python)</option>
                  <option value="stagehand">Stagehand</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Execution Mode
                </label>
                <label className="flex items-center space-x-2 mt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={headlessMode}
                    onChange={(e) => setHeadlessMode(e.target.checked)}
                    className="w-3.5 h-3.5 text-emerald-600 rounded border-slate-300"
                  />
                  <span className="text-xs text-slate-700 font-medium">Headless</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Execution Terminal & Output */}
        <div className="lg:col-span-2 space-y-5">
          {/* Terminal Logs Window */}
          <div className="bg-slate-950 text-slate-200 rounded-2xl border border-slate-800 shadow-md overflow-hidden flex flex-col h-64">
            <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                <span className="ml-2 text-[11px] font-mono text-slate-400 flex items-center gap-1">
                  <Terminal className="w-3 h-3 text-emerald-400" />
                  browser-agent-session-01.log
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">
                {isRunning ? '● RUNNING' : terminalLogs.length > 0 ? '● FINISHED' : '● IDLE'}
              </span>
            </div>

            <div className="p-3.5 flex-1 overflow-y-auto font-mono text-xs space-y-1 select-text scrollbar-thin">
              {terminalLogs.length === 0 ? (
                <div className="text-slate-600 text-xs italic py-8 text-center">
                  Ready. Click &quot;Run Browser Agent&quot; to initiate headless Playwright scraping.
                </div>
              ) : (
                terminalLogs.map((log, idx) => (
                  <div key={idx} className="leading-relaxed text-slate-300 text-[11px]">
                    {log.includes('Below Bachelor') ? (
                      <span className="text-amber-400 font-semibold">{log}</span>
                    ) : log.includes('Executing Education Gatekeeper') || log.includes('Education Verdict') ? (
                      <span className="text-emerald-400 font-semibold">{log}</span>
                    ) : (
                      log
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Results: Education Gatekeeper & Extracted CV */}
          {result && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-5">
              {/* Education Classifier Verdict Card */}
              <div
                className={`p-4 rounded-xl border flex items-start gap-3.5 ${
                  result.educationClassification.isBelowBachelor
                    ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                    : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                }`}
              >
                <span
                  className={`p-2 rounded-lg shrink-0 ${
                    result.educationClassification.isBelowBachelor
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {result.educationClassification.isBelowBachelor ? (
                    <AlertTriangle className="w-5 h-5" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5" />
                  )}
                </span>
                <div className="flex-1 text-xs">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm">
                      {result.educationClassification.isBelowBachelor
                        ? 'Below Bachelor Filter Active (Auto-Skip Enforced)'
                        : 'Degree Qualified (Bachelor or Higher Verified)'}
                    </h4>
                    <Badge variant={result.educationClassification.isBelowBachelor ? 'warning' : 'success'}>
                      {result.educationClassification.highestDegreeFound}
                    </Badge>
                  </div>
                  <p className="mt-1 leading-relaxed opacity-90">
                    {result.educationClassification.reasoning}
                  </p>
                </div>
              </div>

              {/* Extracted Text & Skills */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    Clean Parsed Resume Content ({result.extractedRawText.length} chars)
                  </h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyExtractedText}
                    className="text-[11px] h-7"
                  >
                    {copiedText ? <Check className="w-3 h-3 mr-1 text-emerald-600" /> : <Copy className="w-3 h-3 mr-1" />}
                    {copiedText ? 'Copied' : 'Copy Clean Text'}
                  </Button>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 font-mono text-[11px] text-slate-700 max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                  {result.extractedRawText}
                </div>
              </div>

              {/* 5 AI Generated Screening Questions */}
              {generatedQuestions.length > 0 && (
                <div className="pt-2 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        5 Tailored AI Screening Questions Generated
                      </h4>
                    </div>
                    <Badge variant="info">5 Questions Ready</Badge>
                  </div>

                  <div className="space-y-2">
                    {generatedQuestions.map((q) => (
                      <div
                        key={q.id}
                        className="p-3 bg-slate-50/70 border border-slate-200 rounded-xl text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          <span>Question {q.id} • {q.categoryLabel}</span>
                          <span className="text-slate-400 font-normal">Score: 1-5 pts</span>
                        </div>
                        <p className="text-slate-900 font-medium leading-relaxed">
                          {q.question}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* 1-Click Initial Reply Dispatch */}
                  {generatedEmailDraft && (
                    <div className="pt-2 flex items-center justify-between gap-3">
                      <p className="text-[11px] text-slate-500">
                        {result.educationClassification.isBelowBachelor
                          ? 'Auto-reply is suppressed due to Below Bachelor policy. You may manually review or draft an educational notice.'
                          : 'Email reply template ready with the 5 questions formatted for 1-click candidate dispatch.'}
                      </p>

                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => {
                          toast.success(`Dispatched 5 screening questions email to ${result.contactEmail || candidateName}!`);
                        }}
                        disabled={result.educationClassification.isBelowBachelor}
                        className="bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shrink-0 shadow-xs"
                      >
                        <Mail className="w-3.5 h-3.5 mr-1.5" />
                        Dispatch 5 Questions Email
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
