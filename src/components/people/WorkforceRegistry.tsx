import React, { useState, useEffect } from 'react';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { store } from '../../services/store';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import {
  Users,
  Calendar,
  Clock,
  Phone,
  Mail,
  UserX,
  UserCheck,
  AlertTriangle,
  Search,
  Filter,
  Sparkles,
  Zap,
  ShieldCheck,
  ArrowRight,
  Plus,
  FileText,
  Award,
  Upload,
  CheckCircle2,
  Lock,
  Layers,
  ChevronRight,
  TrendingDown,
  XCircle,
  Laptop
} from 'lucide-react';
import { ContractTenureModal } from './ContractTenureModal';
import { OffboardingHandoverModal } from './OffboardingHandoverModal';
import { ExperienceLetterModal } from '../common/ExperienceLetterModal';
import { CertificateModal } from '../common/CertificateModal';
import {
  parseOnboardingDocumentText,
  SAMPLE_ONBOARDING_DOCS,
  ParsedOnboardingDoc
} from '../../services/onboardingDocParser';

export const WorkforceRegistry: React.FC = () => {
  const { isSupervisor } = useAuth();
  const toast = useToast();

  const [people, setPeople] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ACTIVE' | 'NEW' | 'ENDING_SOON' | 'OFFBOARDED' | 'TERMINATED'>('ALL');

  // Modals state
  const [tenureModalPerson, setTenureModalPerson] = useState<any | null>(null);
  const [offboardModalPerson, setOffboardModalPerson] = useState<any | null>(null);
  const [expLetterPerson, setExpLetterPerson] = useState<any | null>(null);
  const [certPerson, setCertPerson] = useState<any | null>(null);

  // Document Ingestion Modal State
  const [ingestModalOpen, setIngestModalOpen] = useState<boolean>(() => {
    return typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('ingest') === 'true';
  });
  const [selectedSampleDoc, setSelectedSampleDoc] = useState<any>(SAMPLE_ONBOARDING_DOCS[0]);
  const [docTextContent, setDocTextContent] = useState<string>(SAMPLE_ONBOARDING_DOCS[0].rawText);
  const [parsedDoc, setParsedDoc] = useState<ParsedOnboardingDoc>(() =>
    parseOnboardingDocumentText(SAMPLE_ONBOARDING_DOCS[0].rawText)
  );

  const loadPeopleData = () => {
    setLoading(true);
    try {
      const records = store.getCollection('people');
      const list = Object.values(records);
      setPeople(list);

      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        if (params.get('offboard')) {
          const target = list.find((p: any) => p.id === params.get('offboard')) || list[0];
          setOffboardModalPerson(target);
        }
        if (params.get('letter')) {
          const target = list.find((p: any) => p.id === params.get('letter')) || list[0];
          setExpLetterPerson(target);
        }
        if (params.get('filter')) {
          setActiveFilter(params.get('filter') as any);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPeopleData();
    const unsubscribe = store.subscribe((col) => {
      if (col === 'people') {
        loadPeopleData();
      }
    });
    return () => unsubscribe();
  }, []);

  const calculateDaysRemaining = (expectedEnd: any) => {
    if (!expectedEnd) return null;
    const end = expectedEnd.toDate ? expectedEnd.toDate() : new Date(expectedEnd);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const isNewlyOnboarded = (joinDate: any) => {
    if (!joinDate) return false;
    const start = new Date(joinDate);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 14;
  };

  // Metrics computation
  const totalHeadcount = people.length;
  const activeWorkforce = people.filter(p => p.status === 'ACTIVE').length;
  const newJoiners = people.filter(p => p.status === 'ACTIVE' && isNewlyOnboarded(p.joiningDate || p.joinDate)).length;
  
  const endingSoon = people.filter(p => {
    if (p.status !== 'ACTIVE') return false;
    const days = calculateDaysRemaining(p.contractEndDate || p.expectedEndDate);
    return days !== null && days <= 15 && days >= 0;
  }).length;

  const exEmployeesAlumni = people.filter(p => p.status === 'OFFBOARDED' || p.status === 'COMPLETED').length;
  const terminatedCount = people.filter(p => p.status === 'TERMINATED').length;

  // Filter logic
  const filteredPeople = people.filter((p) => {
    const term = search.toLowerCase();
    const matchSearch =
      !search ||
      (p.fullName || '').toLowerCase().includes(term) ||
      (p.email || p.personalEmail || '').toLowerCase().includes(term) ||
      (p.department || '').toLowerCase().includes(term) ||
      (p.jobTitle || p.designation || '').toLowerCase().includes(term);

    const daysLeft = calculateDaysRemaining(p.contractEndDate || p.expectedEndDate);
    const isNew = isNewlyOnboarded(p.joiningDate || p.joinDate);

    let matchFilter = true;
    if (activeFilter === 'ACTIVE') {
      matchFilter = p.status === 'ACTIVE';
    } else if (activeFilter === 'NEW') {
      matchFilter = p.status === 'ACTIVE' && isNew;
    } else if (activeFilter === 'ENDING_SOON') {
      matchFilter = p.status === 'ACTIVE' && daysLeft !== null && daysLeft <= 15 && daysLeft >= 0;
    } else if (activeFilter === 'OFFBOARDED') {
      matchFilter = p.status === 'OFFBOARDED' || p.status === 'COMPLETED';
    } else if (activeFilter === 'TERMINATED') {
      matchFilter = p.status === 'TERMINATED';
    }

    return matchSearch && matchFilter;
  });

  // Handle parsing a chosen sample doc
  const handleSelectSample = (sample: any) => {
    setSelectedSampleDoc(sample);
    setDocTextContent(sample.rawText);
    const extracted = parseOnboardingDocumentText(sample.rawText, sample.title);
    setParsedDoc(extracted);
  };

  // Handle activating parsed document into active employee database
  const handleActivateExtractedEmployee = () => {
    const id = 'usr-' + Date.now().toString(36);
    const newPersonRecord = {
      id,
      personId: id,
      uid: id,
      fullName: parsedDoc.fullName,
      email: parsedDoc.email,
      personalEmail: parsedDoc.email,
      phone: parsedDoc.phone || '+92 300 0000000',
      jobTitle: parsedDoc.jobTitle,
      designation: parsedDoc.jobTitle,
      department: parsedDoc.department,
      workerType: parsedDoc.workerType,
      contractType: parsedDoc.contractType,
      contractDurationMonths: parsedDoc.contractDurationMonths,
      joiningDate: parsedDoc.joiningDate,
      joinDate: parsedDoc.joiningDate,
      contractStartDate: parsedDoc.joiningDate,
      contractEndDate: parsedDoc.expectedEndDate,
      expectedEndDate: parsedDoc.expectedEndDate,
      renewalStatus: 'ACTIVE',
      status: 'ACTIVE',
      stipend: parsedDoc.stipendOrSalary,
      onboardingDocExtracted: {
        docName: selectedSampleDoc.title,
        extractedAt: new Date().toISOString(),
        confidenceScore: parsedDoc.confidenceScore
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    store.setDocument('people', id, newPersonRecord);
    setIngestModalOpen(false);
    toast.success(
      'Employee Activated from Onboarding Document!',
      `${parsedDoc.fullName} has been added as ${parsedDoc.jobTitle} with tenure through ${parsedDoc.expectedEndDate}.`
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Workforce &amp; Employment Registry
            </h1>
            <Badge variant="success">Real-Time Database</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Complete lifecycle management: automated onboarding document ingestion, live contract countdowns, access handover audit, and offboarding logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="primary"
            onClick={() => setIngestModalOpen(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-8 shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
            AI Document Ingestion (Word/PDF)
          </Button>
        </div>
      </div>

      {/* KPI Resource Meters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Headcount</span>
          <p className="text-2xl font-extrabold text-slate-900">{totalHeadcount}</p>
          <span className="text-[11px] text-slate-500">Database entries</span>
        </div>

        <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Active Workforce</span>
          <p className="text-2xl font-extrabold text-emerald-700">{activeWorkforce}</p>
          <span className="text-[11px] text-emerald-600 font-medium">Currently on desk</span>
        </div>

        <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wider block">New Joiners</span>
          <p className="text-2xl font-extrabold text-sky-700">{newJoiners}</p>
          <span className="text-[11px] text-sky-600 font-medium">&lt; 14 days tenure</span>
        </div>

        <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">Ending Soon</span>
          <p className="text-2xl font-extrabold text-amber-700">{endingSoon}</p>
          <span className="text-[11px] text-amber-600 font-medium">&lt; 15 days left</span>
        </div>

        <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ex-Employees / Alumni</span>
          <p className="text-2xl font-extrabold text-slate-600">{exEmployeesAlumni}</p>
          <span className="text-[11px] text-slate-400">Completed tenure</span>
        </div>

        <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">Terminated / Kicked</span>
          <p className="text-2xl font-extrabold text-rose-700">{terminatedCount}</p>
          <span className="text-[11px] text-rose-600 font-medium">Discontinued</span>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
            <button
              onClick={() => setActiveFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl transition ${
                activeFilter === 'ALL' ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Records ({people.length})
            </button>

            <button
              onClick={() => setActiveFilter('ACTIVE')}
              className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                activeFilter === 'ACTIVE' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Active Workforce ({activeWorkforce})
            </button>

            <button
              onClick={() => setActiveFilter('NEW')}
              className={`px-3 py-1.5 rounded-xl transition ${
                activeFilter === 'NEW' ? 'bg-sky-600 text-white shadow-xs' : 'bg-sky-50 text-sky-800 hover:bg-sky-100'
              }`}
            >
              New Joiners ({newJoiners})
            </button>

            <button
              onClick={() => setActiveFilter('ENDING_SOON')}
              className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1 ${
                activeFilter === 'ENDING_SOON' ? 'bg-amber-600 text-white shadow-xs' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Ending Soon ({endingSoon})
            </button>

            <button
              onClick={() => setActiveFilter('OFFBOARDED')}
              className={`px-3 py-1.5 rounded-xl transition ${
                activeFilter === 'OFFBOARDED' ? 'bg-slate-700 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Ex-Employees &amp; Alumni ({exEmployeesAlumni})
            </button>

            <button
              onClick={() => setActiveFilter('TERMINATED')}
              className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1 ${
                activeFilter === 'TERMINATED' ? 'bg-rose-600 text-white shadow-xs' : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
              }`}
            >
              <XCircle className="w-3.5 h-3.5" />
              Terminated ({terminatedCount})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, role, dept..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
            />
          </div>
        </div>
      </div>

      {/* Workforce Records List */}
      <div className="space-y-3">
        {filteredPeople.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
            <Users className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">No workforce records found</p>
            <p className="text-xs text-slate-400">Try adjusting your search criteria or filter pills.</p>
          </div>
        ) : (
          filteredPeople.map((person) => {
            const daysRemaining = calculateDaysRemaining(person.contractEndDate || person.expectedEndDate);
            const isNew = isNewlyOnboarded(person.joiningDate || person.joinDate);
            const isOffboarded = person.status === 'OFFBOARDED' || person.status === 'COMPLETED';
            const isTerminated = person.status === 'TERMINATED';

            return (
              <div
                key={person.id || person.personId || person.uid}
                className={`p-5 rounded-2xl bg-white border transition-all shadow-2xs hover:shadow-xs ${
                  isTerminated
                    ? 'border-rose-200 bg-rose-50/20'
                    : isOffboarded
                    ? 'border-slate-200/70 bg-slate-50/30 opacity-90'
                    : daysRemaining !== null && daysRemaining <= 15
                    ? 'border-amber-300 ring-1 ring-amber-200'
                    : 'border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  
                  {/* Left Column: Avatar & Person Info */}
                  <div className="flex items-start space-x-3.5">
                    <div className={`w-12 h-12 rounded-2xl font-bold flex items-center justify-center text-sm shrink-0 shadow-xs ${
                      isTerminated
                        ? 'bg-rose-100 text-rose-800'
                        : isOffboarded
                        ? 'bg-slate-200 text-slate-700'
                        : 'bg-slate-900 text-white'
                    }`}>
                      {(person.fullName || 'User').slice(0, 2).toUpperCase()}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900">{person.fullName}</h3>
                        
                        {/* Worker Type Badge */}
                        <Badge variant={person.workerType === 'EMPLOYEE' ? 'info' : 'purple'}>
                          {person.workerType || 'INTERN'}
                        </Badge>

                        {/* Status Badge */}
                        {isTerminated ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold flex items-center gap-1 border border-rose-200">
                            <XCircle className="w-3 h-3" /> Terminated / Kicked Out
                          </span>
                        ) : isOffboarded ? (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold flex items-center gap-1 border border-slate-200">
                            <UserCheck className="w-3 h-3" /> Ex-Employee &bull; Alumni
                          </span>
                        ) : isNew ? (
                          <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[10px] font-bold flex items-center gap-1 border border-sky-200">
                            <Sparkles className="w-3 h-3 text-sky-600" /> New Joiner (&lt;14d)
                          </span>
                        ) : (
                          <Badge variant="success">Active</Badge>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 font-medium">
                        {person.jobTitle || person.designation} &bull; <span className="text-slate-400">{person.department}</span>
                      </p>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-0.5">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {person.email || person.personalEmail}
                        </span>
                        <span>&bull;</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> Joined: {person.joiningDate || person.joinDate || 'N/A'}
                        </span>
                        {person.stipend && (
                          <>
                            <span>&bull;</span>
                            <span className="text-emerald-700 font-medium">Stipend: {person.stipend}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Middle Column: Live Employment Countdown & Tenure Telemetry */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 border-t lg:border-t-0 pt-3 lg:pt-0">
                    
                    {/* Live Days Remaining / Departure Banner */}
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 min-w-[200px] text-xs space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <span>Contract Tenure Clock</span>
                        <Clock className="w-3 h-3" />
                      </div>

                      {isTerminated || isOffboarded ? (
                        <div>
                          <div className="text-xs font-bold text-slate-700">
                            {isTerminated ? 'Discontinued' : 'Program Completed'}
                          </div>
                          <p className="text-[10px] font-mono text-slate-400 truncate">
                            {person.offboardedAt || `Ended: ${person.contractEndDate || person.expectedEndDate || 'N/A'}`}
                          </p>
                        </div>
                      ) : daysRemaining !== null ? (
                        <div>
                          <div className="flex items-baseline gap-1.5">
                            <span className={`text-base font-extrabold ${
                              daysRemaining <= 15 ? 'text-amber-700 animate-pulse' : 'text-slate-900'
                            }`}>
                              {daysRemaining} Days
                            </span>
                            <span className="text-[10px] font-medium text-slate-500">remaining</span>
                          </div>
                          <p className="text-[10px] text-slate-400 truncate">
                            Expires: {person.contractEndDate || person.expectedEndDate}
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 font-medium">Permanent Contract</p>
                      )}
                    </div>

                    {/* Access Handover Clearance Badge */}
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 min-w-[170px] text-xs space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <span>Access Handover</span>
                        <ShieldCheck className="w-3 h-3" />
                      </div>

                      {person.accessHandover ? (
                        <div>
                          <div className="flex items-center gap-1 font-bold text-emerald-700 text-xs">
                            <CheckCircle2 className="w-3 h-3" /> Handover Cleared
                          </div>
                          <p className="text-[10px] text-slate-400">All 5 access systems revoked</p>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center gap-1 font-bold text-slate-700 text-xs">
                            <Lock className="w-3 h-3 text-slate-400" /> Active Credentials
                          </div>
                          <p className="text-[10px] text-slate-400">Outlook, GitHub &amp; Slack live</p>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons Column */}
                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      
                      {/* Active Actions */}
                      {!isOffboarded && !isTerminated ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setTenureModalPerson(person)}
                            className="text-xs h-8 border-slate-300 hover:bg-slate-50"
                          >
                            <Calendar className="w-3.5 h-3.5 mr-1 text-sky-600" />
                            Extend
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setOffboardModalPerson(person)}
                            className="text-xs h-8 text-rose-600 border-rose-200 hover:bg-rose-50"
                          >
                            <UserX className="w-3.5 h-3.5 mr-1" />
                            Offboard &amp; Handover
                          </Button>
                        </>
                      ) : (
                        /* Ex-Employee Official Documents Actions */
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setExpLetterPerson(person)}
                            className="text-xs h-8 border-slate-300 hover:bg-slate-50 text-slate-800"
                          >
                            <FileText className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                            Experience Letter
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setCertPerson(person)}
                            className="text-xs h-8 border-slate-300 hover:bg-slate-50 text-slate-800"
                          >
                            <Award className="w-3.5 h-3.5 mr-1 text-amber-600" />
                            Certificate
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL 1: AI Onboarding Document Ingestion */}
      {ingestModalOpen && (
        <Modal isOpen={ingestModalOpen} onClose={() => setIngestModalOpen(false)} title="AI Onboarding Document Ingestion Engine" maxWidth="lg">
          <div className="space-y-5 text-slate-900">
            
            {/* Explainer Banner */}
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-700 space-y-1">
                <h4 className="font-bold text-slate-900 text-sm">Automated Email &amp; Word Document Extractor</h4>
                <p>
                  When candidate onboarding packages or appointment letters arrive in Word (.docx) or PDF format, our parser automatically detects start date, designation, email, and contract duration to activate their live employment countdown.
                </p>
              </div>
            </div>

            {/* Presets Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Select Received Document / Email Attachment:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {SAMPLE_ONBOARDING_DOCS.map((doc) => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => handleSelectSample(doc)}
                    className={`p-3 rounded-xl border text-left transition ${
                      selectedSampleDoc.id === doc.id
                        ? 'border-emerald-600 bg-emerald-50/40 ring-1 ring-emerald-500 shadow-2xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 truncate">
                      <FileText className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">{doc.title.split('-')[1]?.trim() || doc.title}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 truncate">{doc.senderEmail}</p>
                    <span className="text-[9px] font-mono text-slate-400 mt-0.5 block">{doc.receivedAt}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Live AI Extracted Fields Preview */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Extracted Employment Metadata (Confidence: {parsedDoc.confidenceScore}%)
                  </h4>
                </div>
                <Badge variant="success">Structured Ready</Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1 text-xs">
                <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Employee Name</span>
                  <p className="font-bold text-slate-900 mt-0.5">{parsedDoc.fullName}</p>
                </div>

                <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Email Address</span>
                  <p className="font-mono text-slate-700 mt-0.5 truncate">{parsedDoc.email}</p>
                </div>

                <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Designation / Role</span>
                  <p className="font-bold text-slate-900 mt-0.5 truncate">{parsedDoc.jobTitle}</p>
                </div>

                <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Commencement Date</span>
                  <p className="font-semibold text-emerald-700 mt-0.5">{parsedDoc.joiningDate}</p>
                </div>

                <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Contract Duration</span>
                  <p className="font-bold text-slate-900 mt-0.5">{parsedDoc.contractDurationMonths} Months Program</p>
                </div>

                <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Calculated End Date</span>
                  <p className="font-semibold text-amber-700 mt-0.5">{parsedDoc.expectedEndDate}</p>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-400">
                Creates new active profile with live tenure countdown clock.
              </span>
              <div className="flex items-center space-x-2">
                <Button size="sm" variant="outline" onClick={() => setIngestModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleActivateExtractedEmployee}
                  className="bg-slate-900 text-white"
                >
                  <UserCheck className="w-3.5 h-3.5 mr-1" />
                  Activate &amp; Add to Workforce Database
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 2: Offboarding & Access Handover */}
      {offboardModalPerson && (
        <OffboardingHandoverModal
          isOpen={!!offboardModalPerson}
          onClose={() => setOffboardModalPerson(null)}
          person={offboardModalPerson}
          onSuccess={(updated) => {
            loadPeopleData();
          }}
          onOpenExperienceLetter={(p) => setExpLetterPerson(p)}
          onOpenCertificate={(p) => setCertPerson(p)}
        />
      )}

      {/* MODAL 3: Experience Letter Generator */}
      {expLetterPerson && (
        <ExperienceLetterModal
          isOpen={!!expLetterPerson}
          onClose={() => setExpLetterPerson(null)}
          personName={expLetterPerson.fullName}
          jobTitle={expLetterPerson.jobTitle || expLetterPerson.designation}
          department={expLetterPerson.department}
          workerType={expLetterPerson.workerType}
          joiningDate={expLetterPerson.joiningDate || expLetterPerson.joinDate}
          offboardedAt={expLetterPerson.actualEndDate || expLetterPerson.offboardedAt || new Date().toISOString().split('T')[0]}
          tenureDurationMonths={expLetterPerson.contractDurationMonths || 4}
        />
      )}

      {/* MODAL 4: Internship Completion Certificate */}
      {certPerson && (
        <CertificateModal
          isOpen={!!certPerson}
          onClose={() => setCertPerson(null)}
          internName={certPerson.fullName}
          role={certPerson.jobTitle || certPerson.designation}
          department={certPerson.department}
          durationMonths={certPerson.contractDurationMonths || 4}
          startDate={certPerson.joiningDate || certPerson.joinDate}
          completionDate={certPerson.actualEndDate || certPerson.offboardedAt || new Date().toISOString().split('T')[0]}
        />
      )}

      {/* MODAL 5: Contract Tenure Extension */}
      {tenureModalPerson && (
        <ContractTenureModal
          isOpen={!!tenureModalPerson}
          onClose={() => setTenureModalPerson(null)}
          person={tenureModalPerson}
          onUpdated={() => loadPeopleData()}
        />
      )}
    </div>
  );
};
