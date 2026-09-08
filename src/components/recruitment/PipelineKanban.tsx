import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { transitionApplicationStage } from '../../services/api';
import { ApplicationStage } from '../../types/recruitment';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { useNavigate } from 'react-router-dom';
import { Eye, ArrowRight, UserCheck } from 'lucide-react';

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
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="h-full flex flex-col space-y-4 max-w-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Recruitment Pipeline Kanban</h2>
          <p className="text-xs text-slate-500 mt-0.5">Visual stage tracking across the internship hiring funnel</p>
        </div>
        <Button size="sm" variant="outline" onClick={loadData}>
          Refresh Pipeline
        </Button>
      </div>

      {/* Kanban Board Container */}
      <div className="flex-1 overflow-x-auto pb-4">
        <div className="flex space-x-4 min-w-max h-full">
          {KANBAN_STAGES.map((col) => {
            const colApps = applications.filter(a => a.currentStage === col.key);
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
                      className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <h5
                          className="font-bold text-xs text-slate-900 hover:text-sky-600 cursor-pointer"
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

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <button
                          onClick={() => navigate(`/recruitment/candidates/${app.candidateId}?appId=${app.applicationId}`)}
                          className="text-slate-400 hover:text-sky-600 p-1 rounded hover:bg-slate-50 cursor-pointer"
                          title="Open 360° Profile"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleStageAdvance(app.applicationId, app.currentStage)}
                          className="text-sky-600 hover:text-sky-700 font-medium text-[11px] flex items-center space-x-1 cursor-pointer"
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
    </div>
  );
};