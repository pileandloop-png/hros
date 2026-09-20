import React, { useState } from 'react';
import { sendHrEmail, transitionApplicationStage } from '../../services/api';
import { useCompanyProfile } from '../../contexts/CompanyContext';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import {
  Sparkles,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Mail,
  Briefcase,
  Layers,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  Eye
} from 'lucide-react';

export type OutreachTemplateType =
  | 'INITIAL_SCREENING'
  | 'INTERVIEW_INVITE'
  | 'STATUS_UPDATE'
  | 'OFFER_NOTICE'
  | 'POLITE_REJECTION'
  | 'CUSTOM';

interface MassAiOutreachModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedApplications: any[];
  onComplete: () => void;
}

interface DeliveryStatus {
  candidateId: string;
  candidateName: string;
  email: string;
  status: 'QUEUED' | 'SENDING' | 'SENT' | 'FAILED';
  error?: string;
}

export const MassAiOutreachModal: React.FC<MassAiOutreachModalProps> = ({
  isOpen,
  onClose,
  selectedApplications,
  onComplete,
}) => {
  const { company } = useCompanyProfile();
  const toast = useToast();

  const [templateType, setTemplateType] = useState<OutreachTemplateType>('INITIAL_SCREENING');
  const [subjectTemplate, setSubjectTemplate] = useState(
    'Update on your application for {{position}} at {{companyName}}'
  );
  const [bodyTemplate, setBodyTemplate] = useState(`Dear {{candidateName}},

Thank you for your interest in the {{position}} position at {{companyName}}.

We have received and reviewed your application profile. Based on our current project requirements, we would like to invite you to the next step of our screening process.

Could you please confirm your availability for a brief technical and cultural introduction this week? You may also reserve your preferred slot directly using our calendar booking link:
{{interviewUrl}}

Reference Tracking ID: {{trackingId}}

Best regards,
The Talent Acquisition Team
{{companyName}}
hr@pileandloop.com`);

  const [autoAdvanceStage, setAutoAdvanceStage] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [deliveryList, setDeliveryList] = useState<DeliveryStatus[]>([]);
  const [previewIdx, setPreviewIdx] = useState(0);

  // Template switch handler
  const handleTemplateChange = (type: OutreachTemplateType) => {
    setTemplateType(type);
    switch (type) {
      case 'INITIAL_SCREENING':
        setSubjectTemplate('Application Received & Next Steps: {{position}} - {{companyName}}');
        setBodyTemplate(`Dear {{candidateName}},

Thank you for applying for the {{position}} role at {{companyName}}.

Our recruitment team has received your credentials. We were impressed by your background and would like to proceed with an initial screening round.

Please reply to this email with your updated resume, any relevant GitHub/portfolio links, and your earliest possible start date.

Reference Tracking ID: {{trackingId}}

Warm regards,
Talent Acquisition Team
{{companyName}}`);
        break;

      case 'INTERVIEW_INVITE':
        setSubjectTemplate('Interview Invitation: {{position}} at {{companyName}}');
        setBodyTemplate(`Dear {{candidateName}},

Congratulations! Following our initial review, we are pleased to invite you to an interview for the {{position}} role at {{companyName}}.

Please schedule a suitable 30-minute time slot using our appointments calendar:
{{interviewUrl}}

During this session, we will discuss your past projects, problem-solving approach, and answer any questions you have about our culture and workflow.

Reference Tracking ID: {{trackingId}}

Looking forward to speaking with you!

Warm regards,
HR & Recruitment Team
{{companyName}}`);
        break;

      case 'STATUS_UPDATE':
        setSubjectTemplate('Status Update: Application for {{position}} at {{companyName}}');
        setBodyTemplate(`Dear {{candidateName}},

We are writing to provide a status update on your application for {{position}} with {{companyName}}.

Your profile is currently under review with our engineering leadership team. We appreciate your patience while we finalize the candidate evaluations.

You can monitor your real-time application status anytime using your tracking reference:
Reference Tracking ID: {{trackingId}}

Thank you for your continued interest in {{companyName}}.

Best regards,
Human Resources Team
{{companyName}}`);
        break;

      case 'OFFER_NOTICE':
        setSubjectTemplate('Offer Proposal / Next Steps: {{position}} at {{companyName}}');
        setBodyTemplate(`Dear {{candidateName}},

We are thrilled to share positive feedback regarding your evaluation for {{position}} at {{companyName}}!

The team was very impressed by your competence, problem-solving ability, and enthusiasm. We would like to initiate formal offer discussions and provide you with your onboarding roadmap.

Our HR team will follow up shortly with your formal agreement and joining documents.

Congratulations!

Best regards,
Head of People & Culture
{{companyName}}`);
        break;

      case 'POLITE_REJECTION':
        setSubjectTemplate('Update on your application for {{position}} at {{companyName}}');
        setBodyTemplate(`Dear {{candidateName}},

Thank you for taking the time to apply for {{position}} at {{companyName}} and for sharing your experience with us.

After careful evaluation, we have chosen to proceed with candidates whose current skill sets more closely match the specific technical focus required for this cohort.

We were genuinely impressed by your potential and will retain your profile in our talent network for upcoming opportunities that align with your capabilities.

We wish you the very best in your professional journey.

Warm regards,
Recruitment Team
{{companyName}}`);
        break;

      case 'CUSTOM':
      default:
        break;
    }
  };

  const getTargetStageForTemplate = (): string | null => {
    if (!autoAdvanceStage) return null;
    switch (templateType) {
      case 'INITIAL_SCREENING':
        return 'INITIAL_EMAIL_SENT';
      case 'INTERVIEW_INVITE':
        return 'INTERVIEW_INVITED';
      case 'POLITE_REJECTION':
        return 'NOT_HIRED';
      default:
        return null;
    }
  };

  // Variable substitution helper
  const interpolate = (str: string, app: any): string => {
    const candidateName = app.candidate?.fullName || app.fullName || 'Candidate';
    const position = app.positionAppliedFor || app.vacancyTitle || 'Open Position';
    const companyName = company.companyName || 'Pile & Loop';
    const trackingId = app.legacyApplicationId || app.applicationId || app.id || 'PL-2026';
    const interviewUrl =
      (company as any).interviewBookingUrl ||
      'https://calendar.google.com/calendar/u/0/appointments/schedules/pileandloop';

    return str
      .replace(/\{\{candidateName\}\}/g, candidateName)
      .replace(/\{\{position\}\}/g, position)
      .replace(/\{\{companyName\}\}/g, companyName)
      .replace(/\{\{trackingId\}\}/g, trackingId)
      .replace(/\{\{interviewUrl\}\}/g, interviewUrl);
  };

  const activePreviewApp = selectedApplications[previewIdx] || selectedApplications[0] || {};
  const previewSubject = interpolate(subjectTemplate, activePreviewApp);
  const previewBody = interpolate(bodyTemplate, activePreviewApp);

  // 1-Click Mass Dispatch Action
  const handleStartMassDispatch = async () => {
    if (selectedApplications.length === 0) return;

    setIsSending(true);
    setIsCompleted(false);
    setCurrentIndex(0);

    const initialStatusList: DeliveryStatus[] = selectedApplications.map((app) => ({
      candidateId: app.applicationId || app.id,
      candidateName: app.candidate?.fullName || app.fullName || 'Candidate',
      email: app.candidate?.personalEmail || app.email || '',
      status: 'QUEUED',
    }));

    setDeliveryList(initialStatusList);

    const nextStage = getTargetStageForTemplate();

    for (let i = 0; i < selectedApplications.length; i++) {
      setCurrentIndex(i + 1);
      const app = selectedApplications[i];
      const targetEmail = app.candidate?.personalEmail || app.email;
      const candidateName = app.candidate?.fullName || app.fullName || 'Candidate';
      const appId = app.applicationId || app.id;

      // Update state to SENDING
      setDeliveryList((prev) =>
        prev.map((item, idx) => (idx === i ? { ...item, status: 'SENDING' } : item))
      );

      if (!targetEmail) {
        setDeliveryList((prev) =>
          prev.map((item, idx) =>
            idx === i ? { ...item, status: 'FAILED', error: 'No email address found' } : item
          )
        );
        continue;
      }

      const personalSubject = interpolate(subjectTemplate, app);
      const personalBody = interpolate(bodyTemplate, app);
      const htmlBody = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <div style="border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 20px;">
            <h2 style="color: #0f172a; margin: 0; font-size: 18px;">${company.companyName}</h2>
            <p style="color: #64748b; font-size: 12px; margin: 2px 0 0 0;">Talent Acquisition & Human Resources</p>
          </div>
          <div style="color: #334155; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${personalBody}</div>
          <div style="margin-top: 28px; padding-top: 16px; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8;">
            Sent automatically by ${company.companyName} HROS ? hr@pileandloop.com
          </div>
        </div>
      `;

      try {
        await sendHrEmail({
          to: targetEmail,
          subject: personalSubject,
          textBody: personalBody,
          htmlBody,
          candidateId: app.candidateId || appId,
          applicationId: appId,
          idempotencyKey: `mass-${appId}-${Date.now()}`,
        });

        // Stage auto-advance
        if (nextStage) {
          try {
            await transitionApplicationStage(appId, nextStage as any);
          } catch {
            // Non-blocking stage error
          }
        }

        setDeliveryList((prev) =>
          prev.map((item, idx) => (idx === i ? { ...item, status: 'SENT' } : item))
        );
      } catch (err: any) {
        setDeliveryList((prev) =>
          prev.map((item, idx) =>
            idx === i ? { ...item, status: 'FAILED', error: err.message || 'SMTP failed' } : item
          )
        );
      }

      // Small throttling delay between outbound emails
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    setIsSending(false);
    setIsCompleted(true);
    toast.success(
      'Mass Outreach Completed',
      `Processed ${selectedApplications.length} candidates via hr@pileandloop.com.`
    );
  };

  const handleFinish = () => {
    onComplete();
    onClose();
  };

  const sentCount = deliveryList.filter((d) => d.status === 'SENT').length;
  const failedCount = deliveryList.filter((d) => d.status === 'FAILED').length;
  const progressPercent = selectedApplications.length
    ? Math.round((currentIndex / selectedApplications.length) * 100)
    : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSending ? () => {} : onClose}
      title="1-Click Mass AI Outreach Campaign"
      maxWidth="4xl"
    >
      <div className="space-y-4 text-xs">
        {/* Campaign Header Badge */}
        <div className="bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-200 rounded-xl p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-600 flex items-center justify-center text-white shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-slate-900 text-sm">Mass Candidate Campaign</h4>
                <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[11px] font-bold border border-sky-200">
                  {selectedApplications.length} Candidates Selected
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Dispatches personalized emails from <strong>hr@pileandloop.com</strong> via cPanel SMTP with dynamic token replacement.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[11px] bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
            <Mail className="w-3.5 h-3.5 text-sky-600" />
            <span>mail.pileandloop.com:465</span>
          </div>
        </div>

        {isSending || isCompleted ? (
          /* Live Progress & Status Tracker */
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-700 flex items-center gap-2">
                  {isSending && <RefreshCw className="w-4 h-4 animate-spin text-sky-600" />}
                  {isSending
                    ? `Dispatching batch: ${currentIndex} of ${selectedApplications.length}`
                    : 'Batch Outreach Completed!'}
                </span>
                <span className="font-mono text-sky-700 font-bold">{progressPercent}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200">
                <div
                  className="bg-sky-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                <span>Success: <strong className="text-emerald-600">{sentCount}</strong></span>
                <span>Failed: <strong className="text-red-600">{failedCount}</strong></span>
                <span>Remaining: <strong>{selectedApplications.length - currentIndex}</strong></span>
              </div>
            </div>

            {/* Candidate Delivery Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold sticky top-0">
                  <tr>
                    <th className="p-2.5">Candidate</th>
                    <th className="p-2.5">Email</th>
                    <th className="p-2.5 text-right">Delivery Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {deliveryList.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2.5 font-medium text-slate-900">{item.candidateName}</td>
                      <td className="p-2.5 font-mono text-[11px] text-slate-500">{item.email}</td>
                      <td className="p-2.5 text-right">
                        {item.status === 'QUEUED' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                            Queued
                          </span>
                        )}
                        {item.status === 'SENDING' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-100 text-sky-700 animate-pulse">
                            Sending...
                          </span>
                        )}
                        {item.status === 'SENT' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 flex items-center justify-end gap-1 ml-auto w-fit">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Dispatched
                          </span>
                        )}
                        {item.status === 'FAILED' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700 flex items-center justify-end gap-1 ml-auto w-fit" title={item.error}>
                            <AlertCircle className="w-3 h-3 text-red-600" />
                            Failed
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {isCompleted && (
              <div className="flex justify-end pt-3 border-t border-slate-100">
                <Button size="sm" onClick={handleFinish} className="bg-sky-600 hover:bg-sky-700 text-white">
                  Done & Refresh Table
                </Button>
              </div>
            )}
          </div>
        ) : (
          /* Template Config & Personalization */
          <div className="space-y-4">
            {/* Template Selection Pills */}
            <div>
              <label className="block text-slate-700 font-bold mb-1.5">Select AI Outreach Template</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: 'INITIAL_SCREENING', label: 'Initial Screening', icon: Sparkles },
                  { id: 'INTERVIEW_INVITE', label: 'Interview Invitation', icon: Clock },
                  { id: 'STATUS_UPDATE', label: 'Status Update', icon: Layers },
                  { id: 'OFFER_NOTICE', label: 'Offer Notice', icon: ShieldCheck },
                  { id: 'POLITE_REJECTION', label: 'Polite Decline', icon: AlertCircle },
                  { id: 'CUSTOM', label: 'Custom Outreach', icon: Briefcase },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleTemplateChange(t.id as OutreachTemplateType)}
                    className={`p-2 rounded-lg border text-left flex items-center gap-2 transition cursor-pointer ${
                      templateType === t.id
                        ? 'bg-sky-50 border-sky-400 text-sky-900 font-bold shadow-2xs'
                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <t.icon className={`w-3.5 h-3.5 ${templateType === t.id ? 'text-sky-600' : 'text-slate-400'}`} />
                    <span className="truncate">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Subject Line */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">Email Subject Line</label>
              <input
                type="text"
                value={subjectTemplate}
                onChange={(e) => setSubjectTemplate(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 font-medium text-slate-800"
              />
            </div>

            {/* Dynamic Tokens Quick Insertion */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span className="text-[11px] font-semibold text-slate-500 mr-1">Tokens:</span>
              {['{{candidateName}}', '{{position}}', '{{companyName}}', '{{trackingId}}', '{{interviewUrl}}'].map((tok) => (
                <button
                  key={tok}
                  type="button"
                  onClick={() => setBodyTemplate((prev) => prev + ' ' + tok)}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-mono cursor-pointer border border-slate-200"
                >
                  +{tok}
                </button>
              ))}
            </div>

            {/* Split View: Template Editor vs Live AI Preview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Outreach Message Body</label>
                <textarea
                  rows={9}
                  value={bodyTemplate}
                  onChange={(e) => setBodyTemplate(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 font-mono text-[11px] leading-relaxed text-slate-800 resize-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-700 font-bold flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5 text-sky-600" />
                    Live Preview (Candidate {previewIdx + 1}/{selectedApplications.length})
                  </label>
                  {selectedApplications.length > 1 && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={previewIdx === 0}
                        onClick={() => setPreviewIdx((p) => Math.max(0, p - 1))}
                        className="px-1.5 py-0.5 text-[10px] border rounded bg-white disabled:opacity-40"
                      >
                        ?
                      </button>
                      <button
                        type="button"
                        disabled={previewIdx >= selectedApplications.length - 1}
                        onClick={() => setPreviewIdx((p) => Math.min(selectedApplications.length - 1, p + 1))}
                        className="px-1.5 py-0.5 text-[10px] border rounded bg-white disabled:opacity-40"
                      >
                        ?
                      </button>
                    </div>
                  )}
                </div>

                <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 h-[218px] overflow-y-auto space-y-2">
                  <div className="pb-1.5 border-b border-slate-200">
                    <div className="text-[10px] text-slate-400">To: <span className="font-mono text-slate-600">{activePreviewApp.candidate?.personalEmail || activePreviewApp.email || 'applicant@email.com'}</span></div>
                    <div className="text-[11px] font-bold text-slate-800">{previewSubject}</div>
                  </div>
                  <div className="whitespace-pre-wrap text-[11px] text-slate-600 leading-relaxed font-sans">
                    {previewBody}
                  </div>
                </div>
              </div>
            </div>

            {/* Auto Advance Option */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoAdvanceStage}
                  onChange={(e) => setAutoAdvanceStage(e.target.checked)}
                  className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 w-4 h-4"
                />
                <div>
                  <span className="font-bold text-slate-900 block">Auto-advance candidate stage upon delivery</span>
                  <span className="text-[11px] text-slate-500">
                    Transitions candidates automatically (e.g. to {getTargetStageForTemplate() || 'corresponding stage'}).
                  </span>
                </div>
              </label>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-[11px] text-slate-500">
                Ready to deliver to <strong>{selectedApplications.length}</strong> recipients.
              </span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" type="button" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleStartMassDispatch}
                  className="bg-sky-600 hover:bg-sky-700 text-white font-semibold px-4"
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  1-Click Send to All ({selectedApplications.length})
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
