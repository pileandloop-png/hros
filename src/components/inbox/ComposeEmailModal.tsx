import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Sparkles, Send } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { sendHrEmail, generateHrEmailDraft } from '../../services/api';
import { EmailAccountConfig } from '../../services/emailService';

interface ComposeEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: EmailAccountConfig[];
  defaultSender?: string;
  onEmailSent?: () => void;
}

const EMAIL_TEMPLATES = [
  {
    id: 'interview',
    label: '📅 Interview Invite',
    subject: 'Interview Invitation - Pile & Loop Opportunities',
    body: `Dear Candidate,\n\nThank you for applying to Pile & Loop. We were very impressed with your background and qualifications, and we would like to invite you for an interview.\n\nInterview Format: Online Video Screening\nDuration: 30-45 minutes\nAgenda: Technical background review, role expectations, and mutual Q&A.\n\nPlease reply with 2-3 time slots over the next 48 hours when you are available.\n\nBest regards,\nTalent Acquisition Team\nPile & Loop | https://pileandloop.com`
  },
  {
    id: 'offer',
    label: '🎉 Offer Letter',
    subject: 'Offer Letter - Pile & Loop Internship / Employment',
    body: `Dear Candidate,\n\nOn behalf of Pile & Loop, we are excited to formally extend an offer of internship/employment to you!\n\nWe were highly impressed by your passion, talent, and technical problem-solving capabilities. Attached are the terms of your engagement, monthly stipend, and start date.\n\nPlease review, sign, and return the confirmation copy to finalize your onboarding.\n\nWelcome to the team!\n\nWarm regards,\nPeople Operations Team\nPile & Loop`
  },
  {
    id: 'ack',
    label: '📩 Application Ack',
    subject: 'Application Received - Pile & Loop Careers',
    body: `Hello,\n\nThank you for applying to Pile & Loop! We have successfully received your application.\n\nOur hiring managers are reviewing your submission against our role criteria. If shortlisted, we will reach out within 3 to 5 business days with interview details.\n\nThank you for your interest in growing with us.\n\nBest regards,\nRecruitment Team\nPile & Loop`
  },
  {
    id: 'docs',
    label: '📑 Request Docs',
    subject: 'Action Required: Onboarding Documents - Pile & Loop',
    body: `Dear Team Member,\n\nWelcome to Pile & Loop! To set up your corporate profile and credentials, please reply with the following required documents:\n\n1. Valid National ID / Passport copy\n2. Educational transcript / College NOC\n3. Signed NDA & Offer letter\n4. Bank account information for monthly stipend deposits\n\nPlease submit these within 48 hours.\n\nBest regards,\nOperations Team\nPile & Loop`
  },
  {
    id: 'status',
    label: '🤝 Update / Rejection',
    subject: 'Update regarding your application - Pile & Loop',
    body: `Dear Candidate,\n\nThank you for taking the time to speak with our team regarding opportunities at Pile & Loop.\n\nWhile your skills and enthusiasm are commendable, we have chosen to proceed with another applicant whose current experience matches our immediate requirements even more closely.\n\nWe will keep your resume on file for future opportunities. We wish you great success in your professional endeavors!\n\nWarm regards,\nRecruitment Team\nPile & Loop`
  }
];

export const ComposeEmailModal: React.FC<ComposeEmailModalProps> = ({
  isOpen,
  onClose,
  accounts,
  defaultSender = 'hr@pileandloop.com',
  onEmailSent
}) => {
  const { toast } = useToast();
  const [sender, setSender] = useState(defaultSender);
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  if (!isOpen) return null;

  const handleLoadTemplate = (tpl: typeof EMAIL_TEMPLATES[0]) => {
    setSubject(tpl.subject);
    setBody(tpl.body);
    toast.info(`Loaded template: "${tpl.label}"`);
  };

  const handleAiDraft = async () => {
    if (!aiPrompt.trim()) {
      toast.warning('Please enter an instruction for the AI (e.g. "Invite for React developer interview")');
      return;
    }
    setAiLoading(true);
    try {
      const res: any = await generateHrEmailDraft({
        userInstruction: aiPrompt,
        draftType: 'Outbound Corporate Communication'
      });
      if (res.draft?.body) {
        setBody(res.draft.body);
        if (res.draft.subject && !subject) {
          setSubject(res.draft.subject);
        }
        toast.success('AI draft generated.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate AI draft');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!to.trim() || !subject.trim() || !body.trim()) {
      toast.warning('Please fill recipient email, subject, and message body.');
      return;
    }

    setSending(true);
    try {
      await sendHrEmail({
        to: to.trim(),
        subject: subject.trim(),
        htmlBody: `<div style="font-family: sans-serif; font-size: 14px; line-height: 1.6; color: #1e293b;">${body.replace(/\\n/g, '<br/>')}</div>`,
        textBody: body.trim(),
        idempotencyKey: `outbound_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      });

      toast.success(`Outbound email dispatched via cPanel SMTP to ${to}!`);
      onClose();
      setTo('');
      setSubject('');
      setBody('');
      setAiPrompt('');
      if (onEmailSent) onEmailSent();
    } catch (err: any) {
      toast.error(err.message || 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Compose Corporate Email" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">From Account</label>
            <select
              value={sender}
              onChange={(e) => setSender(e.target.value)}
              className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500 font-medium cursor-pointer"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.email}>
                  {acc.email} ({acc.accountName})
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-400 mt-0.5">Dispatches via cPanel SMTP TLS (Port 465)</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">To (Recipient Email) *</label>
            <input
              type="email"
              required
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="e.g. candidate@example.com, intern@pileandloop.com"
              className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Subject *</label>
          <input
            type="text"
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Interview Invitation - Frontend Engineer Intern"
            className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-sky-500 font-medium"
          />
        </div>

        <div>
          <span className="block text-[11px] font-semibold text-slate-500 mb-1.5">Load Pre-Built HR Template:</span>
          <div className="flex flex-wrap gap-1.5">
            {EMAIL_TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => handleLoadTemplate(tpl)}
                className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-sky-50 hover:text-sky-700 text-slate-700 rounded-md border border-slate-200 transition-colors cursor-pointer"
              >
                {tpl.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-3 bg-sky-50/70 border border-sky-200/80 rounded-lg space-y-2">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-sky-900">
            <Sparkles className="w-3.5 h-3.5 text-sky-600" />
            <span>AI Draft Assistant</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Instruct AI: e.g. Invite candidate for final technical interview this Friday at 3 PM..."
              className="text-xs p-1.5 border border-sky-300 rounded-md flex-1 bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
            <Button
              size="sm"
              type="button"
              variant="secondary"
              onClick={handleAiDraft}
              loading={aiLoading}
              className="bg-white hover:bg-sky-100 text-sky-700 text-xs shrink-0"
            >
              Draft with AI
            </Button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Message Body *</label>
          <textarea
            rows={7}
            required
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Type your formal corporate message here..."
            className="w-full text-xs p-3 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-sky-500 font-sans leading-relaxed"
          />
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-200">
          <span className="text-[11px] text-slate-400">
            Authorized via {sender}
          </span>
          <div className="flex items-center space-x-2">
            <Button size="sm" type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              type="submit"
              loading={sending}
              className="bg-sky-600 hover:bg-sky-700 text-white font-semibold cursor-pointer"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              Dispatch Email via SMTP
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
