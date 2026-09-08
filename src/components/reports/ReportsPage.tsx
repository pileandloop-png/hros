import React, { useState, useEffect } from 'react';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Button } from '../common/Button';
import { Download, BarChart3, TrendingUp, Users, Clock, Calendar } from 'lucide-react';
import Papa from 'papaparse';

export const ReportsPage: React.FC = () => {
  const [apps, setApps] = useState<any[]>([]);
  const [vacancies, setVacancies] = useState<any[]>([]);
  const [people, setPeople] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getDocs(collection(db, 'applications')),
      getDocs(collection(db, 'vacancies')),
      getDocs(collection(db, 'people')),
      getDocs(collection(db, 'attendance')),
    ]).then(([aSnap, vSnap, pSnap, attSnap]) => {
      setApps(aSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setVacancies(vSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setPeople(pSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setAttendance(attSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, []);

  const totalApps = apps.length;
  const contacted = apps.filter(a => a.initialEmailSentAt).length;
  const responded = apps.filter(a => a.followUpStatus === 'CANDIDATE_RESPONDED').length;
  const selected = apps.filter(a => a.currentStage === 'SELECTED' || a.currentStage === 'ONBOARDED').length;
  const onboarded = apps.filter(a => a.currentStage === 'ONBOARDED' || a.currentStage === 'ACTIVE_INTERN').length;

  const responseRate = contacted > 0 ? ((responded / contacted) * 100).toFixed(1) : '0';
  const selectionRate = totalApps > 0 ? ((selected / totalApps) * 100).toFixed(1) : '0';

  const exportRecruitmentReport = () => {
    const data = [
      { Metric: 'Total Applications', Value: totalApps },
      { Metric: 'Candidates Contacted', Value: contacted },
      { Metric: 'Candidate Responses', Value: responded },
      { Metric: 'Response Rate %', Value: `${responseRate}%` },
      { Metric: 'Selected Candidates', Value: selected },
      { Metric: 'Selection Rate %', Value: `${selectionRate}%` },
      { Metric: 'Onboarded Interns', Value: onboarded },
    ];
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.setAttribute('download', 'pileandloop_recruitment_funnel_report.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Reports & Analytics</h2>
          <p className="text-xs text-slate-500 mt-0.5">Recruitment conversion rates, time tracking metrics, and workforce summaries</p>
        </div>
        <Button size="sm" variant="outline" onClick={exportRecruitmentReport}>
          <Download className="w-3.5 h-3.5 mr-1.5" />
          Export Recruitment Report (CSV)
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Response Rate</span>
          <p className="text-3xl font-bold text-sky-600 mt-1">{responseRate}%</p>
          <span className="text-[10px] text-slate-400">{responded} of {contacted} candidates replied</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Selection Rate</span>
          <p className="text-3xl font-bold text-purple-600 mt-1">{selectionRate}%</p>
          <span className="text-[10px] text-slate-400">{selected} selected candidates</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Active Interns</span>
          <p className="text-3xl font-bold text-emerald-600 mt-1">
            {people.filter(p => p.status === 'ACTIVE').length}
          </p>
          <span className="text-[10px] text-slate-400">In 4-month program</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Total Logged Hours</span>
          <p className="text-3xl font-bold text-slate-900 mt-1">
            {Math.round(attendance.reduce((sum, a) => sum + (a.netWorkedMinutes || 0), 0) / 60)}h
          </p>
          <span className="text-[10px] text-slate-400">All-time across team</span>
        </div>
      </div>

      {/* Breakdown Tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3 text-xs">
          <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
            <BarChart3 className="w-4 h-4 text-sky-600" />
            <span>Recruitment Funnel Breakdown</span>
          </h3>

          <div className="divide-y divide-slate-100">
            <div className="py-2.5 flex justify-between">
              <span className="text-slate-600">Total Applications Received</span>
              <strong className="text-slate-900">{totalApps}</strong>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-slate-600">First Outreach Email Sent</span>
              <strong className="text-slate-900">{contacted}</strong>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-slate-600">Candidate Responses Received</span>
              <strong className="text-slate-900">{responded}</strong>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-slate-600">Candidates Selected</span>
              <strong className="text-purple-600">{selected}</strong>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-slate-600">Completed Onboarding (Active)</span>
              <strong className="text-emerald-600">{onboarded}</strong>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3 text-xs">
          <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
            <Users className="w-4 h-4 text-emerald-600" />
            <span>Workforce & Department Summary</span>
          </h3>

          <div className="divide-y divide-slate-100">
            {['Creative & Design', 'Content & Writing', 'Lead Generation & Sales', 'General HR'].map((dept) => {
              const count = people.filter(p => p.department === dept).length;
              return (
                <div key={dept} className="py-2.5 flex justify-between">
                  <span className="text-slate-600">{dept}</span>
                  <strong className="text-slate-900">{count} members</strong>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
