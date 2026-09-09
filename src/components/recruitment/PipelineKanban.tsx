import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { store } from '../../services/store';
import { transitionApplicationStage } from '../../services/api';
import { ApplicationStage } from '../../types/recruitment';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { OfferLetterModal } from '../common/OfferLetterModal';
import { CertificateModal } from '../common/CertificateModal';
import { useCompanyProfile } from '../../contexts/CompanyContext';
import { useNavigate } from 'react-router-dom';
import {
  Eye,
  ArrowRight,
  UserCheck,
  Star,
  FileText,
  Award,
  Search,
  CheckCircle2,
  Sparkles,
  Sliders,
  Filter
} from 'lucide-react';

const KANBAN_STAGES: { key: ApplicationStage; title: string; color: string }[] = [
  { key: 'NEW_APPLICATION', title: 'New Application', color: 'border-sky-500' },
  { key: 'INITIAL_EMAIL_SENT', title: 'Initial Email Sent', color: 'border-blue-500' },
  { key: 'SCREENING_RESPONSE_RECEIVED', title: 'Screening Received', color: 'border-indigo-500' },
  { key: 'INTERVIEW_SCHEDULED', title: 'Interview Scheduled', color: 'border-purple-500' },
  { key: 'DECISION_PENDING', title: 'Decision Pending', color: 'border-amber-500' },
  { key: 'SELECTED', title: 'Selected', color: 'border-emerald-500' },
  { key: 'ONBOARDING_DOCUMENTS_PENDING', title: 'Onboarding Pending', color: 'border-teal-500' },
  { key: 'ONBOARDED', title: 'Onboarded', color: 'border-slate-800' },
];

