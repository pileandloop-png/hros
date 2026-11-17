import { store } from './store';

export type CloudProviderId = 'MICROSOFT_365' | 'GOOGLE_WORKSPACE' | 'DIRECT_DEDICATED_PIPE' | 'TERTIARY_SES_RELAY';

export interface ProviderHealth {
  id: CloudProviderId;
  name: string;
  category: 'CLOUD_HYPERSCALER' | 'DEDICATED_DIRECT_LINE' | 'ENTERPRISE_FALLBACK';
  status: 'OPERATIONAL' | 'DEGRADED' | 'GLOBAL_OUTAGE' | 'MAINTENANCE';
  latencyMs: number;
  uptime30Days: number;
  lastIncident: string;
  description: string;
  isDirectLine: boolean;
  isActiveRoute: boolean;
}

export interface OutageBufferItem {
  id: string;
  recipientEmail: string;
  subject: string;
  intendedProvider: CloudProviderId;
  routedViaProvider: CloudProviderId;
  status: 'DISPATCHED_DIRECT' | 'BUFFERED_RETRY' | 'DELIVERED_FAILOVER';
  timestamp: string;
  retriesCount: number;
  failoverReason?: string;
}

export interface OutageSentinelConfig {
  autoFailoverEnabled: boolean;
  forcedDirectLineMode: boolean;
  activeProvider: CloudProviderId;
  lastGlobalSyncCheck: string;
  bufferedMessagesCount: number;
  outageIncidentReported: boolean;
}

const STORAGE_CONFIG_KEY = 'hros_outage_sentinel_config';
const STORAGE_PROVIDERS_KEY = 'hros_outage_providers';
const STORAGE_BUFFER_KEY = 'hros_outage_buffer';

const INITIAL_PROVIDERS: ProviderHealth[] = [
  {
    id: 'MICROSOFT_365',
    name: 'Microsoft 365 Exchange Online (Outlook)',
    category: 'CLOUD_HYPERSCALER',
    status: 'DEGRADED', // Illustrates the actual pain point / outage condition
    latencyMs: 4820,
    uptime30Days: 98.42,
    lastIncident: 'Major Global Breakdown (EX824912 / Azure Latency Spike)',
    description: 'Cloud hosted on Microsoft Azure. Subject to global hyperscaler routing collapses and tenant sign-in lockouts.',
    isDirectLine: false,
    isActiveRoute: false
  },
  {
    id: 'DIRECT_DEDICATED_PIPE',
    name: 'Pile & Loop Direct-Line Dedicated TLS Relay (cPanel)',
    category: 'DEDICATED_DIRECT_LINE',
    status: 'OPERATIONAL',
    latencyMs: 38,
    uptime30Days: 99.99,
    lastIncident: 'None (Self-hosted sovereign infrastructure)',
    description: 'Direct sovereign SMTP/IMAP transport on mail.pileandloop.com. 100% decoupled from Microsoft and Google cloud outages.',
    isDirectLine: true,
    isActiveRoute: true // Active direct line
  },
  {
    id: 'GOOGLE_WORKSPACE',
    name: 'Google Workspace (Gmail API)',
    category: 'CLOUD_HYPERSCALER',
    status: 'OPERATIONAL',
    latencyMs: 145,
    uptime30Days: 99.91,
    lastIncident: 'Regional API rate limit throttles',
    description: 'Secondary cloud mail transport.',
    isDirectLine: false,
    isActiveRoute: false
  },
  {
    id: 'TERTIARY_SES_RELAY',
    name: 'Amazon SES High-Throughput Fallback Relay',
    category: 'ENTERPRISE_FALLBACK',
    status: 'OPERATIONAL',
    latencyMs: 64,
    uptime30Days: 99.98,
    lastIncident: 'None',
    description: 'Cold-standby fallback relay triggered only if both M365 and local pipes encounter network partitioning.',
    isDirectLine: false,
    isActiveRoute: false
  }
];

class OutageSentinelService {
  public getConfig(): OutageSentinelConfig {
    try {
      const raw = localStorage.getItem(STORAGE_CONFIG_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      // Fallback
    }
    const def: OutageSentinelConfig = {
      autoFailoverEnabled: true,
      forcedDirectLineMode: true, // By default direct line mode protects all communications
      activeProvider: 'DIRECT_DEDICATED_PIPE',
      lastGlobalSyncCheck: new Date().toISOString(),
      bufferedMessagesCount: 0,
      outageIncidentReported: true
    };
    this.saveConfig(def);
    return def;
  }

  public saveConfig(config: OutageSentinelConfig): void {
    try {
      localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(config));
      store.setDocument('systemSettings', 'outageSentinelConfig', config);
    } catch (e) {
      console.warn('Failed to save outage sentinel config:', e);
    }
  }

