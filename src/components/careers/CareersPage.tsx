import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, addDoc, updateDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { store } from '../../services/store';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import {
  Briefcase,
  MapPin,
  Clock,
  Sparkles,
  CheckCircle2,
  Send,
  Upload,
  User,
  Mail,
  Phone,
  Globe,
  ArrowRight,
  ShieldCheck,
  Building2,
  Users
} from 'lucide-react';

export const CareersPage: React.FC = () => {
  const [vacancies, setVacancies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedVacancy, setSelectedVacancy] = useState<any | null>(null);
  const [applyModalOpen, setApplyModalOpen] = useState(false);

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [coverNote, setCoverNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successAppId, setSuccessAppId] = useState<string | null>(null);

  useEffect(() => {
    loadVacancies();
  }, []);

  const loadVacancies = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'vacancies'));
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((v: any) => v.status === 'OPEN');
      setVacancies(list);
    } finally {
      setLoading(false);
    }
  };

  const departments = ['ALL', ...Array.from(new Set(vacancies.map(v => v.department).filter(Boolean)))];

  const filteredVacancies = vacancies.filter(v => {
    if (selectedDept === 'ALL') return true;
    return v.department === selectedDept;
  });

  const handleApplyClick = (vacancy: any) => {
    setSelectedVacancy(vacancy);
    setSuccessAppId(null);
    setApplyModalOpen(true);
  };

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVacancy) return;

    setSubmitting(true);
    try {
      const candId = 'cand-' + Date.now().toString(36);
      const newCand = {
        id: candId,
        fullName,
        email,
        phone,
        portfolioUrl,
        vacancyId: selectedVacancy.id,
        vacancyTitle: selectedVacancy.title,
        department: selectedVacancy.department,
        stage: 'NEW_APPLIED',
        rating: 3,
        source: 'Careers Portal',
        notes: coverNote || 'Applied via Pile & Loop public careers portal.',
        appliedDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Save candidate
      store.setDocument('candidates', candId, newCand);

      // Increment applicantsCount on vacancy
      const currentCount = selectedVacancy.applicantsCount || 0;
      store.updateDocument('vacancies', selectedVacancy.id, {
        applicantsCount: currentCount + 1,
        updatedAt: new Date().toISOString()
      });

      // Add Notification for HR
      const notifId = 'notif-' + Date.now().toString(36);
      store.setDocument('notifications', notifId, {
        id: notifId,
        title: 'New Candidate Application',
        message: `${fullName} applied for ${selectedVacancy.title} via Careers Portal.`,
        type: 'NEW_APPLICATION',
        candidateId: candId,
        read: false,
        createdAt: new Date().toISOString()
      });

      // Audit Log
      const auditId = 'audit-' + Date.now().toString(36);
      store.setDocument('auditLogs', auditId, {
        id: auditId,
        action: 'PUBLIC_APPLICATION_SUBMITTED',
        actorId: 'public-candidate',
        actorEmail: email,
        actorRole: 'CANDIDATE',
        targetEntity: selectedVacancy.title,
        details: `Application received from ${fullName} (${email}) for vacancy ${selectedVacancy.title}.`,
        timestamp: new Date().toISOString()
      });

      setSuccessAppId(candId);
      loadVacancies();
    } catch (err: any) {
      alert(err.message || 'Failed to submit application.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      
      {/* Top Navigation */}
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
              P&L
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-slate-900 block">Pile & Loop</span>
              <span className="text-[10px] text-slate-400 block -mt-0.5">Careers & Talent Network</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-xs font-semibold text-slate-600 hover:text-sky-600 transition px-3 py-1.5 rounded-lg border border-slate-200 hover:border-sky-200 bg-slate-50"
            >
              Employee Login ?
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-white to-slate-50 border-b border-slate-200 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-700 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-sky-500" />
            Join Our Next Internship & Full-Time Cohort
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
            Build Modern Digital Products with Pile & Loop
          </h1>
          <p className="text-sm text-slate-600 max-w-2xl mx-auto leading-relaxed">
            We are looking for passionate engineers, thoughtful product designers, and agile operations leaders. Experience hands-on mentorship, production deployments, and high-velocity product shipping.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 pt-2 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-slate-400" /> Lahore, Pakistan & Remote</span>
            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-slate-400" /> 09:00 - 18:00 PKT</span>
            <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-500" /> Verified Mentorship Program</span>
          </div>
        </div>
      </section>

      {/* Open Positions */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Current Openings</h2>
            <p className="text-xs text-slate-500">Explore open opportunities and submit your profile directly.</p>
          </div>

          {/* Department Filter Pills */}
          <div className="flex flex-wrap gap-1.5">
            {departments.map(dept => (
              <button
                key={dept}
                onClick={() => setSelectedDept(dept)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                  selectedDept === dept
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {dept === 'ALL' ? 'All Roles' : dept}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-xs text-slate-400">Loading open vacancies...</div>
        ) : filteredVacancies.length === 0 ? (
          <div className="text-center py-16 bg-white border border-dashed border-slate-200 rounded-2xl">
            <Briefcase className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No open positions in this category right now</p>
            <p className="text-xs text-slate-400 mt-1">Check back soon or select another department filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredVacancies.map(v => (
              <div
                key={v.id}
                className="bg-white border border-slate-200 hover:border-sky-300 rounded-2xl p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 font-semibold text-[11px] mb-1.5 border border-sky-100">
                        {v.department}
                      </span>
                      <h3 className="text-base font-bold text-slate-900">{v.title}</h3>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                      {v.employmentType || 'Internship'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                    {v.responsibilities || v.requirements || 'Work with senior engineers on scalable internal tools and modern web platforms.'}
                  </p>

                  <div className="flex flex-wrap gap-4 text-[11px] text-slate-500 pt-1">
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400" /> {v.location || 'Lahore / Remote'}</span>
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-slate-400" /> {v.openingsCount || 2} Openings</span>
                  </div>
                </div>

                <div className="pt-5 mt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">Apply in ~2 minutes</span>
                  <Button
                    size="sm"
                    onClick={() => handleApplyClick(v)}
                    className="bg-sky-600 hover:bg-sky-700 text-white text-xs px-4"
                  >
                    Apply Now <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Culture Banner */}
      <section className="bg-slate-900 text-white py-12 px-4 mt-12">
        <div className="max-w-4xl mx-auto text-center space-y-3">
          <h3 className="text-xl font-bold">Why Pile & Loop?</h3>
          <p className="text-xs text-slate-400 max-w-xl mx-auto leading-relaxed">
            We focus on ownership, zero bureaucracy, and continuous learning. Our interns build real features deployed to production from week one.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-400">
        ? {new Date().getFullYear()} Pile & Loop. All rights reserved. ? Lahore, Pakistan
      </footer>

      {/* APPLICATION MODAL */}
      <Modal
        isOpen={applyModalOpen}
        onClose={() => setApplyModalOpen(false)}
        title={selectedVacancy ? `Apply for ${selectedVacancy.title}` : 'Submit Application'}
        maxWidth="md"
      >
        {successAppId ? (
          <div className="text-center py-6 space-y-3">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h4 className="text-base font-bold text-slate-900">Application Submitted!</h4>
            <p className="text-xs text-slate-600 max-w-sm mx-auto">
              Thank you for applying to Pile & Loop. Your application has been logged into our hiring pipeline with reference ID:
            </p>
            <div className="p-2 bg-slate-100 rounded font-mono text-xs text-slate-800 inline-block font-semibold">
              {successAppId}
            </div>
            <p className="text-[11px] text-slate-400">
              Our HR team will review your application and reach out via email.
            </p>
            <div className="pt-3">
              <Button size="sm" onClick={() => setApplyModalOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmitApplication} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Full Name *</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Daniyal Tariq"
                  className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 text-slate-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Email Address *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@gmail.com"
                    className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Phone Number *</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+92 300 1234567"
                    className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 text-slate-800"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Portfolio / LinkedIn / GitHub URL</label>
              <div className="relative">
                <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="url"
                  value={portfolioUrl}
                  onChange={(e) => setPortfolioUrl(e.target.value)}
                  placeholder="https://github.com/..."
                  className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 text-slate-800 font-mono text-[11px]"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Why are you interested in this role?</label>
              <textarea
                rows={3}
                value={coverNote}
                onChange={(e) => setCoverNote(e.target.value)}
                placeholder="Share your background, recent projects, or what you want to achieve at Pile & Loop."
                className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-sky-500 text-slate-800 resize-none"
              />
            </div>

            <div className="p-3 bg-sky-50 border border-sky-100 rounded-lg flex items-center gap-3">
              <Upload className="w-5 h-5 text-sky-600 shrink-0" />
              <div className="text-[11px] text-sky-900">
                <span className="font-semibold block">Resume Verified</span>
                Your profile details will be submitted directly to the Pile & Loop recruitment pipeline.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button size="sm" variant="outline" type="button" onClick={() => setApplyModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" type="submit" loading={submitting} className="bg-sky-600 hover:bg-sky-700 text-white">
                <Send className="w-3.5 h-3.5 mr-1" />
                Submit Application
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
