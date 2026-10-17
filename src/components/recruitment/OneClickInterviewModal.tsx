import React, { useState } from 'react';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import {
  Sparkles,
  Calendar,
  Clock,
  Video,
  MapPin,
  CheckCircle2,
  X,
  User,
  Send,
  Zap,
  Building2,
  ShieldCheck,
  Briefcase,
  GraduationCap
} from 'lucide-react';
import { execute1ClickInterviewBooking } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

interface OneClickInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateName: string;
  candidateEmail: string;
  candidateId: string;
  applicationId: string;
  positionApplied: string;
  education?: string;
  yearsOfExperience?: number;
  aiFitScore?: number;
  aiFitRecommendation?: string;
  screeningQnA?: { question: string; answer: string; passed?: boolean }[];
  onBookingSuccess?: () => void;
}

export const OneClickInterviewModal: React.FC<OneClickInterviewModalProps> = ({
  isOpen,
  onClose,
  candidateName,
  candidateEmail,
  candidateId,
  applicationId,
  positionApplied,
  education = 'BS Degree (4-Year)',
  yearsOfExperience = 2,
  aiFitScore = 94,
  aiFitRecommendation = 'BEST_FIT',
  screeningQnA = [],
  onBookingSuccess
}) => {
  const { toast } = useToast();

  const [mode, setMode] = useState<'ONLINE' | 'PHYSICAL'>('ONLINE');
  const [meetingPlatform, setMeetingPlatform] = useState<'Google Meet' | 'Zoom' | 'Office Conference Room'>('Google Meet');

  // Next business day at 11:00 AM PKT by default
  const getDefaultDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    if (d.getDay() === 0) d.setDate(d.getDate() + 1); // skip Sunday
    return d.toISOString().split('T')[0];
  };

  const [scheduledDate, setScheduledDate] = useState(getDefaultDate());
  const [timeSlot, setTimeSlot] = useState('11:00 AM - 11:45 AM PKT');
  const [interviewerName, setInterviewerName] = useState('Talent Acquisition Lead');
  const [loading, setLoading] = useState(false);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);

  if (!isOpen) return null;

  const handleExecuteBooking = async () => {
    setLoading(true);
    try {
      await execute1ClickInterviewBooking({
        applicationId,
        candidateId,
        candidateName,
        candidateEmail,
        positionApplied,
        mode,
        scheduledDate,
        timeSlot,
        interviewerName,
        meetingPlatform: mode === 'ONLINE' ? meetingPlatform : 'Office Conference Room'
      });

      setBookingConfirmed(true);
      toast.success(`⚡ 1-Click Interview Scheduled & Email Dispatched to ${candidateName}!`);
      setTimeout(() => {
        if (onBookingSuccess) onBookingSuccess();
        onClose();
      }, 1800);
    } catch (err: any) {
      toast.error(err.message || 'Failed to complete interview booking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150 select-none">
      <div className="bg-white border border-slate-200/90 rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl text-slate-900 space-y-0 relative animate-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Zap className="w-5 h-5 fill-emerald-600" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-slate-900">
                  1-Click Fast-Forward Interview Booking
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  ⚡ AI Automated
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Instantly schedule meeting, generate calendar link, and dispatch candidate email invitation
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto scrollbar-thin">
          
          {/* Candidate AI Fit Card */}
          <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                  {candidateName ? candidateName[0].toUpperCase() : 'C'}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{candidateName}</h4>
                  <p className="text-[11px] text-slate-500 font-mono">{candidateEmail}</p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                  AI Job Description Match
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Sparkles className="w-3 h-3 mr-1 text-emerald-600" />
                  {aiFitScore}% • {aiFitRecommendation}
                </span>
              </div>
            </div>

            {/* Candidate Credentials Matrix */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-1">
              <div className="p-2.5 bg-white rounded-xl border border-slate-200/70 shadow-2xs">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">Applied Position</span>
                <span className="font-semibold text-slate-800 text-[11px] truncate block mt-0.5">{positionApplied}</span>
              </div>

              <div className="p-2.5 bg-white rounded-xl border border-slate-200/70 shadow-2xs">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">Education</span>
                <span className="font-semibold text-slate-800 text-[11px] truncate block mt-0.5">{education}</span>
              </div>

              <div className="p-2.5 bg-white rounded-xl border border-slate-200/70 shadow-2xs col-span-2 sm:col-span-1">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">Experience Level</span>
                <span className="font-semibold text-slate-800 text-[11px] block mt-0.5">
                  {yearsOfExperience > 0 ? `${yearsOfExperience}+ Years Experience` : 'Fresh Graduate / Entry'}
                </span>
              </div>
            </div>

            {/* Automated Pre-Screening Questions Review */}
            <div className="space-y-1.5 pt-2 border-t border-slate-200/60">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                Automated Pre-Screening Questions Alignment:
              </span>
              <div className="space-y-1 text-[11px]">
                <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200/60">
                  <span className="text-slate-600 font-medium">Availability / Notice Period</span>
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Immediate (Within 48h)</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200/60">
                  <span className="text-slate-600 font-medium">Shift & Core Office Timings</span>
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">09:00 AM - 04:00 PM PKT Available</span>
                </div>
              </div>
            </div>
          </div>

          {/* Interview Mode Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
              Select Interview Mode & Venue
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode('ONLINE')}
                className={`p-3.5 rounded-2xl border text-left flex items-start space-x-3 transition-all cursor-pointer ${
                  mode === 'ONLINE'
                    ? 'bg-sky-50/80 border-sky-400 text-sky-950 shadow-xs'
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className={`p-2 rounded-xl shrink-0 ${mode === 'ONLINE' ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  <Video className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="font-bold text-xs">Online Video Call</h5>
                  <p className="text-[11px] text-slate-500 mt-0.5">Google Meet / Zoom link dispatched</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMode('PHYSICAL')}
                className={`p-3.5 rounded-2xl border text-left flex items-start space-x-3 transition-all cursor-pointer ${
                  mode === 'PHYSICAL'
                    ? 'bg-emerald-50/80 border-emerald-400 text-emerald-950 shadow-xs'
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className={`p-2 rounded-xl shrink-0 ${mode === 'PHYSICAL' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="font-bold text-xs">Physical On-Site</h5>
                  <p className="text-[11px] text-slate-500 mt-0.5">Pile & Loop Lahore Office HQ</p>
                </div>
              </button>
            </div>
          </div>

          {/* Date & Time Slot Form */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Interview Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Time Slot (PKT)
              </label>
              <select
                value={timeSlot}
                onChange={(e) => setTimeSlot(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-slate-900"
              >
                <option value="10:00 AM - 10:45 AM PKT">10:00 AM - 10:45 AM PKT</option>
                <option value="11:00 AM - 11:45 AM PKT">11:00 AM - 11:45 AM PKT (Recommended)</option>
                <option value="12:00 PM - 12:45 PM PKT">12:00 PM - 12:45 PM PKT</option>
                <option value="02:00 PM - 02:45 PM PKT">02:00 PM - 02:45 PM PKT</option>
                <option value="03:00 PM - 03:45 PM PKT">03:00 PM - 03:45 PM PKT</option>
                <option value="04:00 PM - 04:45 PM PKT">04:00 PM - 04:45 PM PKT</option>
              </select>
            </div>
          </div>

          {/* Interviewer & Platform */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Lead Interviewer
              </label>
              <input
                type="text"
                value={interviewerName}
                onChange={(e) => setInterviewerName(e.target.value)}
                placeholder="e.g. Lead Technical Recruiter"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            {mode === 'ONLINE' && (
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Video Platform
                </label>
                <select
                  value={meetingPlatform}
                  onChange={(e) => setMeetingPlatform(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="Google Meet">Google Meet (Auto-generated meet.google.com link)</option>
                  <option value="Zoom">Zoom Video Meeting</option>
                  <option value="Microsoft Teams">Microsoft Teams</option>
                </select>
              </div>
            )}
          </div>

          {/* Success Banner if confirmed */}
          {bookingConfirmed && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 flex items-center space-x-3 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="text-xs">
                <span className="font-bold block">Interview Successfully Scheduled & Sent!</span>
                <span className="text-emerald-700">Candidate email invitation dispatched via SMTP. ATS stage updated.</span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer with 1-Click Action */}
        <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Sends official calendar link & logs audit entry</span>
          </span>

          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={onClose}
              disabled={loading}
              className="text-slate-500 hover:text-slate-900"
            >
              Cancel
            </Button>

            <Button
              size="sm"
              onClick={handleExecuteBooking}
              loading={loading}
              disabled={bookingConfirmed}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2 rounded-xl shadow-xs cursor-pointer flex items-center space-x-1.5"
            >
              <Zap className="w-4 h-4 mr-1 fill-white" />
              <span>⚡ 1-Click Go Ahead & Book</span>
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
};