  public getProviders(): ProviderHealth[] {
    try {
      const raw = localStorage.getItem(STORAGE_PROVIDERS_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      // Fallback
    }
    this.saveProviders(INITIAL_PROVIDERS);
    return INITIAL_PROVIDERS;
  }

  public saveProviders(providers: ProviderHealth[]): void {
    try {
      localStorage.setItem(STORAGE_PROVIDERS_KEY, JSON.stringify(providers));
      providers.forEach(p => store.setDocument('cloudProviderHealth', p.id, p));
    } catch (e) {
      console.warn('Failed to save providers health:', e);
    }
  }

  public getBufferQueue(): OutageBufferItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_BUFFER_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      // Fallback
    }
    return [];
  }

  public saveBufferQueue(queue: OutageBufferItem[]): void {
    try {
      localStorage.setItem(STORAGE_BUFFER_KEY, JSON.stringify(queue));
    } catch (e) {
      console.warn('Failed to save buffer queue:', e);
    }
  }

  /**
   * Determine the optimal email routing provider with zero-downtime failover
   */
  public resolveOutboundProvider(): { provider: ProviderHealth; wasFailoverTriggered: boolean; reason: string } {
    const config = this.getConfig();
    const providers = this.getProviders();

    // If forced direct line mode is on, always route via our independent sovereign pipe
    if (config.forcedDirectLineMode) {
      const direct = providers.find(p => p.id === 'DIRECT_DEDICATED_PIPE') || providers[1];
      return {
        provider: direct,
        wasFailoverTriggered: false,
        reason: 'Protected by Pile & Loop Sovereign Direct-Line (Outlook Cloud Breakdown Immunity Active).'
      };
    }

    const m365 = providers.find(p => p.id === 'MICROSOFT_365');
    // If Microsoft 365 is down or degraded, auto-failover to Direct Line
    if (config.autoFailoverEnabled && (!m365 || m365.status === 'GLOBAL_OUTAGE' || m365.status === 'DEGRADED')) {
      const direct = providers.find(p => p.id === 'DIRECT_DEDICATED_PIPE') || providers[1];
      return {
        provider: direct,
        wasFailoverTriggered: true,
        reason: `Auto-Failover Activated: Microsoft 365 reported ${m365?.status || 'UNAVAILABLE'}. Rerouted candidate email through sovereign TLS pipe.`
      };
    }

    // Default route
    const active = providers.find(p => p.id === config.activeProvider) || providers[0];
    return {
      provider: active,
      wasFailoverTriggered: false,
      reason: 'Normal routing through configured active provider.'
    };
  }

  /**
   * Track outbound message through the resilience buffer
   */
  public logProtectedDispatch(recipientEmail: string, subject: string, routedVia: CloudProviderId, wasFailover: boolean): void {
    const queue = this.getBufferQueue();
    const item: OutageBufferItem = {
      id: `buf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      recipientEmail,
      subject,
      intendedProvider: 'MICROSOFT_365',
      routedViaProvider: routedVia,
      status: wasFailover ? 'DELIVERED_FAILOVER' : 'DISPATCHED_DIRECT',
      timestamp: new Date().toISOString(),
      retriesCount: 0,
      failoverReason: wasFailover ? 'Bypassed Microsoft Cloud Latency Spike via Sovereign Relay' : undefined
    };

    queue.unshift(item);
    if (queue.length > 50) queue.pop();
    this.saveBufferQueue(queue);

    // Update config count
    const cfg = this.getConfig();
    cfg.bufferedMessagesCount = queue.length;
    this.saveConfig(cfg);
  }

  /**
   * Toggle Forced Direct-Line Mode (Survival Mode)
   */
  public toggleDirectLineMode(enabled: boolean): void {
    const cfg = this.getConfig();
    cfg.forcedDirectLineMode = enabled;
    cfg.activeProvider = enabled ? 'DIRECT_DEDICATED_PIPE' : 'MICROSOFT_365';
    this.saveConfig(cfg);

    const providers = this.getProviders();
    providers.forEach(p => {
      p.isActiveRoute = p.id === cfg.activeProvider;
    });
    this.saveProviders(providers);
  }

  /**
   * Simulate a live ping / heartbeat check across all providers
   */
  public refreshGlobalTelemetry(): ProviderHealth[] {
    const providers = this.getProviders();
    providers.forEach(p => {
      if (p.id === 'DIRECT_DEDICATED_PIPE') {
        p.status = 'OPERATIONAL';
        p.latencyMs = Math.floor(25 + Math.random() * 20);
      } else if (p.id === 'MICROSOFT_365') {
        // Keeps realistic breakdown simulation
        p.latencyMs = Math.floor(3800 + Math.random() * 1200);
      } else {
        p.latencyMs = Math.floor(100 + Math.random() * 80);
      }
    });
    this.saveProviders(providers);

    const cfg = this.getConfig();
    cfg.lastGlobalSyncCheck = new Date().toISOString();
    this.saveConfig(cfg);
    return providers;
  }
}

export const outageSentinel = new OutageSentinelService();
