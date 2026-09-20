import React, { useState } from 'react';
import { store } from '../../services/store';
import { transitionApplicationStage } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import {
  Star,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Award,
  FileCheck,
  Send,
  HelpCircle,
  ThumbsUp,
  ThumbsDown,
  Clock
} from 'lucide-react';

interface InterviewScorecardModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateId: string;
  candidateName: string;
  applicationId?: string;
  positionTitle?: string;
  onScorecardSaved: () => void;
}

export const InterviewScorecardModal: React.FC<InterviewScorecardModalProps> = ({
  isOpen,
  onClose,
  candidateId,
  candidateName,
  applicationId,
  positionTitle,
  onScorecardSaved,
}) => {
  const { user, profile } = useAuth();
  const toast = useToast();

  const [techRating, setTechRating] = useState(4);
  const [problemSolvingRating, setProblemSolvingRating] = useState(4);
  const [commRating, setCommRating] = useState(4);
  const [cultureRating, setCultureRating] = useState(4);

  const [strengths, setStrengths] = useState('');
  const [concerns, setConcerns] = useState('');
  const [verdict, setVerdict] = useState<'STRONG_HIRE' | 'HIRE' | 'HOLD' | 'DO_NOT_HIRE'>('HIRE');
  const [summaryNotes, setSummaryNotes] = useState('');
  const [generatingAi, setGeneratingAi] = useState(false);
  const [saving, setSaving] = useState(false);

  // Overall Score Calculation (out of 100)
  const averageStars = (techRating + problemSolvingRating + commRating + cultureRating) / 4;
  const overallPercentage = Math.round((averageStars / 5) * 100);

  // 1-Click AI Evaluation Synthesis
  const handleGenerateAiVerdict = () => {
    setGeneratingAi(true);
    setTimeout(() => {
      let rec: 'STRONG_HIRE' | 'HIRE' | 'HOLD' | 'DO_NOT_HIRE' = 'HIRE';
      if (overallPercentage >= 85) rec = 'STRONG_HIRE';
      else if (overallPercentage >= 70) rec = 'HIRE';
      else if (overallPercentage >= 50) rec = 'HOLD';
      else rec = 'DO_NOT_HIRE';

      setVerdict(rec);

      const generatedSummary = `Automated Evaluation Summary for ${candidateName} (${positionTitle || 'Role'}):
- Overall Performance: ${overallPercentage}% (${averageStars.toFixed(1)} / 5.0 Stars)
- Technical Competency: ${techRating}/5 | Problem Solving: ${problemSolvingRating}/5 | Communication: ${commRating}/5 | Cultural Alignment: ${cultureRating}/5
- Assessment: Candidate demonstrates ${
        techRating >= 4 ? 'strong technical aptitude and clean execution' : 'adequate foundational knowledge'
      }. Articulation and problem exploration were ${
        commRating >= 4 ? 'clear, structured, and collaborative' : 'functional with minor hesitation'
      }.
- Recommendation: ${rec.replace('_', ' ')}.`;

      setSummaryNotes(generatedSummary);
      setGeneratingAi(false);
      toast.success('AI Scorecard Generated', 'Calculated evaluation metrics and synthesis.');
    }, 600);
  };

  const handleSaveScorecard = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const scorecardId = 'sc-' + Date.now().toString(36);
      const now = new Date().toISOString();

      const scorecardData = {
        id: scorecardId,
        candidateId,
        applicationId: applicationId || null,
        positionTitle: positionTitle || 'Role',
        interviewerName: profile?.displayName || user?.email || 'Interviewer',
        interviewerRole: profile?.role || 'HR_EXECUTIVE',
        ratings: {
          technical: techRating,
          problemSolving: problemSolvingRating,
          communication: commRating,
          culture: cultureRating,
          average: averageStars,
          scorePercentage: overallPercentage,
        },
        strengths,
        concerns,
        verdict,
        summaryNotes,
        createdAt: now,
      };

      // Save to store
      store.setDocument('interviewScorecards', scorecardId, scorecardData);

      // Also record in candidateNotes so it appears in HR Notes
      const noteId = 'note-' + Date.now().toString(36);
      store.setDocument('candidateNotes', noteId, {
        id: noteId,
        candidateId,
        applicationId,
        type: 'INTERVIEW_FEEDBACK',
        content: `[INTERVIEW SCORECARD - ${verdict.replace('_', ' ')} (${overallPercentage}%)]\n${summaryNotes}`,
        authorName: profile?.displayName || user?.email,
        authorRole: profile?.role,
        createdAt: now,
      });

      // Advance stage to INTERVIEW_COMPLETED if applicable
      if (applicationId) {
        try {
          await transitionApplicationStage(applicationId, 'INTERVIEW_COMPLETED' as any);
        } catch {
          // Non-blocking
        }
      }

      toast.success('Scorecard Saved', `Recorded interview evaluation for ${candidateName}.`);
      onScorecardSaved();
      onClose();
    } catch (err: any) {
      toast.error('Save Failed', err.message || 'Could not record scorecard.');
    } finally {
      setSaving(false);
    }
  };

  const renderStars = (value: number, onChange: (v: number) => void) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="p-1 text-slate-300 hover:text-amber-400 focus:outline-none transition cursor-pointer"
          >
            <Star
              className={`w-4 h-4 ${
                star <= value ? 'text-amber-400 fill-amber-400' : 'text-slate-300'
              }`}
            />
          </button>
        ))}
        <span className="text-xs font-bold text-slate-700 ml-1.5">{value} / 5</span>
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Interview Evaluation Scorecard: ${candidateName}`}
      maxWidth="2xl"
    >
      <form onSubmit={handleSaveScorecard} className="space-y-4 text-xs">
        {/* Header Summary Banner */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <span className="text-slate-500 text-[11px] block">Candidate & Position</span>
            <h4 className="font-bold text-slate-900 text-sm">
              {candidateName} &bull; <span className="text-sky-700">{positionTitle || 'Internship'}</span>
            </h4>
          </div>
          <div className="text-right">
            <span className="text-slate-500 text-[10px] block uppercase font-bold">Overall Score</span>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-base font-extrabold text-sky-700">{overallPercentage}%</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                verdict === 'STRONG_HIRE' ? 'bg-emerald-100 text-emerald-800' :
                verdict === 'HIRE' ? 'bg-sky-100 text-sky-800' :
                verdict === 'HOLD' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
              }`}>
                {verdict.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>

        {/* 4 Standardized Evaluation Criteria */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 border border-slate-200 rounded-xl bg-white space-y-1.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800">1. Technical Proficiency</label>
            </div>
            <p className="text-[10px] text-slate-400">Core domain skills, coding standards, frameworks.</p>
            {renderStars(techRating, setTechRating)}
          </div>

          <div className="p-3 border border-slate-200 rounded-xl bg-white space-y-1.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800">2. Problem Solving & Logic</label>
            </div>
            <p className="text-[10px] text-slate-400">Analytical thinking, debugging, edge cases.</p>
            {renderStars(problemSolvingRating, setProblemSolvingRating)}
          </div>

          <div className="p-3 border border-slate-200 rounded-xl bg-white space-y-1.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800">3. Communication & Articulation</label>
            </div>
            <p className="text-[10px] text-slate-400">Clarity of thought, active listening, teamwork.</p>
            {renderStars(commRating, setCommRating)}
          </div>

          <div className="p-3 border border-slate-200 rounded-xl bg-white space-y-1.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800">4. Cultural Alignment & Drive</label>
            </div>
            <p className="text-[10px] text-slate-400">Curiosity, work ethic, feedback receptiveness.</p>
            {renderStars(cultureRating, setCultureRating)}
          </div>
        </div>

        {/* Strengths & Observations */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Key Strengths & Highlights</label>
            <textarea
              rows={2}
              value={strengths}
              onChange={(e) => setStrengths(e.target.value)}
              placeholder="e.g. Solid TypeScript knowledge, explained full-stack architecture very clearly."
              className="w-full p-2 border rounded-lg text-slate-800 focus:ring-2 focus:ring-sky-500 resize-none text-xs"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Areas for Development / Gaps</label>
            <textarea
              rows={2}
              value={concerns}
              onChange={(e) => setConcerns(e.target.value)}
              placeholder="e.g. Needs more exposure to automated unit testing and Docker."
              className="w-full p-2 border rounded-lg text-slate-800 focus:ring-2 focus:ring-sky-500 resize-none text-xs"
            />
          </div>
        </div>

        {/* Final Recommendation & AI Assist */}
        <div className="p-3.5 bg-sky-50/70 border border-sky-200 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <label className="font-bold text-slate-900">Interviewer Hiring Recommendation</label>
            <button
              type="button"
              onClick={handleGenerateAiVerdict}
              disabled={generatingAi}
              className="px-2.5 py-1 bg-white hover:bg-sky-100 text-sky-700 rounded-lg text-[11px] font-bold flex items-center gap-1 border border-sky-300 shadow-2xs cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-600" />
              {generatingAi ? 'Analyzing...' : 'AI Synthesize Verdict'}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'STRONG_HIRE', label: 'Strong Hire', color: 'border-emerald-500 text-emerald-800 bg-emerald-50' },
              { id: 'HIRE', label: 'Hire', color: 'border-sky-500 text-sky-800 bg-sky-50' },
              { id: 'HOLD', label: 'Hold / Backup', color: 'border-amber-500 text-amber-800 bg-amber-50' },
              { id: 'DO_NOT_HIRE', label: 'Do Not Hire', color: 'border-red-500 text-red-800 bg-red-50' },
            ].map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setVerdict(v.id as any)}
                className={`p-2 rounded-lg border text-center font-bold text-xs transition cursor-pointer ${
                  verdict === v.id
                    ? `${v.color} shadow-2xs ring-2 ring-offset-1`
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Final Synthesis & Decision Notes
            </label>
            <textarea
              rows={3}
              required
              value={summaryNotes}
              onChange={(e) => setSummaryNotes(e.target.value)}
              placeholder="Summary notes explaining the rationale for this hiring decision..."
              className="w-full p-2.5 border rounded-lg bg-white text-slate-800 focus:ring-2 focus:ring-sky-500 font-mono text-[11px] resize-none"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <span className="text-[11px] text-slate-400">
            Recorded under {profile?.displayName || 'HR Evaluator'}
          </span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" type="submit" loading={saving} className="bg-sky-600 hover:bg-sky-700 text-white font-semibold">
              <FileCheck className="w-3.5 h-3.5 mr-1.5" />
              Save Scorecard & Update Stage
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
