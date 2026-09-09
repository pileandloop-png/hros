import React, { useState, useRef } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { FileText, CheckCircle2, PenTool, Printer, ShieldCheck } from 'lucide-react';

interface OfferLetterModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateName: string;
  candidateEmail: string;
  vacancyTitle: string;
  department?: string;
  stipendPkr?: number;
  startDate?: string;
  durationMonths?: number;
  onAcceptAndSign?: (signedData: { signatureUrl: string; signedAt: string }) => void;
}

export const OfferLetterModal: React.FC<OfferLetterModalProps> = ({
  isOpen,
  onClose,
  candidateName,
  candidateEmail,
  vacancyTitle,
  department = 'Engineering',
  stipendPkr = 35000,
  startDate = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
  durationMonths = 4,
  onAcceptAndSign
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);
  const [signatureMode, setSignatureMode] = useState<'draw' | 'type'>('type');
  const [typedSignature, setTypedSignature] = useState(candidateName || '');
  const [isAccepted, setIsAccepted] = useState(false);

  // Canvas drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setIsDrawing(true);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    ctx.stroke();
    setHasSigned(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
  };

  const handleSignAndAccept = () => {
    setIsAccepted(true);
    if (onAcceptAndSign) {
      onAcceptAndSign({
        signatureUrl: signatureMode === 'type' ? `typed:${typedSignature}` : 'drawn:canvas',
        signedAt: new Date().toISOString()
      });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Official Offer Agreement" maxWidth="lg">
      <div className="space-y-4 text-xs">
        
        {/* Printable Offer Document */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-sm text-slate-800 font-sans">
          
          {/* Letterhead */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-700 flex items-center justify-center text-white font-bold text-base shadow-sm">
                P&L
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Pile & Loop</h3>
                <p className="text-[10px] text-slate-400">Software Engineering & Product Studio ? Lahore, Pakistan</p>
              </div>
            </div>
            <div className="text-right text-[11px] text-slate-500">
              <p>Date: <strong>{new Date().toLocaleDateString('en-PK')}</strong></p>
              <p>Ref: <span className="font-mono font-semibold">PL-OFFER-{Date.now().toString(36).toUpperCase()}</span></p>
            </div>
          </div>

          {/* Recipient */}
          <div className="space-y-1">
            <p className="text-slate-500">Dear <strong>{candidateName}</strong>,</p>
            <p className="text-slate-500 font-mono text-[11px]">{candidateEmail}</p>
          </div>

          <p className="leading-relaxed">
            We are pleased to extend this offer for the position of <strong>{vacancyTitle}</strong> in the <strong>{department}</strong> department at <strong>Pile & Loop</strong>. We were thoroughly impressed by your skills, problem-solving mindset, and cultural alignment with our team.
          </p>

          {/* Key Offer Terms Table */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
            <h4 className="font-bold text-slate-900 text-xs border-b border-slate-200 pb-1">Key Terms of Agreement</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[11px]">
              <div>
                <span className="text-slate-400 block">Position</span>
                <span className="font-semibold text-slate-800">{vacancyTitle}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Monthly Stipend</span>
                <span className="font-semibold text-emerald-700 font-mono">PKR {stipendPkr.toLocaleString()} / mo</span>
              </div>
              <div>
                <span className="text-slate-400 block">Working Hours (PKT)</span>
                <span className="font-semibold text-slate-800">09:00 - 18:00 (1hr lunch)</span>
              </div>
              <div>
                <span className="text-slate-400 block">Start Date</span>
                <span className="font-semibold text-slate-800">{startDate}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Tenure Duration</span>
                <span className="font-semibold text-slate-800">{durationMonths} Months</span>
              </div>
              <div>
                <span className="text-slate-400 block">Work Model</span>
                <span className="font-semibold text-slate-800">Hybrid / Office Presence</span>
              </div>
            </div>
          </div>

          <p className="leading-relaxed text-[11px] text-slate-600">
            During your tenure, you will work on production features, attend stand-ups, receive 1-on-1 engineering mentorship, and track daily attendance via the HROS platform.
          </p>

          {/* Signature Block */}
          <div className="border-t border-slate-200 pt-4 space-y-3">
            <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <PenTool className="w-3.5 h-3.5 text-sky-600" />
              Digital Acceptance & Electronic Signature
            </h4>

            {isAccepted ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                <div>
                  <h5 className="font-bold text-emerald-900">Offer Accepted & Digitally Signed</h5>
                  <p className="text-[11px] text-emerald-700 font-mono">
                    Signed by {candidateName} on {new Date().toLocaleString()} (Verified)
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSignatureMode('type')}
                    className={`px-3 py-1 rounded text-xs font-semibold ${signatureMode === 'type' ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                  >
                    Type Signature
                  </button>
                  <button
                    type="button"
                    onClick={() => setSignatureMode('draw')}
                    className={`px-3 py-1 rounded text-xs font-semibold ${signatureMode === 'draw' ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                  >
                    Draw on Screen
                  </button>
                </div>

                {signatureMode === 'type' ? (
                  <div>
                    <input
                      type="text"
                      value={typedSignature}
                      onChange={(e) => setTypedSignature(e.target.value)}
                      placeholder="Type your full legal name"
                      className="w-full p-2 border border-slate-300 rounded-lg font-serif italic text-base text-slate-800 bg-amber-50/30"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Typing your name constitutes a legally binding electronic agreement.</p>
                  </div>
                ) : (
                  <div>
                    <canvas
                      ref={canvasRef}
                      width={450}
                      height={100}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      className="w-full border-2 border-dashed border-slate-300 rounded-lg bg-amber-50/20 cursor-crosshair"
                    />
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-slate-400">Sign within the dashed box using your mouse or touch</span>
                      <button type="button" onClick={clearCanvas} className="text-[10px] text-red-600 hover:underline">
                        Clear Canvas
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-2">
          <Button size="sm" variant="outline" onClick={onClose}>
            Close
          </Button>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => window.print()}>
              <Printer className="w-3.5 h-3.5 mr-1" />
              Print Agreement
            </Button>
            {!isAccepted && (
              <Button size="sm" onClick={handleSignAndAccept} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                Sign & Accept Offer
              </Button>
            )}
          </div>
        </div>

      </div>
    </Modal>
  );
};
