import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Mail,
  UserCheck,
  Calendar,
  AlertCircle,
  MessageSquare,
  FileText,
  Send,
  Zap,
  User,
  ShieldCheck,
  Briefcase
} from 'lucide-react';
import { Button } from '../common/Button';

export interface TimelineEvent {
  id: string;
  type: 'APPLICATION_CREATED' | 'EMAIL_SENT' | 'SCREENING_COMPLETED' | 'INTERVIEW_SCHEDULED' | 'INTERVIEW_PASSED' | 'NOTE_ADDED' | 'TIMESTAMP_RECORDED' | 'ONBOARDING_INITIATED';
  title: string;
  description: string;
  actorName?: string;
  actorRole?: string;
  timestamp: string;
  metadata?: Record<string, any>;
  badge?: string;
}

interface ActivityTimelineProps {
  events: TimelineEvent[];
  onAddNote?: (noteText: string) => Promise<void> | void;
  title?: string;
  emptyMessage?: string;
  allowAddNote?: boolean;
}

/**
 * Twenty CRM & Plane inspired Vertical Activity Timeline
 * Clean white-theme chronological stream of hiring & workforce events.
 */
export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({
  events = [],
  onAddNote,
  title = 'Candidate & Recruiter Activity Stream',
  emptyMessage = 'No activities recorded yet.',
  allowAddNote = true
}) => {
  const [newNote, setNewNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const getEventIcon = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'APPLICATION_CREATED':
        return <Briefcase className="w-4 h-4 text-indigo-600" />;
      case 'EMAIL_SENT':
        return <Mail className="w-4 h-4 text-sky-600" />;
      case 'SCREENING_COMPLETED':
        return <ShieldCheck className="w-4 h-4 text-purple-600" />;
      case 'INTERVIEW_SCHEDULED':
        return <Calendar className="w-4 h-4 text-amber-600" />;
      case 'INTERVIEW_PASSED':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'TIMESTAMP_RECORDED':
        return <Clock className="w-4 h-4 text-emerald-600" />;
      case 'ONBOARDING_INITIATED':
        return <UserCheck className="w-4 h-4 text-teal-600" />;
      case 'NOTE_ADDED':
      default:
        return <MessageSquare className="w-4 h-4 text-slate-600" />;
    }
  };

  const getEventBg = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'APPLICATION_CREATED':
        return 'bg-indigo-50 border-indigo-200';
      case 'EMAIL_SENT':
        return 'bg-sky-50 border-sky-200';
      case 'SCREENING_COMPLETED':
        return 'bg-purple-50 border-purple-200';
      case 'INTERVIEW_SCHEDULED':
        return 'bg-amber-50 border-amber-200';
      case 'INTERVIEW_PASSED':
      case 'TIMESTAMP_RECORDED':
        return 'bg-emerald-50 border-emerald-200';
      case 'ONBOARDING_INITIATED':
        return 'bg-teal-50 border-teal-200';
      case 'NOTE_ADDED':
      default:
        return 'bg-slate-50 border-slate-200';
    }
  };

  const handlePostNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !onAddNote) return;
    setSubmitting(true);
    try {
      await onAddNote(newNote.trim());
      setNewNote('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-slate-500" />
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">{title}</h3>
        </div>
        <span className="text-[10px] font-mono text-slate-400 font-semibold bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200/60">
          {events.length} Events
        </span>
      </div>

      {/* Quick Add Note Form */}
      {allowAddNote && onAddNote && (
        <form onSubmit={handlePostNote} className="space-y-2 pb-2 border-b border-slate-100">
          <textarea
            rows={2}
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add an internal recruitment note, candidate impression, or decision update..."
            className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 bg-slate-50/50 resize-none placeholder-slate-400"
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              disabled={submitting || !newNote.trim()}
              className="bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold h-7 px-3 cursor-pointer shadow-xs"
            >
              <Send className="w-3 h-3 mr-1" />
              {submitting ? 'Posting...' : 'Post Timeline Note'}
            </Button>
          </div>
        </form>
      )}

      {/* Vertical Timeline Feed */}
      {events.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-400 italic">
          {emptyMessage}
        </div>
      ) : (
        <div className="relative pl-6 space-y-5 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
          {events.map((event) => (
            <div key={event.id} className="relative group">
              {/* Event Marker Node */}
              <div
                className={`absolute -left-6 top-0.5 w-6 h-6 rounded-full border flex items-center justify-center shadow-2xs z-10 ${getEventBg(
                  event.type
                )}`}
              >
                {getEventIcon(event.type)}
              </div>

              {/* Event Content Card */}
              <div className="bg-slate-50/60 hover:bg-slate-50 p-3 rounded-xl border border-slate-200/70 transition-colors space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <span className="text-xs font-bold text-slate-900 leading-tight">
                    {event.title}
                  </span>
                  <div className="flex items-center space-x-1.5">
                    {event.badge && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {event.badge}
                      </span>
                    )}
                    <span className="text-[10px] font-mono text-slate-400 whitespace-nowrap">
                      {event.timestamp}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {event.description}
                </p>

                {event.actorName && (
                  <div className="pt-1 flex items-center space-x-1.5 text-[10px] text-slate-400">
                    <User className="w-3 h-3 text-slate-400" />
                    <span>Logged by <strong>{event.actorName}</strong> {event.actorRole ? `(${event.actorRole})` : ''}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
