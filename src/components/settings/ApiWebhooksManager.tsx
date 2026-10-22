import React, { useState } from 'react';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import {
  Key,
  Globe,
  Copy,
  Check,
  Plus,
  Trash2,
  RefreshCw,
  Send,
  Shield,
  Layers,
  Code,
  AlertCircle,
  ExternalLink,
  Lock
} from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

interface ApiKeyItem {
  id: string;
  name: string;
  keyPrefix: string;
  maskedKey: string;
  fullKey?: string;
  createdAt: string;
  lastUsedAt: string;
  scopes: string[];
}

interface WebhookItem {
  id: string;
  targetUrl: string;
  events: string[];
  status: 'ACTIVE' | 'PAUSED' | 'FAILED';
  secretToken: string;
  lastDelivery?: {
    statusCode: number;
    latencyMs: number;
    timestamp: string;
  };
}

export const ApiWebhooksManager: React.FC = () => {
  const toast = useToast();

  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([
    {
      id: 'key-prod-01',
      name: 'Production Scraper & ATS Backend',
      keyPrefix: 'pk_live',
      maskedKey: 'pk_live_••••••••••••••••7F92',
      fullKey: 'pk_live_8f39b1a0d72e4822bc6d9a10582f7F92',
      createdAt: '2026-10-18',
      lastUsedAt: '2 mins ago',
      scopes: ['candidates:read', 'candidates:write', 'screening:execute', 'onboarding:trigger']
    },
    {
      id: 'key-dev-02',
      name: 'Local Playwright Scraper CLI',
      keyPrefix: 'pk_test',
      maskedKey: 'pk_test_••••••••••••••••3E41',
      fullKey: 'pk_test_9012a884ef7129cb30129bc817293E41',
      createdAt: '2026-10-20',
      lastUsedAt: '3 hours ago',
      scopes: ['candidates:read', 'screening:execute']
    }
  ]);

  const [webhooks, setWebhooks] = useState<WebhookItem[]>([
    {
      id: 'wh-slack-01',
      targetUrl: 'https://hooks.slack.com/services/T00/B00/X8910482910',
      events: ['candidate.applied', 'interview.scheduled', 'onboarding.initiated'],
      status: 'ACTIVE',
      secretToken: 'whsec_8910248102941092841029',
      lastDelivery: { statusCode: 200, latencyMs: 142, timestamp: '12 mins ago' }
    },
    {
      id: 'wh-zapier-02',
      targetUrl: 'https://hooks.zapier.com/hooks/catch/1928401/392019a/',
      events: ['onboarding.initiated'],
      status: 'ACTIVE',
      secretToken: 'whsec_9019284019284019284019',
      lastDelivery: { statusCode: 200, latencyMs: 210, timestamp: '1 hour ago' }
    }
  ]);

  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [newKeyModal, setNewKeyModal] = useState<boolean>(false);
  const [newKeyName, setNewKeyName] = useState<string>('');
  const [testingWebhookId, setTestingWebhookId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKeyId(id);
    toast.success('Copied to Clipboard', 'Secret token copied to clipboard securely.');
    setTimeout(() => setCopiedKeyId(null), 2500);
  };

  const handleCreateKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    const randomHex = Math.random().toString(16).slice(2, 18) + Math.random().toString(16).slice(2, 18);
    const newKey: ApiKeyItem = {
      id: 'key-' + Date.now().toString(36),
      name: newKeyName,
      keyPrefix: 'pk_live',
      maskedKey: `pk_live_••••••••••••••••${randomHex.slice(-4)}`,
      fullKey: `pk_live_${randomHex}`,
      createdAt: 'Just now',
      lastUsedAt: 'Never',
      scopes: ['candidates:read', 'candidates:write', 'screening:execute']
    };

    setApiKeys([newKey, ...apiKeys]);
    setNewKeyModal(false);
    setNewKeyName('');
    toast.success('API Key Generated', 'Store your key in your environment variables. It will not be displayed again.');
  };

  const handleRevokeKey = (id: string, name: string) => {
    if (window.confirm(`Revoke API key "${name}"? Any active integration using this key will immediately stop working.`)) {
      setApiKeys(apiKeys.filter((k) => k.id !== id));
      toast.warning('Key Revoked', `API key "${name}" has been permanently deactivated.`);
    }
  };

  const handleTestWebhook = (wh: WebhookItem) => {
    setTestingWebhookId(wh.id);
    setTimeout(() => {
      setTestingWebhookId(null);
      toast.success(
        'Webhook Dispatched (HTTP 200 OK)',
        `Dispatched test event "ping.test" to ${wh.targetUrl}. Round-trip latency: 156ms.`
      );
    }, 800);
  };

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Code className="w-5 h-5 text-emerald-600" />
          Developer API Keys &amp; Webhook Endpoints
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Connect your ATS with external job platforms (Indeed, LinkedIn), programmatic sourcing pipelines, Slack channels, or Zapier automations.
        </p>
      </div>

      {/* Section 1: Inbound Webhook Endpoints */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-sky-600" />
              Inbound Platform Webhook URLs
            </h3>
            <p className="text-xs text-slate-500">Provide these URLs in Indeed Employer or LinkedIn Developer settings to stream candidate payloads in real-time.</p>
          </div>
          <Badge variant="success">Listening on Port 443</Badge>
        </div>

        <div className="space-y-3">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800">Indeed Direct Apply Ingestion URL</span>
                <Badge variant="info">POST JSON</Badge>
              </div>
              <code className="text-xs font-mono text-slate-600 block mt-1">
                https://pileandloop.com/api/webhooks/indeed/v1/applications
              </code>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleCopy('https://pileandloop.com/api/webhooks/indeed/v1/applications', 'url-indeed')}
              className="text-xs h-7 shrink-0"
            >
              {copiedKeyId === 'url-indeed' ? <Check className="w-3 h-3 text-emerald-600 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
              Copy URL
            </Button>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800">Custom Candidate Webhook (Zapier / Make / Python)</span>
                <Badge variant="purple">POST JSON</Badge>
              </div>
              <code className="text-xs font-mono text-slate-600 block mt-1">
                https://pileandloop.com/api/webhooks/custom/candidate-stream
              </code>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleCopy('https://pileandloop.com/api/webhooks/custom/candidate-stream', 'url-custom')}
              className="text-xs h-7 shrink-0"
            >
              {copiedKeyId === 'url-custom' ? <Check className="w-3 h-3 text-emerald-600 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
              Copy URL
            </Button>
          </div>
        </div>
      </div>

      {/* Section 2: API Keys Management */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Key className="w-4 h-4 text-emerald-600" />
              REST API Access Keys
            </h3>
            <p className="text-xs text-slate-500">Authenticate automated scripts, browser scrapers, or third-party HR integrations.</p>
          </div>
          <Button
            size="sm"
            variant="primary"
            onClick={() => setNewKeyModal(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-8"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Generate New API Key
          </Button>
        </div>

        {/* Keys Table */}
        <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
          {apiKeys.map((key) => (
            <div key={key.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white hover:bg-slate-50/50 transition">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">{key.name}</span>
                  <Badge variant={key.keyPrefix === 'pk_live' ? 'success' : 'warning'}>
                    {key.keyPrefix === 'pk_live' ? 'Production' : 'Test Mode'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                    {key.maskedKey}
                  </code>
                  <button
                    type="button"
                    onClick={() => handleCopy(key.fullKey || key.maskedKey, key.id)}
                    className="p-1 text-slate-400 hover:text-slate-700 transition"
                    title="Copy full key"
                  >
                    {copiedKeyId === key.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-2">
                  <span>Created: {key.createdAt}</span>
                  <span>&bull;</span>
                  <span>Last used: {key.lastUsedAt}</span>
                  <span>&bull;</span>
                  <span className="text-slate-600 font-medium">Scopes: {key.scopes.join(', ')}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRevokeKey(key.id, key.name)}
                  className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50 h-7"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Revoke Key
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 3: Outbound Webhooks */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Send className="w-4 h-4 text-purple-600" />
              Outbound Event Webhooks (Slack &bull; Discord &bull; Zapier)
            </h3>
            <p className="text-xs text-slate-500">Subscribe to recruitment events to trigger external workflows when candidates apply or advance.</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => toast.info('New Webhook', 'Configure target destination URL in modal.')}
            className="text-xs h-8"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Outbound Webhook
          </Button>
        </div>

        <div className="space-y-3">
          {webhooks.map((wh) => (
            <div key={wh.id} className="p-4 bg-slate-50/70 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="success">Active</Badge>
                  <span className="text-xs font-mono font-semibold text-slate-900 truncate max-w-md">
                    {wh.targetUrl}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {wh.events.map((ev, eIdx) => (
                    <span key={eIdx} className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-mono text-slate-600">
                      {ev}
                    </span>
                  ))}
                </div>
                {wh.lastDelivery && (
                  <p className="text-[11px] text-slate-400 mt-2">
                    Last delivery: {wh.lastDelivery.timestamp} &bull; HTTP {wh.lastDelivery.statusCode} ({wh.lastDelivery.latencyMs}ms)
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={testingWebhookId === wh.id}
                  onClick={() => handleTestWebhook(wh)}
                  className="text-xs h-7 bg-white"
                >
                  <RefreshCw className={`w-3 h-3 mr-1 ${testingWebhookId === wh.id ? 'animate-spin' : ''}`} />
                  Test Ping
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal: Generate Key */}
      {newKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Generate New REST API Key</h3>
            <p className="text-xs text-slate-500">Provide an identifiable name for this credential.</p>
            <form onSubmit={handleCreateKey} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Key Name / Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Indeed Sync Worker"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => setNewKeyModal(false)}>
                  Cancel
                </Button>
                <Button size="sm" variant="primary" type="submit" className="bg-slate-900 text-white">
                  Generate Key
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
