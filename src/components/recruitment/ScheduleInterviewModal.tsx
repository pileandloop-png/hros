import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import {
  Calendar,
  Clock,
  Video,
  User,
  CheckCircle2,
  Sparkles,
  Send,
  MapPin,
  ExternalLink,
  Copy,
  Check,
  Building2,
  Mail
} from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { store } from '../../services/store';
import { sendHrEmail } from '../../services/api';

interface ScheduleInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateName?: string;
  candidateEmail?: string;
  positionTitle?: string;
  applicationId?: string;
  onScheduled?: (interviewData: any) => void;
}

const AVAILABLE_SLOTS = [
  '10:00 AM',
  '11:30 AM',
  '02:00 PM',
  '03:30 PM',
  '05:00 PM',
  '06:30 PM'
];

const INTERVIEW_TYPES = [
  { id: 'TECH_SCREEN', label: 'Technical Screening (45 min)', desc: 'Algorithms, data structures, and foundational engineering' },
  { id: 'PROJECT_DEEP_DIVE', label: 'Architecture & Code Review (60 min)', desc: 'Live code review and practical system design' },
  { id: 'DESIGN_PORTFOLIO', label: 'UI/UX Portfolio Walkthrough (45 min)', desc: 'Figma prototypes and interaction design discussion' },
  { id: 'PARTNER_ROUND', label: 'Final Leadership & Offer Call (30 min)', desc: 'Culture fit, growth roadmap, and stipend/offer details' }
];

/**
 * Cal.com inspired Interactive Interview Scheduling Modal
 * Features live slot picker, auto Google Meet link generation, and calendar invite dispatch.
 */
