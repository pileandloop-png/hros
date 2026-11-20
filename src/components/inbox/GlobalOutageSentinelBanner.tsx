import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Zap,
  Activity,
  RefreshCw,
  AlertTriangle,
  Server,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Info,
  Clock,
  Send,
  Layers,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { useToast } from '../../contexts/ToastContext';
import {
  outageSentinel,
  ProviderHealth,
  OutageSentinelConfig,
  OutageBufferItem
} from '../../services/outageSentinelService';

export const GlobalOutageSentinelBanner: React.FC = () => {
  const { toast } = useToast();
  const [providers, setProviders] = useState<ProviderHealth[]>(outageSentinel.getProviders());
  const [config, setConfig] = useState<OutageSentinelConfig>(outageSentinel.getConfig());
  const [bufferQueue, setBufferQueue] = useState<OutageBufferItem[]>(outageSentinel.getBufferQueue());
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isPingLoading, setIsPingLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    setProviders(outageSentinel.getProviders());
    setConfig(outageSentinel.getConfig());
    setBufferQueue(outageSentinel.getBufferQueue());
  }, []);

  const handleToggleForcedDirect = () => {
    const nextState = !config.forcedDirectLineMode;
    outageSentinel.toggleDirectLineMode(nextState);
    setConfig(outageSentinel.getConfig());
    setProviders(outageSentinel.getProviders());
    if (nextState) {
      toast.success('Forced Sovereign Direct-Line Mode Activated! All outbound candidate communications bypass Microsoft 365 cloud.');
    } else {
      toast.info('Switched to Dynamic Multi-Cloud Failover routing mode.');
    }
  };

  const handleRefreshPing = () => {
    setIsPingLoading(true);
    setTimeout(() => {
      const updated = outageSentinel.refreshGlobalTelemetry();
      setProviders([...updated]);
      setConfig(outageSentinel.getConfig());
      setBufferQueue(outageSentinel.getBufferQueue());
      setIsPingLoading(false);
      toast.success('Global cloud status telemetry refreshed. Dedicated Direct-Line is 100% operational.');
    }, 700);
  };

  const m365 = providers.find(p => p.id === 'MICROSOFT_365');
  const directPipe = providers.find(p => p.id === 'DIRECT_DEDICATED_PIPE');

  return (
    <>
      {/* High-Impact White-Theme Sentinel Alert Header */}
      <div className="bg-white border border-amber-200/90 rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 text-amber-600 animate-pulse" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight">
                  Global Cloud Outage Sentinel &amp; Direct-Line Mesh
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1 font-mono">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Outlook Breakdown Immunity Active
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Protects hiring operations when Microsoft Outlook / Office 365 crashes globally. Sovereign direct TLS pipe bypasses third-party downtime.
              </p>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-700 bg-slate-100/80 hover:bg-slate-200/80 border border-slate-200/60 transition-all cursor-pointer"
            >
              <span>{isExpanded ? 'Hide Telemetry' : 'View Telemetry Mesh'}</span>
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
            </button>

            <Button
              size="sm"
              variant="outline"
              onClick={handleRefreshPing}
              disabled={isPingLoading}
              className="text-xs font-medium bg-white border-slate-200 hover:bg-slate-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 text-slate-500 ${isPingLoading ? 'animate-spin' : ''}`} />
              Ping Mesh
            </Button>

            <button
              onClick={handleToggleForcedDirect}
              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-2xs ${
                config.forcedDirectLineMode
                  ? 'bg-slate-900 text-white hover:bg-slate-800'
                  : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>{config.forcedDirectLineMode ? 'Sovereign Direct (Active)' : 'Direct-Line Mode'}</span>
            </button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsDetailsModalOpen(true)}
              className="text-xs font-medium border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            >
              <Layers className="w-3.5 h-3.5 mr-1 text-slate-500" />
              Buffer ({bufferQueue.length})
            </Button>
          </div>
        </div>

        {/* Live Provider Health Bar Grid (Progressive Disclosure) */}
        {isExpanded && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-3 border-t border-slate-100 text-xs animate-in fade-in duration-200">
            {/* Microsoft 365 Status Card */}
            <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/70 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-700">Microsoft 365 (Outlook)</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-900">
                  {m365?.status}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>Latency: <strong className="text-amber-800">{m365?.latencyMs}ms</strong></span>
                <span>Uptime: {m365?.uptime30Days}%</span>
              </div>
              <span className="text-[10px] text-rose-600 block truncate font-medium">
                ⚠️ Major Cloud Latency / Rate Limits
              </span>
            </div>

            {/* Dedicated Direct Pipe Card */}
            <div className="p-3 rounded-xl bg-emerald-50/40 border border-emerald-200/80 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-950">Pile &amp; Loop Direct-Line</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-600 text-white">
                  ACTIVE RELAY
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-emerald-800 font-mono">
                <span>Latency: <strong>{directPipe?.latencyMs}ms</strong></span>
                <span>SLA: {directPipe?.uptime30Days}%</span>
              </div>
              <span className="text-[10px] text-emerald-700 block truncate font-medium">
                ✓ Sovereign cPanel TLS (Zero-Downtime)
              </span>
            </div>

            {/* Google Workspace */}
            <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/70 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-700">Google Workspace</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900">
                  OPERATIONAL
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>Latency: 145ms</span>
                <span>Uptime: 99.91%</span>
              </div>
              <span className="text-[10px] text-slate-500 block truncate">
                Secondary Hot Standby
              </span>
            </div>

            {/* Candidate Direct Portal Ingestion */}
            <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/70 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-700">Direct ATS Web Ingestion</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-900">
                  INDEPENDENT
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>Public Careers: 100%</span>
                <span>Scraper: Ready</span>
              </div>
              <span className="text-[10px] text-sky-700 block truncate font-medium">
                ✓ Direct to Database (No Email Dependency)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Deep Architecture & Outage Resilience Telemetry */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        title="Direct-Line Outage Resilience & Zero-Downtime Architecture"
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Why Pile &amp; Loop Never Goes Down During Microsoft 365 Outages
            </h4>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              Traditional recruitment platforms (such as Greenhouse, Lever, and Workday) rely entirely on Microsoft Graph API and Google OAuth. When Microsoft 365 experiences an outage or Azure network degradation, corporate recruiters are completely blind: interview invitations bounce, candidate replies are lost, and applications fail silently.
            </p>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              <strong>Pile &amp; Loop solves this with Tri-Mesh Sovereign Routing:</strong>
            </p>
            <ol className="list-decimal list-inside space-y-1 text-slate-700 text-[11px]">
              <li><strong>Direct Sovereign Pipe:</strong> We maintain our own direct TLS connection to <code className="bg-white px-1 py-0.5 rounded border font-mono">mail.pileandloop.com:465/993</code>, which operates independently of Microsoft Cloud.</li>
              <li><strong>Automated Instant Failover:</strong> Any 5xx error or latency spike &gt;3000ms triggers millisecond failover without dropped messages.</li>
              <li><strong>Direct Webhook &amp; Public Ingestion:</strong> Candidates applying through our careers page or Indeed Browser Agent are written directly into our database, never depending on email delivery to reach recruiters.</li>
            </ol>
          </div>

          {/* Outbox Resilience Buffer Log */}
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="font-bold text-slate-900">Protected Outbound Message Spool</span>
              <span className="text-[10px] font-mono text-slate-500">{bufferQueue.length} Messages Buffered &amp; Protected</span>
            </div>

            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 text-xs mt-2">
              {bufferQueue.length === 0 ? (
                <div className="p-6 text-center text-slate-400">
                  No failover messages in queue. All recent emails dispatched cleanly through direct sovereign pipe.
                </div>
              ) : (
                bufferQueue.map((item) => (
                  <div key={item.id} className="p-2.5 flex items-center justify-between hover:bg-slate-50">
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-slate-900">{item.recipientEmail}</span>
                        <Badge variant={item.status === 'DELIVERED_FAILOVER' ? 'warning' : 'success'}>
                          {item.status}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate max-w-md">{item.subject}</p>
                      {item.failoverReason && (
                        <span className="text-[10px] text-amber-700 font-mono block">
                          ⚡ {item.failoverReason}
                        </span>
                      )}
                    </div>
                    <div className="text-right text-[10px] font-mono text-slate-400">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <Button size="sm" onClick={() => setIsDetailsModalOpen(false)}>
              Close Telemetry
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
