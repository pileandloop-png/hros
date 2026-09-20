import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { store } from '../../services/store';
import { sendHrEmail } from '../../services/api';
import { notifyDiscordNewCandidate } from '../../services/discord';
import { extractCvTextFromFile, parseCvEntities } from '../../services/cvAnalysisService';
import { useCompanyProfile } from '../../contexts/CompanyContext';
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
  Users,
  Search,
  Copy,
  FileText,
  AlertCircle,
  Calendar,
  ExternalLink,
  ChevronRight,
  Check
} from 'lucide-react';

export const CareersPage: React.FC = () => {
  const { company } = useCompanyProfile();
  const [searchParams] = useSearchParams();

  const [vacancies, setVacancies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedVacancy, setSelectedVacancy] = useState<any | null>(null);
  const [applyModalOpen, setApplyModalOpen] = useState(false);

  // Application Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [coverNote, setCoverNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successTrackingId, setSuccessTrackingId] = useState<string | null>(null);
  const [copiedTrackingId, setCopiedTrackingId] = useState(false);

  // CV File & OCR State
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvFileName, setCvFileName] = useState('');
  const [cvText, setCvText] = useState('');
  const [parsingCv, setParsingCv] = useState(false);
  const [parsedSkills, setParsedSkills] = useState<string[]>([]);

  // Application Status Tracking State
  const [trackModalOpen, setTrackModalOpen] = useState(false);
  const [trackQuery, setTrackQuery] = useState(searchParams.get('track') || '');
  const [trackingResult, setTrackingResult] = useState<any | null>(null);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [searchingStatus, setSearchingStatus] = useState(false);

  useEffect(() => {
    loadVacancies();

    // If URL contains ?track=..., automatically open status modal and search
    const urlTrack = searchParams.get('track');
    if (urlTrack) {
      setTrackQuery(urlTrack);
      setTrackModalOpen(true);
      handleLookupStatus(urlTrack);
    }
  }, [searchParams]);

  const loadVacancies = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'vacancies'));
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((v: any) => v.status === 'OPEN');
      setVacancies(list);
    } finally {
      setLoading(false);
    }
  };

  const departments = ['ALL', ...Array.from(new Set(vacancies.map((v) => v.department).filter(Boolean)))];

  const filteredVacancies = vacancies.filter((v) => {
    if (selectedDept === 'ALL') return true;
    return v.department === selectedDept;
  });

  const handleApplyClick = (vacancy: any) => {
    setSelectedVacancy(vacancy);
    setSuccessTrackingId(null);
    setCopiedTrackingId(false);
    setCvFile(null);
    setCvFileName('');
    setCvText('');
    setParsedSkills([]);
    setFullName('');
    setEmail('');
    setPhone('');
    setPortfolioUrl('');
    setCoverNote('');
    setApplyModalOpen(true);
  };

  // CV Upload & In-Browser Text Extraction
  const handleCvFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCvFile(file);
    setCvFileName(file.name);
    setParsingCv(true);

    try {
      const text = await extractCvTextFromFile(file);
      setCvText(text);

      const parsed = parseCvEntities(text);
      if (parsed.skills && parsed.skills.length > 0) {
        setParsedSkills(parsed.skills);
      }

      // Pre-fill form fields if they are currently blank
      if (!fullName && parsed.fullName) setFullName(parsed.fullName);
      if (!email && parsed.email) setEmail(parsed.email);
      if (!phone && parsed.phone) setPhone(parsed.phone);
      if (!coverNote && parsed.skills && parsed.skills.length > 0) {
        setCoverNote(`Key Skills: ${parsed.skills.join(', ')}`);
      }
    } catch (err: any) {
      console.warn('In-browser CV parsing error:', err);
    } finally {
      setParsingCv(false);
    }
  };

  // Submit Application Flow
  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVacancy) return;

    setSubmitting(true);
    try {
      const candId = 'cand-' + Date.now().toString(36);
      const trackingId = 'PL-2026-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      const now = new Date().toISOString();

      const newCand = {
        id: candId,
        trackingId,
        fullName: fullName.trim(),
        personalEmail: email.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        portfolioUrl: portfolioUrl.trim(),
        vacancyId: selectedVacancy.id,
        vacancyTitle: selectedVacancy.title,
        department: selectedVacancy.department,
        stage: 'NEW_APPLIED',
        rating: 3,
        source: 'Careers Portal',
        notes: coverNote || 'Applied via Pile & Loop public careers portal.',
        cvFileName: cvFileName || '',
        cvText: cvText || '',
        parsedSkills: parsedSkills || [],
        appliedDate: now,
        createdAt: now,
        updatedAt: now,
      };

      // Save candidate to store
      store.setDocument('candidates', candId, newCand);

      // Save application document
      const appId = 'app-' + Date.now().toString(36);
      store.setDocument('applications', appId, {
        applicationId: appId,
        legacyApplicationId: trackingId,
        trackingId,
        candidateId: candId,
        vacancyId: selectedVacancy.id,
        positionAppliedFor: selectedVacancy.title,
        currentStage: 'NEW_APPLICATION',
        source: 'Careers Portal',
        createdAt: now,
        updatedAt: now,
      });

      // Increment applicantsCount on vacancy
      const currentCount = selectedVacancy.applicantsCount || 0;
      store.updateDocument('vacancies', selectedVacancy.id, {
        applicantsCount: currentCount + 1,
        updatedAt: now,
      });

      // Add Notification for HR
      const notifId = 'notif-' + Date.now().toString(36);
      store.setDocument('notifications', notifId, {
        id: notifId,
        title: 'New Candidate Application',
        message: `${fullName} applied for ${selectedVacancy.title} (Ref: ${trackingId}).`,
        type: 'NEW_APPLICATION',
        candidateId: candId,
        read: false,
        createdAt: now,
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
        details: `Application received from ${fullName} (${email}) for vacancy ${selectedVacancy.title}. Tracking ID: ${trackingId}.`,
        timestamp: now,
      });

      // Dispatch automated acknowledgment email from hr@pileandloop.com
      const trackUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://hros-beryl.vercel.app'}/careers?track=${trackingId}`;
      try {
        await sendHrEmail({
          to: email,
          subject: `Application Received: ${selectedVacancy.title} (Tracking ID: ${trackingId})`,
          htmlBody: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
              <h2 style="color: #0f172a; margin-bottom: 8px;">Application Received!</h2>
              <p style="color: #475569; font-size: 14px; line-height: 1.6;">
                Dear <strong>${fullName}</strong>,<br/>
                Thank you for applying for the <strong>${selectedVacancy.title}</strong> position at <strong>${company.companyName}</strong>.
              </p>
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center;">
                <span style="color: #64748b; font-size: 11px; display: block; margin-bottom: 4px; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px;">Your Application Tracking ID</span>
                <span style="font-family: monospace; font-size: 22px; font-weight: bold; color: #0284c7; letter-spacing: 1px;">${trackingId}</span>
              </div>
              <p style="color: #475569; font-size: 13px; line-height: 1.6;">
                You can check the live progress of your application anytime using our tracking portal without needing to create an account or password:
              </p>
              <div style="text-align: center; margin: 24px 0;">
                <a href="${trackUrl}" style="background-color: #0284c7; color: #ffffff; padding: 12px 28px; font-size: 14px; font-weight: bold; text-decoration: none; border-radius: 8px; display: inline-block;">
                  Track Live Status Online
                </a>
              </div>
              <p style="color: #94a3b8; font-size: 11px; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
                Our HR team reviews all applications carefully. For questions, reply directly to this email at hr@pileandloop.com.
              </p>
            </div>
          `,
          textBody: `Dear ${fullName}, thank you for applying for ${selectedVacancy.title}. Your Tracking ID is ${trackingId}. Track your status here: ${trackUrl}`,
          candidateId: candId,
          applicationId: appId,
          idempotencyKey: `ack-${candId}-${Date.now()}`,
        });
      } catch (err) {
        console.warn('Auto-acknowledgment email dispatch error:', err);
      }

      setSuccessTrackingId(trackingId);
      loadVacancies();

      // Discord notification
      notifyDiscordNewCandidate(fullName, selectedVacancy.title, email, 'Careers Portal').catch((e) =>
        console.warn('Discord notify error:', e)
      );
    } catch (err: any) {
      alert(err.message || 'Failed to submit application.');
    } finally {
      setSubmitting(false);
    }
  };

  // Status Lookup Function (No Login Required)
  const handleLookupStatus = (queryStr?: string) => {
    const q = (queryStr !== undefined ? queryStr : trackQuery).trim().toLowerCase();
    if (!q) return;

    setSearchingStatus(true);
    setTrackingError(null);
    setTrackingResult(null);

    try {
      const candidates = store.getCollection('candidates');
      const allCands = Object.values(candidates) as any[];

      const matched = allCands.find(
        (c) =>
          (c.trackingId && c.trackingId.toLowerCase() === q) ||
          (c.id && c.id.toLowerCase() === q) ||
          (c.email && c.email.toLowerCase() === q) ||
          (c.personalEmail && c.personalEmail.toLowerCase() === q)
      );

      if (!matched) {
        setTrackingError(
          'No candidate application found matching this Tracking ID or Email address. Please verify your reference code or contact hr@pileandloop.com.'
        );
      } else {
        setTrackingResult(matched);
      }
    } catch {
      setTrackingError('An error occurred while retrieving application status.');
    } finally {
      setSearchingStatus(false);
    }
  };

  const copyTrackingId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedTrackingId(true);
    setTimeout(() => setCopiedTrackingId(false), 2500);
  };

  const getStageDisplay = (stage: string) => {
    switch (stage) {
      case 'NEW_APPLIED':
      case 'NEW_APPLICATION':
        return {
          label: 'Application Received',
          step: 1,
          color: 'text-sky-700 bg-sky-50 border-sky-200',
          desc: 'Your application has been received and is queued for initial review by our talent acquisition team.',
        };
      case 'INITIAL_EMAIL_SENT':
      case 'INITIAL_REVIEW':
      case 'SCREENING_QUESTIONS_SENT':
      case 'SCREENING_RESPONSE_RECEIVED':
        return {
          label: 'HR Screening in Progress',
          step: 2,
          color: 'text-amber-700 bg-amber-50 border-amber-200',
          desc: 'Our recruiters have reviewed your profile and initiated preliminary screening communication.',
        };
      case 'INTERVIEW_INVITED':
      case 'INTERVIEW_SCHEDULED':
      case 'INTERVIEW_COMPLETED':
        return {
          label: 'Interview Round',
          step: 3,
          color: 'text-indigo-700 bg-indigo-50 border-indigo-200',
          desc: 'You have been invited for a technical and cultural discussion with our team members.',
        };
      case 'DECISION_PENDING':
      case 'SELECTED':
      case 'OFFER_SENT':
      case 'OFFER_EXTENDED':
        return {
          label: 'Offer / Final Selection',
          step: 4,
          color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
          desc: 'Congratulations! An offer package or final selection decision is being finalized for your profile.',
        };
      case 'ONBOARDED':
      case 'HIRED':
        return {
          label: 'Hired & Onboarded',
          step: 5,
          color: 'text-emerald-800 bg-emerald-100 border-emerald-300',
          desc: 'Welcome to Pile & Loop! You are officially part of our workspace cohort.',
        };
      case 'NOT_HIRED':
      case 'WITHDRAWN':
      case 'DISQUALIFIED':
        return {
          label: 'Application Concluded',
          step: 2,
          color: 'text-slate-700 bg-slate-100 border-slate-300',
          desc: 'Thank you for your time and effort. We have moved forward with other candidates for this specific opening, but your profile remains in our talent network for upcoming roles.',
        };
      default:
        return {
          label: stage || 'Under Review',
          step: 1,
          color: 'text-sky-700 bg-sky-50 border-sky-200',
          desc: 'Your application is progressing through our review pipeline.',
        };
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Top Navigation */}
      <nav className="border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-30 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {company.logoUrl ? (
              <img src={company.logoUrl} alt={company.companyName} className="h-9 max-w-[120px] object-contain" />
            ) : (
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm"
                style={{ backgroundColor: company.primaryColor || '#10B981' }}
              >
                {company.companyName.slice(0, 3).toUpperCase()}
              </div>
            )}
            <div>
              <span className="font-bold text-sm tracking-tight text-slate-900 block">{company.companyName}</span>
              <span className="text-[10px] text-slate-400 block -mt-0.5">Careers & Talent Network</span>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                setTrackModalOpen(true);
                setTrackingResult(null);
                setTrackingError(null);
              }}
              className="text-xs font-semibold text-sky-700 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200 transition px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              Track Application Status
            </button>
            <Link
              to="/login"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white"
            >
              Employee Login →
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-white to-slate-50 border-b border-slate-200 py-14 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            Join Our Next Internship & Full-Time Cohort
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
            Build Modern Digital Products with {company.companyName}
          </h1>
          <p className="text-sm text-slate-600 max-w-2xl mx-auto leading-relaxed">
            {company.tagline ? `${company.tagline}. ` : ''}We are looking for passionate engineers, thoughtful product designers, and agile operations leaders. Experience hands-on mentorship, production deployments, and high-velocity product shipping.
          </p>

          {/* Quick Status Lookup Banner in Hero */}
          <div className="pt-2 max-w-lg mx-auto">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setTrackModalOpen(true);
                handleLookupStatus();
              }}
              className="flex items-center gap-1.5 p-1.5 bg-white border border-slate-200 rounded-xl shadow-xs"
            >
              <Search className="w-4 h-4 text-slate-400 ml-2.5 shrink-0" />
              <input
                type="text"
                placeholder="Enter Tracking ID (e.g. PL-2026-...) or your email"
                value={trackQuery}
                onChange={(e) => setTrackQuery(e.target.value)}
                className="w-full text-xs p-1.5 outline-none text-slate-800 placeholder-slate-400 font-mono"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold shrink-0 cursor-pointer transition"
              >
                Track Status
              </button>
            </form>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 pt-3 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-slate-400" /> {company.address || 'Remote / Hybrid'}</span>
            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-slate-400" /> {company.timezone || 'Asia/Karachi'}</span>
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
            {departments.map((dept) => (
              <button
                key={dept}
                onClick={() => setSelectedDept(dept)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition cursor-pointer ${
                  selectedDept === dept
                    ? 'bg-sky-600 text-white shadow-xs'
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
            {filteredVacancies.map((v) => (
              <div
                key={v.id}
                className="bg-white border border-slate-200 hover:border-sky-300 rounded-2xl p-6 shadow-xs hover:shadow-md transition flex flex-col justify-between"
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
                  <span className="text-[11px] text-slate-400">Apply with CV in ~1 minute</span>
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
            We focus on ownership, zero bureaucracy, and continuous learning. Our team members and interns build real features deployed to production from week one.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} {company.companyName}. All rights reserved. • Lahore, Pakistan • hr@pileandloop.com
      </footer>

      {/* APPLICATION MODAL WITH CV UPLOAD & IN-BROWSER OCR */}
      <Modal
        isOpen={applyModalOpen}
        onClose={() => setApplyModalOpen(false)}
        title={selectedVacancy ? `Apply for ${selectedVacancy.title}` : 'Submit Application'}
        maxWidth="md"
      >
        {successTrackingId ? (
          <div className="text-center py-5 space-y-4 text-xs">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-bold text-slate-900">Application Received!</h4>
              <p className="text-slate-600 text-xs max-w-sm mx-auto">
                Thank you for applying to {company.companyName}. Your application has been logged into our hiring pipeline.
              </p>
            </div>

            {/* Tracking Reference Box */}
            <div className="p-4 bg-sky-50 border border-sky-200 rounded-xl space-y-2 max-w-sm mx-auto">
              <span className="text-[11px] font-bold text-sky-900 block">Your Official Tracking Reference:</span>
              <div className="flex items-center justify-center gap-2">
                <span className="font-mono text-base font-extrabold text-sky-950 bg-white px-3 py-1.5 rounded-lg border border-sky-200 shadow-2xs">
                  {successTrackingId}
                </span>
                <button
                  type="button"
                  onClick={() => copyTrackingId(successTrackingId)}
                  className="p-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white transition cursor-pointer"
                  title="Copy Tracking ID"
                >
                  {copiedTrackingId ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-sky-800 pt-1">
                Save this reference code to check your live application status anytime without logging in.
              </p>
            </div>

            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              A confirmation email has been dispatched to <strong>{email}</strong> from <span className="font-mono">hr@pileandloop.com</span>.
            </p>

            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                size="sm"
                onClick={() => {
                  setApplyModalOpen(false);
                  setTrackQuery(successTrackingId);
                  setTrackModalOpen(true);
                  handleLookupStatus(successTrackingId);
                }}
                className="bg-sky-600 hover:bg-sky-700 text-white"
              >
                <Search className="w-3.5 h-3.5 mr-1" />
                Track Status Now
              </Button>
              <Button size="sm" variant="outline" onClick={() => setApplyModalOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmitApplication} className="space-y-3.5 text-xs">
            {/* CV Upload Dropzone */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Upload Resume / CV (.PDF, .DOCX, .TXT) *
              </label>
              <div className="relative border-2 border-dashed border-sky-300 hover:border-sky-500 rounded-xl p-4 text-center bg-sky-50/50 transition cursor-pointer">
                <input
                  type="file"
                  accept=".pdf,.docx,.doc,.txt"
                  onChange={handleCvFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="flex flex-col items-center justify-center space-y-1.5">
                  <Upload className="w-6 h-6 text-sky-600" />
                  {parsingCv ? (
                    <div className="flex items-center gap-2 text-sky-700 font-semibold text-xs">
                      <div className="w-3.5 h-3.5 border-2 border-sky-600 border-t-transparent rounded-full animate-spin" />
                      Parsing CV with In-Browser OCR...
                    </div>
                  ) : cvFileName ? (
                    <div>
                      <span className="font-bold text-sky-950 block">{cvFileName}</span>
                      <span className="text-[10px] text-emerald-600 font-semibold">
                        ✓ CV loaded & details extracted into form
                      </span>
                    </div>
                  ) : (
                    <div>
                      <span className="font-semibold text-slate-800 block">
                        Drop CV file here or click to browse
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Our in-app OCR automatically extracts and fills your information
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Candidate Details */}
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
                    placeholder="name@example.com"
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
              <label className="block text-slate-700 font-medium mb-1">Cover Note / Extracted Skills</label>
              <textarea
                rows={3}
                value={coverNote}
                onChange={(e) => setCoverNote(e.target.value)}
                placeholder="Share your background, key technologies, or what you want to achieve at Pile & Loop."
                className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-sky-500 text-slate-800 resize-none text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button size="sm" variant="outline" type="button" onClick={() => setApplyModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" type="submit" loading={submitting} className="bg-sky-600 hover:bg-sky-700 text-white">
                <Send className="w-3.5 h-3.5 mr-1" />
                Submit Profile & Get Tracking ID
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* PUBLIC APPLICATION STATUS TRACKER MODAL */}
      <Modal
        isOpen={trackModalOpen}
        onClose={() => setTrackModalOpen(false)}
        title="Track Application Status (Public Self-Service)"
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-500 text-[11px]">
            Enter your <strong>Tracking ID</strong> (e.g. <span className="font-mono">PL-2026-XXXXXX</span>) or your applicant <strong>Email Address</strong> to view live status updates. No password required.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLookupStatus();
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                value={trackQuery}
                onChange={(e) => setTrackQuery(e.target.value)}
                placeholder="PL-2026-XXXXXX or applicant@email.com"
                className="w-full pl-9 pr-3 py-2 border rounded-lg text-slate-800 font-mono text-xs focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <Button size="sm" type="submit" loading={searchingStatus} className="bg-sky-600 hover:bg-sky-700 text-white shrink-0">
              Check Status
            </Button>
          </form>

          {trackingError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{trackingError}</span>
            </div>
          )}

          {trackingResult && (
            <div className="space-y-4 pt-2">
              {/* Candidate Info Header */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3 mb-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{trackingResult.fullName}</h4>
                    <span className="text-[11px] text-slate-500">
                      Applied for: <strong>{trackingResult.vacancyTitle || 'Open Position'}</strong> ({trackingResult.department || 'General'})
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Tracking Reference</span>
                    <span className="font-mono text-xs font-bold text-sky-700">
                      {trackingResult.trackingId || trackingResult.id}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-600">
                  <div>
                    <span className="text-slate-400 block">Applied Date:</span>
                    <span className="font-medium">
                      {new Date(trackingResult.appliedDate || trackingResult.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Contact:</span>
                    <span className="font-mono text-[10px]">{trackingResult.personalEmail || trackingResult.email}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Location:</span>
                    <span>{trackingResult.city || 'Remote / Hybrid'}</span>
                  </div>
                </div>
              </div>

              {/* Progress Stepper */}
              {(() => {
                const stageInfo = getStageDisplay(trackingResult.stage || 'NEW_APPLIED');
                const steps = [
                  { num: 1, label: 'Submitted' },
                  { num: 2, label: 'HR Screening' },
                  { num: 3, label: 'Interview' },
                  { num: 4, label: 'Offer / Selection' },
                  { num: 5, label: 'Joined' },
                ];

                return (
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-xl border flex items-start gap-3 bg-white shadow-2xs">
                      <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                        {stageInfo.step}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">Current Status:</span>
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${stageInfo.color}`}>
                            {stageInfo.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          {stageInfo.desc}
                        </p>
                      </div>
                    </div>

                    {/* Step Visualizer */}
                    <div className="relative flex items-center justify-between px-2 pt-2">
                      <div className="absolute left-6 right-6 top-5 h-0.5 bg-slate-200 z-0" />
                      {steps.map((s) => {
                        const isDone = s.num <= stageInfo.step;
                        const isCurrent = s.num === stageInfo.step;
                        return (
                          <div key={s.num} className="relative z-10 flex flex-col items-center">
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold border-2 transition-all ${
                                isCurrent
                                  ? 'bg-sky-600 text-white border-sky-600 ring-4 ring-sky-100'
                                  : isDone
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : 'bg-white text-slate-400 border-slate-300'
                              }`}
                            >
                              {isDone && !isCurrent ? <Check className="w-3.5 h-3.5" /> : s.num}
                            </div>
                            <span className={`text-[10px] mt-1 font-medium text-center ${
                              isCurrent ? 'text-sky-700 font-bold' : isDone ? 'text-slate-700' : 'text-slate-400'
                            }`}>
                              {s.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-500 flex items-center justify-between">
                <span>Need assistance? Contact our HR recruitment team.</span>
                <a href="mailto:hr@pileandloop.com" className="text-sky-600 font-semibold hover:underline">
                  hr@pileandloop.com
                </a>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <Button size="sm" variant="outline" onClick={() => setTrackModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