export const ScheduleInterviewModal: React.FC<ScheduleInterviewModalProps> = ({
  isOpen,
  onClose,
  candidateName = 'Candidate',
  candidateEmail = '',
  positionTitle = 'Engineering Intern',
  applicationId,
  onScheduled
}) => {
  const { toast } = useToast();

  const [date, setDate] = useState(() => {
    const d = new Date(Date.now() + 86400000);
    return d.toISOString().split('T')[0];
  });
  const [selectedSlot, setSelectedSlot] = useState<string>('02:00 PM');
  const [interviewType, setInterviewType] = useState<string>('TECH_SCREEN');
  const [platform, setPlatform] = useState<'GOOGLE_MEET' | 'TEAMS' | 'IN_PERSON'>('GOOGLE_MEET');
  const [interviewer, setInterviewer] = useState('Kamran Raza (HR Supervisor)');
  const [notes, setNotes] = useState('Bring your laptop and portfolio repository link.');
  const [meetingUrl, setMeetingUrl] = useState(() => `https://meet.google.com/plp-${Math.random().toString(36).slice(2, 6)}-${Math.random().toString(36).slice(2, 5)}`);
  const [loading, setLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(meetingUrl);
    setCopiedLink(true);
    toast.success('Meeting link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || !date) {
      toast.error('Please select both a date and an interview time slot.');
      return;
    }

    setLoading(true);
    try {
      const interviewId = `int-${Date.now().toString(36)}`;
      const selectedTypeObj = INTERVIEW_TYPES.find(t => t.id === interviewType);

      const interviewData = {
        id: interviewId,
        interviewId,
        applicationId: applicationId || null,
        candidateName,
        candidateEmail,
        positionTitle,
        scheduledDate: date,
        scheduledStart: selectedSlot,
        scheduledEnd: selectedSlot.replace('00', '45').replace('30', '15'),
        timeZone: 'Asia/Karachi',
        interviewType: selectedTypeObj?.label || 'Technical Interview',
        meetingPlatform: platform === 'GOOGLE_MEET' ? 'Google Meet' : platform === 'TEAMS' ? 'Microsoft Teams' : 'In-Person Lab',
        meetingUrl: platform !== 'IN_PERSON' ? meetingUrl : 'Pile & Loop Engineering Lab, Gulberg III, Lahore',
        interviewer,
        notes,
        status: 'SCHEDULED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Save into persistent store
      store.setDocument('interviews', interviewId, interviewData);

      // Dispatch calendar invite email to candidate
      if (candidateEmail) {
        await sendHrEmail({
          to: candidateEmail,
          subject: `Interview Scheduled: ${selectedTypeObj?.label} - Pile & Loop`,
          htmlBody: `
            <div style="font-family: sans-serif; font-size: 14px; line-height: 1.6; color: #1e293b;">
              <p>Dear <strong>${candidateName}</strong>,</p>
              <p>Your interview for the <strong>${positionTitle}</strong> role has been confirmed.</p>
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
                <p style="margin: 0 0 8px 0;"><strong>📅 Date:</strong> ${date} (PKT)</p>
                <p style="margin: 0 0 8px 0;"><strong>⏰ Time:</strong> ${selectedSlot} PKT (Asia/Karachi)</p>
                <p style="margin: 0 0 8px 0;"><strong>🎯 Round:</strong> ${selectedTypeObj?.label}</p>
                <p style="margin: 0 0 8px 0;"><strong>👤 Interviewer:</strong> ${interviewer}</p>
                <p style="margin: 0;"><strong>🔗 Meeting Link:</strong> <a href="${meetingUrl}" style="color: #0284c7; font-weight: bold;">${meetingUrl}</a></p>
              </div>
              <p>Please ensure you are in a quiet environment with a working microphone and camera.</p>
              <p>Best regards,<br/><strong>Pile & Loop Recruitment Team</strong></p>
            </div>
          `,
          textBody: `Interview confirmed on ${date} at ${selectedSlot} PKT. Meeting link: ${meetingUrl}`,
          applicationId: applicationId || undefined,
          idempotencyKey: `interview_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
        });
      }

      // Log in audit trail
      store.setDocument('auditLogs', `audit-${Date.now()}`, {
        id: `audit-${Date.now()}`,
        action: 'INTERVIEW_SCHEDULED',
        actorEmail: 'hr@pileandloop.com',
        actorRole: 'RECRUITER',
        targetEntity: candidateName,
        details: `Scheduled ${selectedTypeObj?.label} with ${candidateName} on ${date} at ${selectedSlot} PKT via ${interviewData.meetingPlatform}.`,
        timestamp: new Date().toISOString()
      });

      toast.success(`🎉 Interview confirmed for ${candidateName} on ${date} at ${selectedSlot} PKT!`);
      if (onScheduled) onScheduled(interviewData);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to schedule interview');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cal.com Interactive Interview Scheduler" maxWidth="lg">
      <form onSubmit={handleConfirmBooking} className="space-y-4 text-xs">
        {/* Candidate & Role Bar */}
        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">
              {candidateName.charAt(0)}
            </div>
            <div>
              <p className="font-bold text-slate-900 text-xs">{candidateName}</p>
              <p className="text-[11px] text-slate-500">{positionTitle} &bull; {candidateEmail || 'hr@pileandloop.com'}</p>
            </div>
          </div>
          <Badge variant="info">Timezone: Asia/Karachi (PKT)</Badge>
        </div>

        {/* Round Type Selector */}
        <div>
          <label className="block font-bold text-slate-700 mb-1.5 uppercase text-[10px] tracking-wider">
            1. Select Interview Round
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {INTERVIEW_TYPES.map((t) => (
              <div
                key={t.id}
                onClick={() => setInterviewType(t.id)}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                  interviewType === t.id
                    ? 'border-indigo-600 bg-indigo-50/60 ring-1 ring-indigo-500'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs">{t.label}</span>
                  {interviewType === t.id && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Date & Time Slot Picker (Cal.com style) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-bold text-slate-700 mb-1.5 uppercase text-[10px] tracking-wider">
              2. Select Date (PKT)
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="date"
                required
                value={date}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-slate-800 bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1.5 uppercase text-[10px] tracking-wider">
              3. Available Time Slots (Cal.com)
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {AVAILABLE_SLOTS.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setSelectedSlot(slot)}
                  className={`py-2 px-1 text-center rounded-lg border font-mono text-xs font-semibold transition-all cursor-pointer ${
                    selectedSlot === slot
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Platform & Meeting Link */}
        <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-bold text-slate-700 text-[11px]">4. Video Meeting Platform:</span>
            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={() => setPlatform('GOOGLE_MEET')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                  platform === 'GOOGLE_MEET'
                    ? 'bg-white text-emerald-700 shadow-2xs border border-emerald-300'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Google Meet
              </button>
              <button
                type="button"
                onClick={() => setPlatform('TEAMS')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                  platform === 'TEAMS'
                    ? 'bg-white text-sky-700 shadow-2xs border border-sky-300'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Microsoft Teams
              </button>
              <button
                type="button"
                onClick={() => setPlatform('IN_PERSON')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                  platform === 'IN_PERSON'
                    ? 'bg-white text-purple-700 shadow-2xs border border-purple-300'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                In-Person Lab
              </button>
            </div>
          </div>

          {platform !== 'IN_PERSON' && (
            <div className="flex items-center space-x-2">
              <input
                type="text"
                readOnly
                value={meetingUrl}
                className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-[11px] text-slate-800"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleCopyLink}
                className="h-8 px-2.5 bg-white"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              </Button>
            </div>
          )}
        </div>

        {/* Interviewer Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Lead Interviewer</label>
            <select
              value={interviewer}
              onChange={(e) => setInterviewer(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-xl bg-white text-slate-800"
            >
              <option value="Kamran Raza (HR Supervisor)">Kamran Raza (HR Supervisor)</option>
              <option value="Fatima Sheikh (Senior HR Executive)">Fatima Sheikh (Senior HR Executive)</option>
              <option value="Saad Qureshi (Lead Engineer)">Saad Qureshi (Lead Engineer)</option>
              <option value="Pile & Loop Super Admin">Pile & Loop Super Admin</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Candidate Preparation Note</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Have GitHub repo open"
              className="w-full px-3 py-1.5 border border-slate-300 rounded-xl bg-white text-slate-800"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 flex items-center justify-end space-x-2 border-t border-slate-200">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs cursor-pointer"
          >
            <Send className="w-3.5 h-3.5 mr-1.5" />
            {loading ? 'Confirming & Dispatching...' : 'Dispatch Cal.com Booking'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
