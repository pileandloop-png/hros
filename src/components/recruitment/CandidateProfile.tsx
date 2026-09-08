import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, orderBy, addDoc, serverTimestamp, limit } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { transitionApplicationStage, sendHrEmail, generateHrEmailDraft } from '../../services/api';
import { Application, Candidate, ApplicationStage } from '../../types/recruitment';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import {
  Briefcase,
  Mail,
  Phone,
  MapPin,
  Sparkles,
  Send,
  Lock,
  ExternalLink,
  ChevronLeft
} from 'lucide-react';

export const CandidateProfile: React.FC = () => {
  const { candidateId } = useParams<{ candidateId: string }>();
  const [searchParams] = useSearchParams();
  const appIdParam = searchParams.get('appId');
  const navigate = useNavigate();
  const { user, profile, canViewCNIC, canMakeHiringDecisions, canSendEmail } = useAuth();

  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [stageHistory, setStageHistory] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [emailThreads, setEmailThreads] = useState<any[]>([]);
  const [onboardingCase, setOnboardingCase] = useState<any>(null);
  const [interviews, setInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'APPLICATION' | 'DOCUMENTS' | 'SCREENING' | 'COMMUNICATION' | 'INTERVIEW' | 'ONBOARDING' | 'NOTES' | 'HISTORY' | 'OTHER_APPS'>('OVERVIEW');

  // New Note
  const [noteContent, setNoteContent] = useState('');
  const [noteType, setNoteType] = useState<'HR_NOTE' | 'SUPERVISOR_NOTE' | 'INTERVIEW_NOTE' | 'SCREENING_NOTE'>('HR_NOTE');
  const [noteLoading, setNoteLoading] = useState(false);

  // Email Composer / AI Draft
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [aiInstruction, setAiInstruction] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [aiWarnings, setAiWarnings] = useState<string[]>([]);

  // Stage change modal
  const [stageModalOpen, setStageModalOpen] = useState(false);
  const [newStageSelected, setNewStageSelected] = useState<ApplicationStage>('INITIAL_EMAIL_SENT');
  const [stageChangeReason, setStageChangeReason] = useState('');
  const [stageLoading, setStageLoading] = useState(false);

  const loadAllCandidateData = async () => {
    if (!candidateId) return;
    setLoading(true);
    try {
      const candSnap = await getDoc(doc(db, 'candidates', candidateId));
      if (candSnap.exists()) {
        setCandidate({ candidateId: candSnap.id, ...candSnap.data() } as Candidate);
      }

      const appsSnap = await getDocs(query(collection(db, 'applications'), where('candidateId', '==', candidateId)));
      const appsList = appsSnap.docs.map(d => ({ applicationId: d.id, ...d.data() } as Application));
      setApplications(appsList);

      const currentApp = (appIdParam && appsList.find(a => a.applicationId === appIdParam)) || appsList[0] || null;
      setSelectedApp(currentApp);

      if (currentApp) {
        const histSnap = await getDocs(query(collection(db, 'applications', currentApp.applicationId, 'stageHistory'), orderBy('changedAt', 'desc')));
        setStageHistory(histSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        const onbSnap = await getDocs(query(collection(db, 'onboardingCases'), where('applicationId', '==', currentApp.applicationId), limit(1)));
        if (!onbSnap.empty) {
          setOnboardingCase({ id: onbSnap.docs[0].id, ...onbSnap.docs[0].data() });
        }

        const intSnap = await getDocs(query(collection(db, 'interviews'), where('applicationId', '==', currentApp.applicationId)));
        setInterviews(intSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      }

      const notesSnap = await getDocs(query(collection(db, 'candidateNotes'), where('candidateId', '==', candidateId), orderBy('createdAt', 'desc')));
      setNotes(notesSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const emailSnap = await getDocs(query(collection(db, 'emailThreads'), where('candidateId', '==', candidateId)));
      setEmailThreads(emailSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Error loading candidate profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllCandidateData();
  }, [candidateId, appIdParam]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim() || !candidateId) return;
    setNoteLoading(true);
    try {
      await addDoc(collection(db, 'candidateNotes'), {
        candidateId,
        applicationId: selectedApp?.applicationId || null,
        type: noteType,
        content: noteContent,
        authorUid: user?.uid,
        authorName: profile?.displayName || user?.email,
        authorRole: profile?.role,
        createdAt: serverTimestamp(),
      });
      setNoteContent('');
      const notesSnap = await getDocs(query(collection(db, 'candidateNotes'), where('candidateId', '==', candidateId), orderBy('createdAt', 'desc')));
      setNotes(notesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } finally {
      setNoteLoading(false);
    }
  };

  const handleStageChange = async () => {
    if (!selectedApp) return;
    setStageLoading(true);
    try {
      await transitionApplicationStage(selectedApp.applicationId, newStageSelected, stageChangeReason);
      setStageModalOpen(false);
      setStageChangeReason('');
      loadAllCandidateData();
    } catch (err: any) {
      alert(err.message || 'Stage transition failed');
    } finally {
      setStageLoading(false);
    }
  };

  const handleGenerateAiDraft = async () => {
    setAiLoading(true);
    setAiWarnings([]);
    try {
      const res: any = await generateHrEmailDraft({
        candidateId,
        applicationId: selectedApp?.applicationId,
        userInstruction: aiInstruction || 'Draft an encouraging screening reply asking for availability.',
        draftType: selectedApp?.currentStage || 'GENERAL',
      });
      if (res.draft) {
        setEmailSubject(res.draft.subject || emailSubject);
        setEmailBody(res.draft.body || '');
        if (res.draft.warnings && res.draft.warnings.length > 0) {
          setAiWarnings(res.draft.warnings);
        }
      }
    } catch (err: any) {
      alert(err.message || 'AI generation failed');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidate?.personalEmail || !emailSubject || !emailBody) {
      alert('Email, subject, and body are required.');
      return;
    }
    setSendingEmail(true);
    try {
      await sendHrEmail({
        to: candidate.personalEmail,
        subject: emailSubject,
        htmlBody: `<div style="font-family: sans-serif; font-size: 14px; line-height: 1.6; color: #1e293b;">${emailBody.replace(/\n/g, '<br/>')}</div>`,
        textBody: emailBody,
        candidateId,
        applicationId: selectedApp?.applicationId,
        idempotencyKey: `send_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      });
      setEmailModalOpen(false);
      setEmailSubject('');
      setEmailBody('');
      alert('Email sent successfully via cPanel SMTP.');
      loadAllCandidateData();
    } catch (err: any) {
      alert(err.message || 'Failed to send email');
    } finally {
      setSendingEmail(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500 text-xs">Loading 360? Candidate Profile...</div>;
  }

  if (!candidate) {
    return <div className="p-8 text-center text-slate-500 text-xs">Candidate record not found.</div>;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <button
        onClick={() => navigate('/recruitment/applications')}
        className="text-xs text-slate-500 hover:text-slate-900 flex items-center space-x-1 cursor-pointer"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>Back to Applications Table</span>
      </button>

      {/* 360? Candidate Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start space-x-4">
            <div className="w-14 h-14 rounded-xl bg-slate-900 text-white font-bold text-xl flex items-center justify-center shrink-0">
              {candidate.fullName ? candidate.fullName[0].toUpperCase() : 'C'}
            </div>
            <div>
              <div className="flex items-center space-x-3">
                <h2 className="text-xl font-bold text-slate-900">{candidate.fullName}</h2>
                {selectedApp && (
                  <Badge variant={selectedApp.currentStage.includes('SELECTED') ? 'success' : selectedApp.currentStage.includes('NOT') ? 'danger' : 'info'}>
                    {selectedApp.currentStage}
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 mt-2">
                <span className="flex items-center">
                  <Briefcase className="w-3.5 h-3.5 mr-1 text-slate-400" />
                  {selectedApp?.positionAppliedFor || 'Internship'}
                </span>
                <span className="flex items-center font-mono">
                  <Mail className="w-3.5 h-3.5 mr-1 text-slate-400" />
                  {candidate.personalEmail}
                </span>
                {candidate.phone && (
                  <span className="flex items-center font-mono">
                    <Phone className="w-3.5 h-3.5 mr-1 text-slate-400" />
                    {candidate.phone}
                  </span>
                )}
                {candidate.city && (
                  <span className="flex items-center">
                    <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400" />
                    {candidate.city}
                  </span>
                )}
                <span className="text-[11px] text-slate-400 font-mono">
                  App ID: {selectedApp?.legacyApplicationId || selectedApp?.applicationId?.slice(0, 8)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canSendEmail && (
              <Button size="sm" onClick={() => {
                setEmailSubject(`Pile & Loop Application: ${selectedApp?.positionAppliedFor || 'Internship'}`);
                setEmailModalOpen(true);
              }}>
                <Mail className="w-3.5 h-3.5 mr-1.5" />
                Send Email
              </Button>
            )}

            <Button size="sm" variant="secondary" onClick={() => {
              setEmailSubject(`Pile & Loop: Follow-up on your application`);
              setEmailModalOpen(true);
              handleGenerateAiDraft();
            }}>
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-sky-600" />
              AI Reply Draft
            </Button>

            <Button size="sm" variant="outline" onClick={() => setStageModalOpen(true)}>
              Change Stage
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 flex space-x-6 text-xs font-medium overflow-x-auto">
        {[
          { id: 'OVERVIEW', label: 'Overview' },
          { id: 'APPLICATION', label: 'Application' },
          { id: 'DOCUMENTS', label: 'CV & Documents' },
          { id: 'SCREENING', label: 'Screening' },
          { id: 'COMMUNICATION', label: `Emails (${emailThreads.length})` },
          { id: 'INTERVIEW', label: `Interviews (${interviews.length})` },
          { id: 'ONBOARDING', label: 'Onboarding' },
          { id: 'NOTES', label: `HR Notes (${notes.length})` },
          { id: 'HISTORY', label: 'Activity Timeline' },
          { id: 'OTHER_APPS', label: `Past Apps (${applications.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-sky-600 text-sky-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Panels */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs min-h-[350px]">
        {activeTab === 'OVERVIEW' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Key Candidate Factor</span>
                <p className="text-xs text-slate-800 font-medium mt-1">
                  {selectedApp?.keyCandidateFactor || candidate.rawLegacyData?.['Key Candidate Factor'] || 'No specific factor recorded.'}
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Previous Education</span>
                <p className="text-xs text-slate-800 font-medium mt-1">
                  {candidate.education || candidate.rawLegacyData?.['Previous Education'] || 'Not specified'}
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Application Source</span>
                <p className="text-xs text-slate-800 font-medium mt-1">
                  {selectedApp?.source || candidate.rawLegacyData?.['CV / Application Source'] || 'Indeed'}
                </p>
              </div>
            </div>

            {candidate.cvLink && (
              <div className="p-4 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-between text-xs">
                <div>
                  <h4 className="font-semibold text-sky-900">Curriculum Vitae / Resume Attached</h4>
                  <p className="text-sky-700 text-[11px] mt-0.5 font-mono">{candidate.cvLink}</p>
                </div>
                <a
                  href={candidate.cvLink}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-white text-sky-700 font-medium rounded-md border border-sky-200 hover:bg-sky-100 transition-colors flex items-center space-x-1"
                >
                  <span>Open CV Link</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>
        )}

        {activeTab === 'APPLICATION' && (
          <div className="space-y-4 text-xs">
            <h3 className="text-sm font-bold text-slate-900">Application Parameters</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-slate-400">Position Applied For:</span>
                <p className="font-semibold text-slate-800">{selectedApp?.positionAppliedFor}</p>
              </div>
              <div>
                <span className="text-slate-400">Current Stage:</span>
                <p className="font-semibold text-slate-800">{selectedApp?.currentStage}</p>
              </div>
              <div>
                <span className="text-slate-400">Follow-up Status:</span>
                <p className="font-semibold text-slate-800">{selectedApp?.followUpStatus || 'None'}</p>
              </div>
              <div>
                <span className="text-slate-400">First Email Sent By:</span>
                <p className="font-semibold text-slate-800">{selectedApp?.firstEmailSentBy || '?'}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'DOCUMENTS' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Candidate Documents</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 border rounded-lg border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <h5 className="text-xs font-semibold text-slate-800">CNIC Government ID</h5>
                  <span className="text-[11px] text-slate-500">Sensitive Identity Document</span>
                </div>
                {canViewCNIC ? (
                  <Badge variant="success">Authorized</Badge>
                ) : (
                  <div className="flex items-center space-x-1 text-rose-600 text-[11px] font-medium">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Restricted</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'SCREENING' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Screening Status</h3>
            <p className="text-xs text-slate-600">Stage: {selectedApp?.currentStage}</p>
          </div>
        )}

        {activeTab === 'COMMUNICATION' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Email Threads</h3>
              {canSendEmail && (
                <Button size="sm" onClick={() => setEmailModalOpen(true)}>
                  <Send className="w-3.5 h-3.5 mr-1" />
                  New Message
                </Button>
              )}
            </div>
            {emailThreads.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">No emails linked yet.</p>
            ) : (
              <div className="space-y-2">
                {emailThreads.map((thread) => (
                  <div
                    key={thread.id}
                    className="p-3 border rounded-lg border-slate-200 hover:border-slate-300 transition-colors flex justify-between cursor-pointer"
                    onClick={() => navigate(`/inbox?threadId=${thread.id}`)}
                  >
                    <div>
                      <h4 className="text-xs font-semibold text-slate-900">{thread.subject}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">{thread.lastMessageSnippet}</p>
                    </div>
                    <span className="text-[10px] text-slate-400">{thread.messageCount} msgs</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'INTERVIEW' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Interviews</h3>
            {interviews.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">No scheduled interviews.</p>
            ) : (
              interviews.map((int) => (
                <div key={int.id} className="p-3 border rounded-lg flex justify-between">
                  <span>{int.scheduledDate}</span>
                  <Badge variant="info">{int.status}</Badge>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'ONBOARDING' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Onboarding</h3>
            {onboardingCase ? (
              <div className="text-xs">Status: <Badge variant="warning">{onboardingCase.status}</Badge></div>
            ) : (
              <p className="text-xs text-slate-400">Onboarding case not yet created.</p>
            )}
          </div>
        )}

        {activeTab === 'NOTES' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Internal Notes</h3>
            <form onSubmit={handleAddNote} className="space-y-2">
              <textarea
                rows={2}
                required
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Enter internal HR note..."
                className="w-full text-xs p-2 border border-slate-300 rounded-lg"
              />
              <div className="flex justify-end">
                <Button size="sm" type="submit" loading={noteLoading}>Save Note</Button>
              </div>
            </form>
            <div className="divide-y divide-slate-100 text-xs pt-2">
              {notes.map((n) => (
                <div key={n.id} className="py-2">
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>{n.authorName}</span>
                    <span>{n.createdAt?.toDate ? n.createdAt.toDate().toLocaleDateString() : 'Recent'}</span>
                  </div>
                  <p className="mt-1 text-slate-800">{n.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'HISTORY' && (
          <div className="space-y-3 text-xs">
            <h3 className="text-sm font-bold text-slate-900">Stage History</h3>
            {stageHistory.map((hist) => (
              <div key={hist.id} className="p-2.5 bg-slate-50 rounded border">
                <p className="font-semibold">{hist.stage}</p>
                <span className="text-[11px] text-slate-500">{hist.reason}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'OTHER_APPS' && (
          <div className="space-y-2 text-xs">
            <h3 className="text-sm font-bold text-slate-900">Past Applications</h3>
            {applications.map((app) => (
              <div key={app.applicationId} className="p-2 border rounded flex justify-between">
                <span>{app.positionAppliedFor}</span>
                <Badge variant="default">{app.currentStage}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Email Modal */}
      <Modal isOpen={emailModalOpen} onClose={() => setEmailModalOpen(false)} title="Compose Candidate Email" maxWidth="xl">
        <form onSubmit={handleSendEmail} className="space-y-3 text-xs">
          <div className="p-2.5 bg-sky-50 rounded-lg flex space-x-2">
            <input
              type="text"
              value={aiInstruction}
              onChange={(e) => setAiInstruction(e.target.value)}
              placeholder="e.g. Draft polite interview invitation..."
              className="flex-1 text-xs p-1.5 border rounded bg-white"
            />
            <Button size="sm" type="button" variant="secondary" onClick={handleGenerateAiDraft} loading={aiLoading}>
              AI Draft
            </Button>
          </div>

          <div>
            <label className="block text-slate-600 mb-1">To</label>
            <input type="email" disabled value={candidate.personalEmail} className="w-full text-xs p-2 border rounded bg-slate-100 font-mono" />
          </div>

          <div>
            <label className="block text-slate-600 mb-1">Subject *</label>
            <input type="text" required value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} className="w-full text-xs p-2 border rounded" />
          </div>

          <div>
            <label className="block text-slate-600 mb-1">Body *</label>
            <textarea rows={6} required value={emailBody} onChange={(e) => setEmailBody(e.target.value)} className="w-full text-xs p-2 border rounded font-sans" />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <Button size="sm" variant="outline" type="button" onClick={() => setEmailModalOpen(false)}>Cancel</Button>
            <Button size="sm" type="submit" loading={sendingEmail}>Send via SMTP</Button>
          </div>
        </form>
      </Modal>

      {/* Stage Modal */}
      <Modal isOpen={stageModalOpen} onClose={() => setStageModalOpen(false)} title="Change Stage" maxWidth="md">
        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-600 mb-1">Target Stage</label>
            <select value={newStageSelected} onChange={(e) => setNewStageSelected(e.target.value as any)} className="w-full text-xs p-2 border rounded">
              <option value="INITIAL_EMAIL_SENT">Initial Email Sent</option>
              <option value="SCREENING_QUESTIONS_SENT">Screening Questions Sent</option>
              <option value="SCREENING_RESPONSE_RECEIVED">Screening Response Received</option>
              <option value="INTERVIEW_INVITED">Interview Invited</option>
              <option value="INTERVIEW_SCHEDULED">Interview Scheduled</option>
              {canMakeHiringDecisions && (
                <>
                  <option value="SELECTED">SELECTED (Start Onboarding)</option>
                  <option value="NOT_HIRED">NOT_HIRED</option>
                  <option value="DISQUALIFIED">DISQUALIFIED</option>
                </>
              )}
            </select>
          </div>
          <div>
            <label className="block text-slate-600 mb-1">Reason</label>
            <input type="text" value={stageChangeReason} onChange={(e) => setStageChangeReason(e.target.value)} placeholder="Reason for change..." className="w-full text-xs p-2 border rounded" />
          </div>
          <div className="flex justify-end space-x-2 pt-2">
            <Button size="sm" variant="outline" onClick={() => setStageModalOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleStageChange} loading={stageLoading}>Confirm</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
