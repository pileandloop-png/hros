import React, { useState, useRef } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { useCompanyProfile } from '../../contexts/CompanyContext';
import { ShieldCheck, Upload, Download, CheckCircle2, Lock, Eye, AlertCircle } from 'lucide-react';

interface CnicWatermarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  personName: string;
  onSaveWatermarked?: (dataUrl: string) => void;
}

export const CnicWatermarkModal: React.FC<CnicWatermarkModalProps> = ({
  isOpen,
  onClose,
  personName,
  onSaveWatermarked
}) => {
  const { company } = useCompanyProfile();
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [watermarkedDataUrl, setWatermarkedDataUrl] = useState<string | null>(null);
  const [watermarkText, setWatermarkText] = useState(`FOR ${company.companyName.toUpperCase()} HR USE ONLY`);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      setImageSrc(src);
      applyWatermark(src);
    };
    reader.readAsDataURL(file);
  };

  const applyWatermark = (src: string) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = canvasRef.current || document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // Setup watermark style
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(-Math.PI / 6); // -30 degrees angle

      const dateStr = new Date().toISOString().split('T')[0];
      const stampText = `${watermarkText} • ${dateStr} • ${personName}`;

      // Watermark Box Background
      ctx.font = `bold ${Math.max(18, Math.round(canvas.width / 24))}px sans-serif`;
      const textMetrics = ctx.measureText(stampText);
      const padding = 20;

      ctx.fillStyle = 'rgba(239, 68, 68, 0.25)'; // Semi-transparent Red
      ctx.fillRect(-textMetrics.width / 2 - padding, -30, textMetrics.width + padding * 2, 60);

      // Watermark Text
      ctx.fillStyle = 'rgba(185, 28, 28, 0.85)'; // Bold Red
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(stampText, 0, 0);

      // Watermark Border
      ctx.strokeStyle = 'rgba(185, 28, 28, 0.7)';
      ctx.lineWidth = 3;
      ctx.strokeRect(-textMetrics.width / 2 - padding, -30, textMetrics.width + padding * 2, 60);

      ctx.restore();

      const resultUrl = canvas.toDataURL('image/jpeg', 0.9);
      setWatermarkedDataUrl(resultUrl);
    };
    img.src = src;
  };

  const handleDownload = () => {
    if (!watermarkedDataUrl) return;
    const link = document.createElement('a');
    link.href = watermarkedDataUrl;
    link.download = `CNIC_Watermarked_${personName.replace(/\s+/g, '_')}.jpg`;
    link.click();
  };

  const handleSave = () => {
    if (watermarkedDataUrl && onSaveWatermarked) {
      onSaveWatermarked(watermarkedDataUrl);
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="CNIC Security Watermarking Tool" maxWidth="md">
      <div className="space-y-4 text-xs">
        
        {/* Compliance notice */}
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5 text-amber-900">
          <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Pakistani Identity Protection Standard</p>
            <p className="text-[11px] text-amber-700 mt-0.5">
              Government CNIC card scans must be watermarked with company purpose and date to prevent unauthorized reproduction or third-party misuse.
            </p>
          </div>
        </div>

        {/* Upload Zone */}
        {!imageSrc ? (
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50 hover:bg-slate-100 transition">
            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="font-semibold text-slate-700 text-xs">Select or Drag CNIC Image (Front or Back)</p>
            <p className="text-[11px] text-slate-400 mt-0.5">JPG, PNG, WebP up to 10MB</p>
            <label className="mt-4 inline-block px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-sm transition">
              Upload CNIC File
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Watermark Preview */}
            <div className="relative border rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center p-2 max-h-72">
              <img
                src={watermarkedDataUrl || imageSrc}
                alt="Watermarked CNIC Preview"
                className="max-h-64 object-contain rounded-lg"
              />
              <canvas ref={canvasRef} className="hidden" />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Immutable Watermark Applied
              </span>
              <label className="text-sky-600 hover:underline cursor-pointer">
                Upload Different File
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <Button size="sm" variant="outline" onClick={onClose}>
            Cancel
          </Button>

          <div className="flex items-center gap-2">
            {watermarkedDataUrl && (
              <>
                <Button size="sm" variant="outline" onClick={handleDownload}>
                  <Download className="w-3.5 h-3.5 mr-1" />
                  Download Watermarked JPG
                </Button>
                <Button size="sm" onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  Save to Profile
                </Button>
              </>
            )}
          </div>
        </div>

      </div>
    </Modal>
  );
};
