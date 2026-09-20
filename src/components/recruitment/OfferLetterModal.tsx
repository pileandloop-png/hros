import React, { useState, useRef, useEffect } from 'react';
import { store } from '../../services/store';
import { sendHrEmail, transitionApplicationStage } from '../../services/api';
import { useCompanyProfile } from '../../contexts/CompanyContext';
import { useToast } from '../../contexts/ToastContext';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import {
  FileText,
  Printer,
  Send,
  PenTool,
  CheckCircle2,
  Building,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Calendar,
  DollarSign
} from 'lucide-react';

interface OfferLetterModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: any;
  application: any;
  onOfferSent: () => void;
}

export const OfferLetterModal: React.FC<OfferLetterModalProps> = ({
  isOpen,
  onClose,
  candidate,
  application,
  onOfferSent,
}) => {
  const { company } = useCompanyProfile();
  const toast = useToast();

  const [positionTitle, setPositionTitle] = useState(
    application?.positionAppliedFor || 'Software Engineering Intern'
  );
  const [department, setDepartment] = useState(candidate?.department || 'Engineering');
  const [stipendAmount, setStipendAmount] = useState('35,000');
  const [currency, setCurrency] = useState('PKR');
  const [startDate, setStartDate] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [durationMonths, setDurationMonths] = useState(4);
  const [reportingManager, setReportingManager] = useState('Kamran Raza (Lead Engineering)');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [signed, setSigned] = useState(false);

  // Canvas Signature Pad
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawnSignature, setHasDrawnSignature] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        initCanvas();
      }, 200);
    }
  }, [isOpen]);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
    setHasDrawnSignature(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawnSignature(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDispatchOfferEmail = async () => {
    const targetEmail = candidate?.personalEmail || candidate?.email;
    if (!targetEmail) {
      toast.error('Missing Email', 'Candidate has no valid email address on file.');
      return;
    }

    setSendingEmail(true);
    try {
      const offerId = 'offer-' + Date.now().toString(36);
      const now = new Date().toISOString();

      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 32px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b;">
          <div style="border-bottom: 2px solid #0284c7; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h1 style="color: #0f172a; margin: 0; font-size: 20px; font-weight: bold;">${company.companyName}</h1>
              <p style="color: #64748b; font-size: 12px; margin: 4px 0 0 0;">Official Offer of Engagement & Internship Agreement</p>
            </div>
            <div style="text-align: right; color: #94a3b8; font-size: 11px;">
              Date: ${new Date().toLocaleDateString()}<br/>
              Ref: ${offerId}
            </div>
          </div>

          <p style="font-size: 14px; line-height: 1.6;">
            Dear <strong>${candidate?.fullName || 'Candidate'}</strong>,<br/><br/>
            On behalf of <strong>${company.companyName}</strong>, we are thrilled to formally offer you the position of <strong>${positionTitle}</strong> in our <strong>${department}</strong> team.
          </p>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px;">
            <tr style="background-color: #f8fafc;">
              <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; width: 35%;">Position Title</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0;">${positionTitle}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">Department</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0;">${department}</td>
            </tr>
            <tr style="background-color: #f8fafc;">
              <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">Stipend / Compensation</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; color: #0284c7;">${currency} ${stipendAmount} / month</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">Commencement Date</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0;">${new Date(startDate).toLocaleDateString()}</td>
            </tr>
            <tr style="background-color: #f8fafc;">
              <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">Tenure Duration</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0;">${durationMonths} Months (Full evaluation at completion)</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">Reporting Lead</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0;">${reportingManager}</td>
            </tr>
          </table>

          <h3 style="font-size: 13px; color: #0f172a; margin-top: 24px;">Terms of Engagement</h3>
          <ul style="font-size: 12px; color: #475569; line-height: 1.6; padding-left: 20px;">
            <li><strong>Confidentiality:</strong> You agree not to disclose proprietary code, business models, or internal client information.</li>
            <li><strong>Intellectual Property:</strong> All software, documentation, and work product developed during your tenure belong exclusively to ${company.companyName}.</li>
            <li><strong>Code of Conduct:</strong> You are expected to maintain professional standards, punctuality in standups, and transparent communication.</li>
          </ul>

          <p style="font-size: 13px; line-height: 1.6; margin-top: 24px;">
            Please reply to this email confirming your acceptance within 48 hours. We look forward to building impactful digital products together!
          </p>

          <div style="margin-top: 36px; padding-top: 20px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between;">
            <div>
              <p style="margin: 0; font-size: 12px; font-weight: bold; color: #0f172a;">Authorized HR Signature</p>
              <p style="margin: 2px 0 0 0; font-size: 11px; color: #64748b;">${company.companyName} Talent Operations</p>
            </div>
          </div>
        </div>
      `;

      await sendHrEmail({
        to: targetEmail,
        subject: `Official Offer of Engagement: ${positionTitle} - ${company.companyName}`,
        htmlBody,
        textBody: `Official Offer of Engagement for ${positionTitle} at ${company.companyName}. Monthly stipend: ${currency} ${stipendAmount}. Joining date: ${startDate}.`,
        candidateId: candidate?.id,
        applicationId: application?.applicationId || application?.id,
        idempotencyKey: `offer-${offerId}`,
      });

      // Save offer record
      store.setDocument('offerLetters', offerId, {
        id: offerId,
        candidateId: candidate?.id,
        candidateName: candidate?.fullName,
        positionTitle,
        department,
        stipendAmount,
        currency,
        startDate,
        durationMonths,
        reportingManager,
        status: 'DISPATCHED',
        createdAt: now,
      });

      // Advance stage to OFFER_SENT
      const appId = application?.applicationId || application?.id;
      if (appId) {
        try {
          await transitionApplicationStage(appId, 'OFFER_SENT' as any);
        } catch {
          // Non-blocking
        }
      }

      toast.success('Offer Dispatched', `Formal offer sent to ${targetEmail} via hr@pileandloop.com.`);
      onOfferSent();
      onClose();
    } catch (err: any) {
      toast.error('Dispatch Failed', err.message || 'Could not send offer email.');
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Generate Formal Offer Letter & Agreement"
      maxWidth="4xl"
    >
      <div className="space-y-4 text-xs">
        {/* Configuration Bar */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
          <div className="flex items-center gap-2 text-slate-800 font-bold">
            <Sparkles className="w-4 h-4 text-sky-600" />
            <span>Contract Terms Configuration</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Position Title</label>
              <input
                type="text"
                value={positionTitle}
                onChange={(e) => setPositionTitle(e.target.value)}
                className="w-full p-1.5 border rounded bg-white font-medium text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Department</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full p-1.5 border rounded bg-white font-medium text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Monthly Stipend ({currency})</label>
              <input
                type="text"
                value={stipendAmount}
                onChange={(e) => setStipendAmount(e.target.value)}
                className="w-full p-1.5 border rounded bg-white font-medium text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Joining / Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full p-1.5 border rounded bg-white font-medium text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Duration (Months)</label>
              <input
                type="number"
                min={1}
                max={12}
                value={durationMonths}
                onChange={(e) => setDurationMonths(Number(e.target.value))}
                className="w-full p-1.5 border rounded bg-white font-medium text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Reporting Lead / Manager</label>
              <input
                type="text"
                value={reportingManager}
                onChange={(e) => setReportingManager(e.target.value)}
                className="w-full p-1.5 border rounded bg-white font-medium text-xs"
              />
            </div>
          </div>
        </div>

        {/* Printable Official Document Preview */}
        <div className="border border-slate-300 rounded-xl p-6 bg-white shadow-xs space-y-4 max-h-96 overflow-y-auto print:border-none print:shadow-none">
          <div className="flex items-center justify-between border-b-2 border-sky-600 pb-3">
            <div className="flex items-center gap-3">
              {company.logoUrl ? (
                <img src={company.logoUrl} alt={company.companyName} className="h-10 object-contain" />
              ) : (
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-base"
                  style={{ backgroundColor: company.primaryColor || '#0284c7' }}
                >
                  {company.companyName.slice(0, 3).toUpperCase()}
                </div>
              )}
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">{company.companyName}</h3>
                <p className="text-[10px] text-slate-500">Official Offer of Engagement & Internship Agreement</p>
              </div>
            </div>
            <div className="text-right text-[10px] text-slate-400">
              <div>Date: {new Date().toLocaleDateString()}</div>
              <div>Lahore, Pakistan</div>
            </div>
          </div>

          <div className="space-y-2 text-xs leading-relaxed text-slate-700">
            <p>
              Dear <strong>{candidate?.fullName || 'Candidate'}</strong>,
            </p>
            <p>
              We are delighted to extend to you an offer of engagement for the position of <strong>{positionTitle}</strong> with <strong>{company.companyName}</strong> in our <strong>{department}</strong> team.
            </p>

            {/* Compensation & Terms Table */}
            <div className="border border-slate-200 rounded-lg overflow-hidden my-3">
              <table className="w-full text-left text-xs">
                <tbody className="divide-y divide-slate-100">
                  <tr className="bg-slate-50">
                    <td className="p-2 font-semibold text-slate-600 w-1/3">Monthly Stipend</td>
                    <td className="p-2 font-bold text-sky-700">{currency} {stipendAmount} / Month</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-semibold text-slate-600">Start Date</td>
                    <td className="p-2 font-medium">{new Date(startDate).toLocaleDateString()}</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="p-2 font-semibold text-slate-600">Tenure Duration</td>
                    <td className="p-2 font-medium">{durationMonths} Months</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-semibold text-slate-600">Reporting Manager</td>
                    <td className="p-2 font-medium">{reportingManager}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="space-y-1 text-[11px] text-slate-600 pt-1">
              <h5 className="font-bold text-slate-800">Core Expectations & Code of Conduct:</h5>
              <ul className="list-disc pl-5 space-y-0.5">
                <li>Strict confidentiality regarding proprietary source code, algorithms, and workspace credentials.</li>
                <li>Ownership of all intellectual property, work product, and documentation created during tenure.</li>
                <li>Daily clock-in/out attendance logging and weekly sprint contribution.</li>
              </ul>
            </div>
          </div>

          {/* Signature Canvas Area */}
          <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-start justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-700 block uppercase">
                Authorized HR Executive
              </span>
              <div className="font-serif italic text-base text-slate-800">
                {company.companyName} Talent Ops
              </div>
              <span className="text-[9px] text-slate-400 block">Verified Corporate Signature</span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold text-slate-700 uppercase flex items-center gap-1">
                  <PenTool className="w-3 h-3 text-sky-600" />
                  Candidate Digital Acceptance Pad
                </span>
                <button
                  type="button"
                  onClick={clearSignature}
                  className="text-[10px] text-slate-400 hover:text-slate-600 flex items-center gap-0.5 cursor-pointer"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  Clear
                </button>
              </div>
              <div className="border border-slate-300 rounded-lg bg-slate-50/70 overflow-hidden">
                <canvas
                  ref={canvasRef}
                  width={240}
                  height={70}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  className="cursor-crosshair bg-white"
                />
              </div>
              <span className="text-[9px] text-slate-400 block">
                {hasDrawnSignature ? '✓ Digital signature captured' : 'Draw signature on canvas to endorse'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <span className="text-[11px] text-slate-500">
            Recipient: <strong>{candidate?.personalEmail || candidate?.email}</strong>
          </span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" type="button" onClick={handlePrint}>
              <Printer className="w-3.5 h-3.5 mr-1" />
              Print / Save PDF
            </Button>
            <Button
              size="sm"
              loading={sendingEmail}
              onClick={handleDispatchOfferEmail}
              className="bg-sky-600 hover:bg-sky-700 text-white font-semibold"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              Dispatch Offer via hr@pileandloop.com
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