export const PipelineKanban: React.FC = () => {
  const navigate = useNavigate();
  const { company } = useCompanyProfile();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');

  // Modals state
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [offerCandidate, setOfferCandidate] = useState<any | null>(null);

  const [certModalOpen, setCertModalOpen] = useState(false);
  const [certCandidate, setCertCandidate] = useState<any | null>(null);

  const [evalModalOpen, setEvalModalOpen] = useState(false);
  const [evalCandidate, setEvalCandidate] = useState<any | null>(null);
  const [evalScores, setEvalScores] = useState({
    technical: 4,
    problemSolving: 4,
    communication: 4,
    cultureFit: 5,
    notes: 'Demonstrated strong domain competence and high enthusiasm for product craftsmanship.'
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const cSnap = await getDocs(collection(db, 'candidates'));
      const cMap = new Map();
      cSnap.docs.forEach(d => cMap.set(d.id, d.data()));

      const aSnap = await getDocs(collection(db, 'applications'));
      const apps = aSnap.docs.map(d => ({
        applicationId: d.id,
        ...d.data(),
        candidate: cMap.get(d.data().candidateId) || {},
      }));
      setApplications(apps);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStageAdvance = async (appId: string, currentStage: ApplicationStage) => {
    const currentIndex = KANBAN_STAGES.findIndex(s => s.key === currentStage);
    if (currentIndex >= 0 && currentIndex < KANBAN_STAGES.length - 1) {
      const nextStage = KANBAN_STAGES[currentIndex + 1].key;
      await transitionApplicationStage(appId, nextStage);
      setApplications(prev => prev.map(a => a.applicationId === appId ? { ...a, currentStage: nextStage } : a));
    }
  };

  const handleSaveEvaluation = () => {
    if (!evalCandidate) return;
    const totalPoints = evalScores.technical + evalScores.problemSolving + evalScores.communication + evalScores.cultureFit;
    const percentage = Math.round((totalPoints / 20) * 100);
    let grade = 'HIRE (A)';
    if (percentage >= 85) grade = 'STRONG HIRE (A+)';
    else if (percentage >= 70) grade = 'HIRE (A)';
    else if (percentage >= 50) grade = 'CONSIDER (B)';
    else grade = 'DO NOT HIRE (C)';

    // Save to store audit & candidate
    const evalId = 'eval-' + Date.now().toString(36);
    store.setDocument('candidateEvaluations', evalId, {
      id: evalId,
      candidateId: evalCandidate.candidateId,
      candidateName: evalCandidate.candidate?.fullName,
      scores: evalScores,
      totalPercentage: percentage,
      recommendation: grade,
      evaluatedAt: new Date().toISOString()
    });

    alert(`Candidate evaluation saved: ${grade} (${percentage}% Score)`);
    setEvalModalOpen(false);
  };

  // Filter applications by search
  const filteredApps = applications.filter(app => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    const name = (app.candidate?.fullName || '').toLowerCase();
    const pos = (app.positionAppliedFor || '').toLowerCase();
    const email = (app.candidate?.personalEmail || '').toLowerCase();
    return name.includes(q) || pos.includes(q) || email.includes(q);
  });

  return (
    <div className="h-full flex flex-col space-y-4 max-w-full">
      
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{company.companyName} Recruitment Kanban</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Applicant tracking system with one-click offer generation, evaluation scoring matrix, and stage transitions
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Search Filter */}
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filter candidate or role..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <Button size="sm" variant="outline" onClick={loadData}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Kanban Board Container */}
      <div className="flex-1 overflow-x-auto pb-4">
        <div className="flex space-x-4 min-w-max h-full">
          {KANBAN_STAGES.map((col) => {
            const colApps = filteredApps.filter(a => a.currentStage === col.key);
            return (
              <div
                key={col.key}
                className="w-72 bg-slate-100/70 rounded-xl border border-slate-200 flex flex-col max-h-[calc(100vh-12rem)] shadow-2xs"
              >
                {/* Column Header */}
                <div className={`p-3.5 border-t-4 ${col.color} bg-white rounded-t-xl border-b border-slate-200 flex items-center justify-between`}>
                  <h4 className="text-xs font-bold text-slate-800 tracking-tight">{col.title}</h4>
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold flex items-center justify-center">
                    {colApps.length}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
                  {colApps.map((app) => (
                    <div
                      key={app.applicationId}
                      className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <h5
                          className="font-bold text-xs text-slate-900 hover:text-emerald-600 cursor-pointer"
                          onClick={() => navigate(`/recruitment/candidates/${app.candidateId}?appId=${app.applicationId}`)}
                        >
                          {app.candidate?.fullName || 'Candidate'}
                        </h5>
                        <Badge variant="neutral">{app.source || 'Direct'}</Badge>
                      </div>

                      <p className="text-[11px] text-slate-600 font-medium">
                        {app.positionAppliedFor}
                      </p>

                      <p className="text-[10px] text-slate-400 font-mono truncate">
                        {app.candidate?.personalEmail}
                      </p>

                      {/* Advance Quick Action Bar */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-slate-100 text-[10px]">
                        <button
                          type="button"
                          onClick={() => {
                            setOfferCandidate(app);
                            setOfferModalOpen(true);
                          }}
                          className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-semibold flex items-center gap-1 transition"
                          title="Issue Official Offer Letter"
                        >
                          <FileText className="w-3 h-3" /> Offer
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEvalCandidate(app);
                            setEvalModalOpen(true);
                          }}
                          className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 hover:bg-amber-100 font-semibold flex items-center gap-1 transition"
                          title="Score Candidate Matrix"
                        >
                          <Star className="w-3 h-3" /> Score
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCertCandidate(app);
                            setCertModalOpen(true);
                          }}
                          className="px-2 py-0.5 rounded bg-purple-50 text-purple-800 hover:bg-purple-100 font-semibold flex items-center gap-1 transition"
                          title="Generate Completion Certificate"
                        >
                          <Award className="w-3 h-3" /> Cert
                        </button>
                      </div>

                      <div className="pt-1.5 flex items-center justify-between text-xs">
                        <button
                          onClick={() => navigate(`/recruitment/candidates/${app.candidateId}?appId=${app.applicationId}`)}
                          className="text-slate-400 hover:text-emerald-600 p-1 rounded hover:bg-slate-50 cursor-pointer"
                          title="Open 360° Profile"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleStageAdvance(app.applicationId, app.currentStage)}
                          className="text-emerald-600 hover:text-emerald-700 font-medium text-[11px] flex items-center space-x-1 cursor-pointer"
                          title="Advance to next stage"
                        >
                          <span>Next</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {colApps.length === 0 && (
                    <div className="p-6 text-center text-slate-400 text-[11px] border border-dashed rounded-lg">
                      No candidates in this stage
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Offer Letter Modal */}
      {offerCandidate && (
        <OfferLetterModal
          isOpen={offerModalOpen}
          onClose={() => setOfferModalOpen(false)}
          candidateName={offerCandidate.candidate?.fullName || 'Candidate'}
          candidateEmail={offerCandidate.candidate?.personalEmail || 'candidate@example.com'}
          vacancyTitle={offerCandidate.positionAppliedFor || 'Engineering Intern'}
          department={offerCandidate.candidate?.department || 'Engineering'}
          stipendPkr={35000}
        />
      )}

      {/* Certificate Modal */}
      {certCandidate && (
        <CertificateModal
          isOpen={certModalOpen}
          onClose={() => setCertModalOpen(false)}
          internName={certCandidate.candidate?.fullName || 'Intern Name'}
          role={certCandidate.positionAppliedFor || 'Software Engineering Intern'}
          department={certCandidate.candidate?.department || 'Engineering'}
          durationMonths={4}
        />
      )}

      {/* Candidate Evaluation Scoring Matrix Modal */}
      {evalCandidate && (
        <Modal
          isOpen={evalModalOpen}
          onClose={() => setEvalModalOpen(false)}
          title={`Candidate Evaluation Matrix: ${evalCandidate.candidate?.fullName || 'Candidate'}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-slate-500 block">Position Applied:</span>
              <span className="font-bold text-slate-800 text-sm">{evalCandidate.positionAppliedFor}</span>
            </div>

            {/* Matrix Sliders */}
            <div className="space-y-3">
              {[
                { key: 'technical', label: '1. Technical Competence & Execution', desc: 'Code quality, problem architecture, and domain knowledge' },
                { key: 'problemSolving', label: '2. Problem Solving & Critical Logic', desc: 'Analytical thinking, debugging speed, and clarity' },
                { key: 'communication', label: '3. Communication & Team Presence', desc: 'Articulation, receptiveness to feedback, active listening' },
                { key: 'cultureFit', label: '4. Culture Alignment & Work Ethic', desc: 'Dedication, integrity, curiosity, and team mindset' },
              ].map((item) => (
                <div key={item.key} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-slate-800">{item.label}</label>
                    <span className="font-mono font-bold text-emerald-700">
                      {(evalScores as any)[item.key]} / 5 Stars
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={(evalScores as any)[item.key]}
                    onChange={(e) => setEvalScores({ ...evalScores, [item.key]: Number(e.target.value) })}
                    className="w-full accent-emerald-600"
                  />
                  <p className="text-[10px] text-slate-400">{item.desc}</p>
                </div>
              ))}
            </div>

            {/* Calculated Grade Output */}
            {(() => {
              const total = evalScores.technical + evalScores.problemSolving + evalScores.communication + evalScores.cultureFit;
              const pct = Math.round((total / 20) * 100);
              let grade = 'HIRE (A)';
              let color = 'bg-emerald-50 text-emerald-800 border-emerald-200';
              if (pct >= 85) {
                grade = 'STRONG HIRE (A+)';
                color = 'bg-emerald-100 text-emerald-900 border-emerald-300';
              } else if (pct >= 70) {
                grade = 'HIRE (A)';
                color = 'bg-sky-50 text-sky-800 border-sky-200';
              } else if (pct >= 50) {
                grade = 'CONSIDER (B)';
                color = 'bg-amber-50 text-amber-800 border-amber-200';
              } else {
                grade = 'DO NOT HIRE (C)';
                color = 'bg-rose-50 text-rose-800 border-rose-200';
              }

              return (
                <div className={`p-3 rounded-lg border flex items-center justify-between font-mono ${color}`}>
                  <div>
                    <span className="text-[10px] block opacity-80 uppercase tracking-wider">Evaluation Grade:</span>
                    <span className="font-extrabold text-sm">{grade}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-extrabold">{pct}%</span>
                    <span className="text-[10px] block opacity-80">{total} / 20 pts</span>
                  </div>
                </div>
              );
            })()}

            {/* Notes */}
            <div>
              <label className="block text-slate-700 font-medium mb-1">Interviewer Feedback &amp; Notes</label>
              <textarea
                rows={3}
                value={evalScores.notes}
                onChange={(e) => setEvalScores({ ...evalScores, notes: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded text-xs"
                placeholder="Specific interview feedback, strengths observed, areas to develop..."
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200">
              <Button size="sm" variant="outline" onClick={() => setEvalModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveEvaluation} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                Save Evaluation to Profile
              </Button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
};