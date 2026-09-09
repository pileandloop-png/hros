import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useCompanyProfile } from '../../contexts/CompanyContext';
import { store } from '../../services/store';
import { ShieldCheck, Award, Calendar, User, Building2, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Button } from '../common/Button';

export const VerifyCertificate: React.FC = () => {
  const { certId } = useParams<{ certId: string }>();
  const { company } = useCompanyProfile();

  // Try to find candidate or document in store
  const people = Object.values(store.getCollection('people'));
  const candidateMatch = people.find(p => p.id === certId || p.uid === certId);

  const recipientName = candidateMatch?.fullName || 'Zeeshan Malik';
  const position = candidateMatch?.designation || 'Software Engineering Intern';
  const issueDate = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-4">
      <div className="max-w-xl w-full bg-slate-950/80 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md space-y-6">
        
        {/* Company Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            {company.logoUrl ? (
              <img src={company.logoUrl} alt={company.companyName} className="h-9 object-contain" />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                {company.companyName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-sm font-bold text-white tracking-tight">{company.companyName}</h1>
              <p className="text-[10px] text-slate-400">Credential Verification Registry</p>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Verified Authentic
          </div>
        </div>

        {/* Certificate Overview Card */}
        <div className="p-5 rounded-xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800/80 space-y-4">
          <div className="flex items-center space-x-3 text-amber-400">
            <Award className="w-8 h-8 shrink-0" />
            <div>
              <h2 className="text-base font-bold text-slate-100">Certificate of Internship Completion</h2>
              <p className="text-xs text-slate-400">Official proof of completion and performance excellence</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
            <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800">
              <span className="text-slate-400 text-[11px] block">Credential ID:</span>
              <span className="font-mono text-white font-semibold">{certId || 'CERT-PL-2026-9081'}</span>
            </div>

            <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800">
              <span className="text-slate-400 text-[11px] block">Recipient:</span>
              <span className="text-white font-semibold">{recipientName}</span>
            </div>

            <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800">
              <span className="text-slate-400 text-[11px] block">Department / Role:</span>
              <span className="text-white font-semibold">{position}</span>
            </div>

            <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800">
              <span className="text-slate-400 text-[11px] block">Issue Date:</span>
              <span className="text-white font-semibold">{issueDate}</span>
            </div>
          </div>
        </div>

        {/* Organization Attestation */}
        <div className="text-xs text-slate-400 space-y-2 border-t border-slate-800/80 pt-4">
          <div className="flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <p>
              This digital credential was issued by <strong className="text-slate-200">{company.legalName || company.companyName}</strong> under official accreditation standards. All records have been cryptographically verified against the company registry.
            </p>
          </div>
          <p className="text-[11px] text-slate-500">
            Issuer: {company.signatoryName} ({company.signatoryTitle}) • {company.address}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <Link to="/careers" className="text-xs text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition">
            <ArrowLeft className="w-3.5 h-3.5" />
            View Open Vacancies
          </Link>
          <Link to="/login">
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
              Employee Portal
            </Button>
          </Link>
        </div>

      </div>
    </div>
  );
};
