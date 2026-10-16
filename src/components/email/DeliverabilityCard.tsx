import React, { useState } from 'react';
import { DeliverabilityTelemetry } from '../../services/cvAnalysisService';
import {
  ShieldCheck,
  CheckCircle2,
  Server,
  Key,
  Clock,
  ChevronDown,
  ChevronUp,
  Terminal,
  Send,
  X
} from 'lucide-react';

interface DeliverabilityCardProps {
  telemetry: DeliverabilityTelemetry;
  onClose?: () => void;
  compact?: boolean;
}

export const DeliverabilityCard: React.FC<DeliverabilityCardProps> = ({
  telemetry,
  onClose,
  compact = false
}) => {
  const [showLogs, setShowLogs] = useState(false);

  return (
    <div className="bg-white text-slate-900 rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-3 animate-in fade-in slide-in-from-top-2 select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 flex items-center space-x-2">
              <span>cPanel SMTP Deliverability Telemetry</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono font-semibold">
                {telemetry.status}
              </span>
            </h4>
            <p className="text-[10px] text-slate-500">
              Dispatched via {telemetry.smtpServer}:{telemetry.port} ({telemetry.protocol})
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="text-right">
            <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-semibold">
              Inbox Placement Score
            </span>
            <span className="text-xs font-black text-emerald-600">
              {telemetry.deliverabilityScore}%
            </span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        {/* SPF Status */}
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
          <span className="text-[10px] text-slate-500 block font-medium">SPF Alignment</span>
          <div className="flex items-center space-x-1.5 mt-0.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-semibold text-emerald-700 font-mono text-[11px]">{telemetry.spfStatus}</span>
          </div>
          <span className="text-[9px] text-slate-400 block truncate mt-0.5">mail.pileandloop.com</span>
        </div>

        {/* DKIM Status */}
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
          <span className="text-[10px] text-slate-500 block font-medium">DKIM Signature</span>
          <div className="flex items-center space-x-1.5 mt-0.5">
            <Key className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-semibold text-emerald-700 font-mono text-[11px]">{telemetry.dkimStatus}</span>
          </div>
          <span className="text-[9px] text-slate-400 block truncate mt-0.5">d=pileandloop.com</span>
        </div>

        {/* Latency */}
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
          <span className="text-[10px] text-slate-500 block font-medium">Handshake Latency</span>
          <div className="flex items-center space-x-1.5 mt-0.5">
            <Clock className="w-3.5 h-3.5 text-sky-600" />
            <span className="font-semibold text-sky-700 font-mono text-[11px]">{telemetry.deliveryLatencyMs} ms</span>
          </div>
          <span className="text-[9px] text-slate-400 block truncate mt-0.5">TLS v1.3</span>
        </div>

        {/* Recipient */}
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
          <span className="text-[10px] text-slate-500 block font-medium">Recipient</span>
          <div className="flex items-center space-x-1.5 mt-0.5 truncate">
            <Send className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            <span className="font-semibold text-slate-800 text-[11px] truncate">{telemetry.recipient}</span>
          </div>
          <span className="text-[9px] text-slate-400 block truncate mt-0.5">250 OK Delivered</span>
        </div>
      </div>

      {/* Message ID Bar */}
      <div className="flex items-center justify-between text-[10px] bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200/70 font-mono">
        <span className="text-slate-500 font-medium">Message-ID:</span>
        <span className="text-slate-700 truncate max-w-xs">{telemetry.messageId}</span>
      </div>

      {/* Collapsible SMTP Logs */}
      <div>
        <button
          type="button"
          onClick={() => setShowLogs(!showLogs)}
          className="w-full flex items-center justify-between text-[10px] text-slate-500 hover:text-slate-800 py-1 transition cursor-pointer"
        >
          <span className="flex items-center space-x-1.5">
            <Terminal className="w-3.5 h-3.5 text-sky-600" />
            <span className="font-medium">SMTP Handshake & Verification Logs ({telemetry.logs.length} events)</span>
          </span>
          {showLogs ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showLogs && (
          <div className="mt-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono text-[10px] text-slate-700 space-y-1 max-h-40 overflow-y-auto scrollbar-thin">
            {telemetry.logs.map((log, idx) => (
              <p key={idx} className="leading-relaxed">
                {log}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
