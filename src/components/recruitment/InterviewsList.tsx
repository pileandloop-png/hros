import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { Calendar, Clock, Video, User, CheckCircle, XCircle, Plus, ExternalLink } from 'lucide-react';

export const InterviewsList: React.FC = () => {
  const { isSupervisor } = useAuth();
  const [interviews, setInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'UPCOMING' | 'TODAY' | 'COMPLETED' | 'NO_SHOW'>('UPCOMING');
  const [scorecardModalOpen, setScorecardModalOpen] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState<any>(null);
  const [scorecardData, setScorecardData] = useState({
    communication: 4,
    technicalSkills: 4,
    problemSolving: 4,
    cultureFit: 5,
    notes: '',
    recommendation: 'STRONG_HIRE',
  });
  const [savingScorecard, setSavingScorecard] = useState(false);

  const loadInterviews = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'interviews'));
      setInterviews(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInterviews();
  }, []);

  const handleSaveScorecard = async () => {
    if (!selectedInterview) return;
    setSavingScorecard(true);
    try {
      const intRef = doc(db, 'interviews', selectedInterview.id);
      await updateDoc(intRef, {
        scorecard: scorecardData,
        status: 'COMPLETED',
        decisionRecommendation: scorecardData.recommendation,
        updatedAt: serverTimestamp(),
      });
      setScorecardModalOpen(false);
      loadInterviews();
    } finally {
      setSavingScorecard(false);
    }
  };

  const handleMarkNoShow = async (intId: string) => {
    if (!window.confirm('Mark this interview as No-Show?')) return;
    const intRef = doc(db, 'interviews', intId);
    await updateDoc(intRef, {
      status: 'NO_SHOW',
      updatedAt: serverTimestamp(),
    });
    loadInterviews();
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Interviews Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">Track candidate interviews, scorecards, and evaluations</p>
        </div>
        <a
          href="https://calendar.google.com/calendar/u/0/appointments/schedules/pileandloop"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-sky-700 bg-sky-50 border border-sky-200 rounded-lg hover:bg-sky-100 transition-colors"
        >
          <span>Google Calendar Booking Link</span>
          <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
        </a>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 flex space-x-6 text-xs font-medium">
        {[
          { id: 'UPCOMING', label: 'Upcoming' },
          { id: 'TODAY', label: 'Today' },
          { id: 'COMPLETED', label: 'Completed' },
          { id: 'NO_SHOW', label: 'No-Shows' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-2.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === tab.id
                ? 'border-sky-600 text-sky-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Interviews Grid */}
      <div className="space-y-3">
        {interviews.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-dashed text-center text-xs text-slate-500">
            {loading ? 'Loading interviews...' : 'No interviews recorded in this view.'}
          </div>
        ) : (
          interviews.map((int) => (
            <div key={int.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between text-xs">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{int.candidateName || 'Candidate Interview'}</h4>
                  <div className="flex items-center space-x-3 text-slate-500 mt-1">
                    <span className="flex items-center"><Calendar className="w-3.5 h-3.5 mr-1" /> {int.scheduledDate}</span>
                    <span className="flex items-center"><Clock className="w-3.5 h-3.5 mr-1" /> {int.scheduledStart} - {int.scheduledEnd}</span>
                    <span>{int.meetingPlatform}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Badge variant={int.status === 'COMPLETED' ? 'success' : int.status === 'NO_SHOW' ? 'danger' : 'info'}>
                  {int.status}
                </Badge>

                {int.status !== 'COMPLETED' && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => {
                      setSelectedInterview(int);
                      setScorecardModalOpen(true);
                    }}>
                      Record Scorecard
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleMarkNoShow(int.id)}>
                      No-Show
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Scorecard Modal */}
      <Modal isOpen={scorecardModalOpen} onClose={() => setScorecardModalOpen(false)} title="Interview Scorecard & Evaluation" maxWidth="md">
        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Communication (1-5)</label>
              <input
                type="number"
                min={1}
                max={5}
                value={scorecardData.communication}
                onChange={(e) => setScorecardData({ ...scorecardData, communication: Number(e.target.value) })}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">Technical Skills (1-5)</label>
              <input
                type="number"
                min={1}
                max={5}
                value={scorecardData.technicalSkills}
                onChange={(e) => setScorecardData({ ...scorecardData, technicalSkills: Number(e.target.value) })}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">Problem Solving (1-5)</label>
              <input
                type="number"
                min={1}
                max={5}
                value={scorecardData.problemSolving}
                onChange={(e) => setScorecardData({ ...scorecardData, problemSolving: Number(e.target.value) })}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">Culture Fit (1-5)</label>
              <input
                type="number"
                min={1}
                max={5}
                value={scorecardData.cultureFit}
                onChange={(e) => setScorecardData({ ...scorecardData, cultureFit: Number(e.target.value) })}
                className="w-full p-2 border rounded"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1">Recommendation</label>
            <select
              value={scorecardData.recommendation}
              onChange={(e) => setScorecardData({ ...scorecardData, recommendation: e.target.value })}
              className="w-full p-2 border rounded bg-white"
            >
              <option value="STRONG_HIRE">Strong Hire</option>
              <option value="HIRE">Hire</option>
              <option value="HOLD">Hold</option>
              <option value="DO_NOT_HIRE">Do Not Hire</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1">Interviewer Notes</label>
            <textarea
              rows={3}
              value={scorecardData.notes}
              onChange={(e) => setScorecardData({ ...scorecardData, notes: e.target.value })}
              placeholder="Candidate strengths, specific answers, concerns..."
              className="w-full p-2 border rounded"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <Button size="sm" variant="outline" onClick={() => setScorecardModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveScorecard} loading={savingScorecard}>
              Submit Evaluation
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
