import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { useCompanyProfile } from '../../contexts/CompanyContext';
import { Award, Download, Share2, CheckCircle2, ShieldCheck, Printer } from 'lucide-react';

interface CertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  internName: string;
  role: string;
  department: string;
  durationMonths?: number;
  startDate?: string;
  completionDate?: string;
  certificateId?: string;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({
  isOpen,
  onClose,
  internName,
  role,
  department,
  durationMonths = 4,
  startDate = 'June 2026',
  completionDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
  certificateId = 'PL-CERT-' + Date.now().toString(36).toUpperCase()
}) => {
  const { company } = useCompanyProfile();

  const handlePrint = () => {
    window.print();
  };

  const handleShareLinkedIn = () => {
    const text = encodeURIComponent(`Proud to announce that I have successfully completed my ${durationMonths}-month internship as a ${role} at ${company.companyName}! Certificate ID: ${certificateId}`);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=https://hros-beryl.vercel.app/verify/${certificateId}&summary=${text}`, '_blank');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Internship Completion Certificate" maxWidth="lg">
      <div className="space-y-4">
        
        {/* Printable Certificate Frame */}
        <div
          id="printable-certificate"
          className="relative bg-gradient-to-br from-amber-50/40 via-white to-amber-50/30 border-8 border-double border-amber-600/60 rounded-xl p-8 text-center shadow-lg text-slate-900 select-none overflow-hidden"
        >
          {/* Subtle Background Badge Watermark */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
            <Award className="w-96 h-96 text-slate-900" />
          </div>

          {/* Top Emblem & Brand */}
          <div className="flex flex-col items-center space-y-1.5 mb-6">
            {company.logoUrl ? (
              <img src={company.logoUrl} alt={company.companyName} className="h-12 max-w-[150px] object-contain mb-1" />
            ) : (
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-extrabold text-xl shadow-md"
                style={{ backgroundColor: company.primaryColor || '#10B981' }}
              >
                {company.companyName.slice(0, 3).toUpperCase()}
              </div>
            )}
            <h4 className="text-xs font-bold tracking-widest text-slate-400 uppercase">{company.legalName || company.companyName}</h4>
            <div className="h-0.5 w-16 bg-amber-500 rounded-full my-1"></div>
            <h2 className="text-2xl sm:text-3xl font-serif tracking-wide text-slate-900 uppercase font-semibold">
              Certificate of Completion
            </h2>
            <p className="text-xs text-amber-700 font-medium tracking-wider uppercase">
              Official Program Recognition
            </p>
          </div>

          {/* Recipient */}
          <div className="space-y-2 my-6">
            <p className="text-xs text-slate-500 italic">This is to proudly certify that</p>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-serif border-b border-slate-200 pb-2 inline-block px-8">
              {internName || 'Candidate Name'}
            </h3>
            <p className="text-xs text-slate-600 max-w-lg mx-auto leading-relaxed pt-2">
              has successfully completed a rigorous <strong>{durationMonths}-Month Internship</strong> in the <strong>{department}</strong> Department as a <strong>{role}</strong>, demonstrating exceptional dedication, technical skill, and professional excellence.
            </p>
          </div>

          {/* Signatures & Verification Grid */}
          <div className="grid grid-cols-3 items-end pt-8 mt-6 border-t border-slate-100 text-xs text-slate-600">
            {/* Signature 1 */}
            <div className="text-center">
              <div className="font-serif italic text-base text-slate-800 font-semibold mb-1">
                {company.signatoryName || 'Executive Director'}
              </div>
              <div className="h-px w-28 bg-slate-400 mx-auto mb-1"></div>
              <p className="text-[10px] font-bold text-slate-700">{company.signatoryTitle || 'Managing Director'}</p>
              <p className="text-[9px] text-slate-400">{company.companyName}</p>
            </div>

            {/* Middle Seal / QR code */}
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 rounded-full border-2 border-amber-600/70 flex flex-col items-center justify-center bg-amber-100/40 text-amber-900 shadow-inner">
                <ShieldCheck className="w-6 h-6 text-amber-600" />
                <span className="text-[8px] font-bold tracking-tighter uppercase">Verified</span>
              </div>
              <p className="text-[9px] font-mono text-slate-400 mt-1">{certificateId}</p>
            </div>

            {/* Signature 2 */}
            <div className="text-center">
              <div className="font-serif italic text-base text-slate-800 font-semibold mb-1">
                Office of Talent &amp; Culture
              </div>
              <div className="h-px w-28 bg-slate-400 mx-auto mb-1"></div>
              <p className="text-[10px] font-bold text-slate-700">Head of Human Resources</p>
              <p className="text-[9px] text-slate-400">{company.companyName}</p>
            </div>
          </div>

          <div className="mt-6 pt-3 text-[10px] text-slate-400 flex items-center justify-between border-t border-slate-100/60">
            <span>Issue Date: {completionDate}</span>
            <span>Verify at: https://hros-beryl.vercel.app/verify/{certificateId}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
          <Button size="sm" variant="outline" onClick={onClose}>
            Close
          </Button>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleShareLinkedIn} className="text-[#0A66C2] border-[#0A66C2]/30 hover:bg-[#0A66C2]/10">
              <Share2 className="w-3.5 h-3.5 mr-1" />
              Share on LinkedIn
            </Button>
            <Button size="sm" onClick={handlePrint} className="bg-sky-600 hover:bg-sky-700 text-white">
              <Printer className="w-3.5 h-3.5 mr-1" />
              Print / Save PDF
            </Button>
          </div>
        </div>

      </div>
    </Modal>
  );
};
