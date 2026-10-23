import React, { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { useCompanyProfile } from '../../contexts/CompanyContext';
import { FileText, Download, Printer, CheckCircle2, ShieldCheck, Share2 } from 'lucide-react';

interface ExperienceLetterModalProps {
  isOpen: boolean;
  onClose: () => void;
  personName: string;
  jobTitle: string;
  department: string;
  workerType?: string;
  joiningDate?: string;
  offboardedAt?: string;
  tenureDurationMonths?: number;
  letterType?: 'EXPERIENCE' | 'RELIEVING';
  refNumber?: string;
}

export const ExperienceLetterModal: React.FC<ExperienceLetterModalProps> = ({
  isOpen,
  onClose,
  personName,
  jobTitle,
  department,
  workerType = 'Intern',
  joiningDate = '2026-06-01',
  offboardedAt = new Date().toISOString().split('T')[0],
  tenureDurationMonths = 4,
  letterType = 'EXPERIENCE',
  refNumber = 'PL-EXP-' + Date.now().toString(36).toUpperCase()
}) => {
  const { company } = useCompanyProfile();

  const handlePrint = () => {
    window.print();
  };

  const formattedJoining = new Date(joiningDate).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const formattedOffboard = new Date(offboardedAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const currentDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Official ${letterType === 'EXPERIENCE' ? 'Experience Letter' : 'Relieving & Clearance Letter'}`} maxWidth="lg">
      <div className="space-y-4 text-slate-900">
        
        {/* Printable Official Letterhead */}
        <div
          id="printable-experience-letter"
          className="bg-white border border-slate-300 rounded-xl p-8 sm:p-12 shadow-md text-left font-serif text-slate-800 space-y-6 select-none relative"
        >
          {/* Header Brand */}
          <div className="flex items-center justify-between border-b border-slate-300 pb-6">
            <div className="flex items-center space-x-3">
              <img
                src="/favicon.svg"
                alt={company.companyName}
                className="w-11 h-11 rounded-xl shadow-xs"
              />
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">{company.legalName || company.companyName}</h2>
                <p className="text-[11px] text-slate-500 font-sans">{company.address || 'Headquarters & Engineering Lab, Gulberg III, Lahore, Pakistan'}</p>
                <p className="text-[10px] text-slate-400 font-sans">{company.hrEmail || 'hr@pileandloop.com'} | pileandloop.com</p>
              </div>
            </div>

            <div className="text-right font-sans text-[11px] text-slate-500 space-y-0.5">
              <p className="font-semibold text-slate-700 font-mono">REF: {refNumber}</p>
              <p>Date: {currentDate}</p>
            </div>
          </div>

          {/* Letter Title */}
          <div className="text-center pt-2">
            <h3 className="text-lg font-bold uppercase tracking-wider text-slate-900 underline underline-offset-4">
              {letterType === 'EXPERIENCE' ? 'To Whom It May Concern: Experience Certificate' : 'Official Relieving & Clearance Letter'}
            </h3>
          </div>

          {/* Body Content */}
          <div className="space-y-4 text-xs sm:text-sm leading-relaxed text-slate-700">
            <p>
              This is to certify that <strong>{personName}</strong> was engaged with <strong>{company.companyName}</strong> as a <strong>{jobTitle}</strong> in the <strong>{department}</strong> Department from <strong>{formattedJoining}</strong> to <strong>{formattedOffboard}</strong> ({tenureDurationMonths} Months Tenure).
            </p>

            <p>
              During their tenure with Pile &amp; Loop, <strong>{personName}</strong> demonstrated strong technical acumen, commendable diligence, and adherence to company quality standards. They actively participated in cross-functional engineering deliverables, met project sprints on time, and maintained an exemplary professional conduct.
            </p>

            <p>
              All organizational assets, corporate credentials, code repositories, and communication channels under their custody have been verified, officially handed over, and formally cleared as per our standard offboarding protocol.
            </p>

            <p>
              We express our appreciation for their contributions and wish them every success in their future professional endeavors.
            </p>
          </div>

          {/* Signatures */}
          <div className="pt-10 flex items-end justify-between border-t border-slate-200 font-sans text-xs">
            <div className="space-y-1">
              <div className="font-serif italic text-base font-bold text-slate-900">
                {company.signatoryName || 'Managing Director'}
              </div>
              <div className="h-0.5 w-32 bg-slate-400"></div>
              <p className="text-[11px] font-bold text-slate-800">{company.signatoryTitle || 'Head of Talent & Engineering'}</p>
              <p className="text-[10px] text-slate-500">{company.companyName}</p>
            </div>

            <div className="text-right flex flex-col items-end space-y-1">
              <div className="w-16 h-16 rounded-full border-2 border-emerald-600/40 flex items-center justify-center text-emerald-700 text-[10px] font-bold uppercase text-center p-1 bg-emerald-50/50">
                Official HR Seal
              </div>
              <span className="text-[9px] font-mono text-slate-400">Digitally Verified Record</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-slate-500">Official document rendered in high-definition serif letterhead.</span>
          <div className="flex items-center space-x-2">
            <Button size="sm" variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button size="sm" variant="primary" onClick={handlePrint} className="bg-slate-900 text-white">
              <Printer className="w-3.5 h-3.5 mr-1" />
              Print / Save as PDF
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
