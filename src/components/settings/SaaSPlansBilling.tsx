import React, { useState } from 'react';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import {
  DollarSign,
  Zap,
  CheckCircle2,
  TrendingUp,
  CreditCard,
  Download,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Clock,
  Layers
} from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

interface PricingTier {
  id: string;
  name: string;
  tagline: string;
  priceMonthly: number;
  popular?: boolean;
  current?: boolean;
  features: string[];
  quotas: {
    scrapes: number;
    aiQuestions: number;
    scorecards: number;
    seats: number;
  };
}

const TIERS: PricingTier[] = [
  {
    id: 'starter',
    name: 'Starter ATS',
    tagline: 'Ideal for early-stage startups hiring 1-3 roles per month.',
    priceMonthly: 49,
    features: [
      '3 Active Job Openings',
      '100 Headless Browser CV Scrapes / mo',
      '250 AI Screening Question Dispatches',
      'Standard Degree Gatekeeping',
      'Single Mailbox (hr@domain)',
      'Community Slack Support'
    ],
    quotas: { scrapes: 100, aiQuestions: 250, scorecards: 100, seats: 2 }
  },
  {
    id: 'growth',
    name: 'Scale & Growth',
    tagline: 'For fast-scaling engineering teams & active hiring pipelines.',
    priceMonthly: 149,
    popular: true,
    current: true,
    features: [
      '25 Active Job Openings',
      '500 Headless Browser CV Scrapes / mo',
      '1,500 5-Question AI Generations',
      'Automated 25-Point Rubric Grading',
      '1-Click Interview to Onboarding Handoff',
      'Multi-Inbox Support (Team + HR)',
      'Dedicated Playwright Headless Worker',
      'Priority 24/7 SLA'
    ],
    quotas: { scrapes: 500, aiQuestions: 1500, scorecards: 500, seats: 8 }
  },
  {
    id: 'enterprise',
    name: 'Enterprise Talent OS',
    tagline: 'Custom infrastructure, unlimited volume & bespoke ATS models.',
    priceMonthly: 399,
    features: [
      'Unlimited Job Openings & Candidates',
      'Unlimited Headless Browser CV Extraction',
      'Custom LLM Fine-Tuning on Company Rubrics',
      'Dedicated Proxy Cluster for Anti-Bot Bypass',
      'Custom Onboarding Kits & E-Sign Workflows',
      'SOC-2 Type II Certified Audit Logs',
      'Dedicated Account Manager & 99.99% SLA'
    ],
    quotas: { scrapes: 9999, aiQuestions: 9999, scorecards: 9999, seats: 50 }
  }
];

export const SaaSPlansBilling: React.FC = () => {
  const toast = useToast();
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'ANNUAL'>('MONTHLY');
  const [selectedPlan, setSelectedPlan] = useState<string>('growth');
  const [isUpgrading, setIsUpgrading] = useState<boolean>(false);

  // Live AI Quota Usage Tracking
  const usageStats = {
    scrapesUsed: 42,
    scrapesLimit: 500,
    aiQuestionsUsed: 118,
    aiQuestionsLimit: 1500,
    scorecardsUsed: 32,
    scorecardsLimit: 500,
    daysLeftInCycle: 19
  };

  const handleSelectPlan = (tier: PricingTier) => {
    if (tier.current) {
      toast.info('Active Plan', `You are currently on the ${tier.name} plan.`);
      return;
    }
    setIsUpgrading(true);
    setTimeout(() => {
      setIsUpgrading(false);
      setSelectedPlan(tier.id);
      toast.success(
        'Subscription Updated',
        `Successfully upgraded to ${tier.name} (${billingCycle.toLowerCase()} billing). Invoice sent to billing contact.`
      );
    }, 900);
  };

  const handleDownloadInvoice = (invoiceId: string) => {
    toast.success('Invoice Downloaded', `PDF for receipt #${invoiceId} downloaded.`);
  };

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="success" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
              Active Subscription: Scale &amp; Growth
            </Badge>
            <span className="text-xs text-slate-400">Renews in {usageStats.daysLeftInCycle} days</span>
          </div>
          <h2 className="text-xl font-bold mt-2">Commercial SaaS Subscription &amp; AI Quotas</h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Scale your recruitment pipeline with autonomous headless browser scrapers, 5-question technical screening, and 1-click onboarding automations.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={() => toast.info('Stripe Customer Portal', 'Redirecting to secure Stripe billing portal...')}
            className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs"
          >
            <CreditCard className="w-3.5 h-3.5 mr-1.5" />
            Manage Stripe Card
          </Button>
        </div>
      </div>

      {/* Real-Time AI Usage & Automation Meters */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-emerald-600" />
              Monthly AI &amp; Automation Resource Meter
            </h3>
            <p className="text-xs text-slate-500">Live telemetry of autonomous actions executed across your recruitment pipeline this cycle.</p>
          </div>
          <span className="text-xs font-mono text-slate-400">Cycle Reset: 1st of next month</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Meter 1: Browser Scraper */}
          <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">Indeed Playwright Scrapes</span>
              <span className="text-xs font-bold text-emerald-600">
                {usageStats.scrapesUsed} / {usageStats.scrapesLimit}
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all"
                style={{ width: `${(usageStats.scrapesUsed / usageStats.scrapesLimit) * 100}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>{Math.round(((usageStats.scrapesLimit - usageStats.scrapesUsed) / usageStats.scrapesLimit) * 100)}% remaining</span>
              <span className="text-emerald-700 font-medium">Headless Cluster Live</span>
            </div>
          </div>

          {/* Meter 2: 5-Question AI Generator */}
          <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">5-Question AI Screenings</span>
              <span className="text-xs font-bold text-sky-600">
                {usageStats.aiQuestionsUsed} / {usageStats.aiQuestionsLimit}
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-sky-500 h-2 rounded-full transition-all"
                style={{ width: `${(usageStats.aiQuestionsUsed / usageStats.aiQuestionsLimit) * 100}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>{Math.round(((usageStats.aiQuestionsLimit - usageStats.aiQuestionsUsed) / usageStats.aiQuestionsLimit) * 100)}% remaining</span>
              <span className="text-sky-700 font-medium">Gemini 1.5 Flash</span>
            </div>
          </div>

          {/* Meter 3: AI Rubric Scorecards */}
          <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">25-Point Candidate Evaluations</span>
              <span className="text-xs font-bold text-purple-600">
                {usageStats.scorecardsUsed} / {usageStats.scorecardsLimit}
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-purple-500 h-2 rounded-full transition-all"
                style={{ width: `${(usageStats.scorecardsUsed / usageStats.scorecardsLimit) * 100}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>{Math.round(((usageStats.scorecardsLimit - usageStats.scorecardsUsed) / usageStats.scorecardsLimit) * 100)}% remaining</span>
              <span className="text-purple-700 font-medium">Zero-Latency Evaluator</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Tier Selector */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Available Commercial Plans</h3>
            <p className="text-xs text-slate-500">Upgrade or adjust your plan to expand active vacancies and AI scraping throughput.</p>
          </div>

          {/* Billing Cycle Toggle */}
          <div className="inline-flex items-center p-1 bg-slate-100 rounded-xl text-xs font-semibold self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setBillingCycle('MONTHLY')}
              className={`px-3 py-1 rounded-lg transition ${
                billingCycle === 'MONTHLY' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Monthly Billing
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('ANNUAL')}
              className={`px-3 py-1 rounded-lg transition flex items-center gap-1 ${
                billingCycle === 'ANNUAL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Annual Billing
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded-full">Save 20%</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TIERS.map((tier) => {
            const effectivePrice = billingCycle === 'ANNUAL' ? Math.round(tier.priceMonthly * 0.8) : tier.priceMonthly;
            const isCurrent = tier.id === selectedPlan;

            return (
              <div
                key={tier.id}
                className={`relative flex flex-col justify-between p-6 rounded-2xl bg-white border transition-all ${
                  isCurrent
                    ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
                    : 'border-slate-200/80 hover:border-slate-300 shadow-2xs'
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider shadow-xs">
                    Most Popular &bull; High ROI
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="text-base font-bold text-slate-900">{tier.name}</h4>
                    {isCurrent && <Badge variant="success">Current Plan</Badge>}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{tier.tagline}</p>

                  <div className="mt-4 pb-4 border-b border-slate-100">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold text-slate-900">${effectivePrice}</span>
                      <span className="text-xs text-slate-500 font-medium">/ month</span>
                    </div>
                    {billingCycle === 'ANNUAL' && (
                      <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Billed annually (${effectivePrice * 12}/year)</p>
                    )}
                  </div>

                  {/* Feature Checklist */}
                  <div className="mt-4 space-y-2.5">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Plan Inclusions</p>
                    {tier.features.map((feat, fIdx) => (
                      <div key={fIdx} className="flex items-start gap-2 text-xs text-slate-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100">
                  <Button
                    variant={isCurrent ? 'outline' : 'primary'}
                    className={`w-full text-xs font-semibold ${
                      isCurrent
                        ? 'border-emerald-600 text-emerald-700 hover:bg-emerald-50'
                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                    }`}
                    disabled={isUpgrading}
                    onClick={() => handleSelectPlan(tier)}
                  >
                    {isCurrent ? 'Current Active Tier' : `Switch to ${tier.name}`}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Invoicing & Billing History */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Billing History &amp; Official Receipts</h3>
            <p className="text-xs text-slate-500">Download commercial VAT &amp; tax receipts for accounting compliance.</p>
          </div>
          <Badge variant="info">Automatic Invoicing via Stripe</Badge>
        </div>

        <div className="divide-y divide-slate-100">
          {[
            { id: 'INV-2026-004', date: 'Oct 01, 2026', amount: '$149.00', status: 'PAID', plan: 'Scale & Growth Plan (Monthly)' },
            { id: 'INV-2026-003', date: 'Sep 01, 2026', amount: '$149.00', status: 'PAID', plan: 'Scale & Growth Plan (Monthly)' },
            { id: 'INV-2026-002', date: 'Aug 01, 2026', amount: '$149.00', status: 'PAID', plan: 'Scale & Growth Plan (Monthly)' },
          ].map((inv) => (
            <div key={inv.id} className="py-3 flex items-center justify-between text-xs">
              <div>
                <span className="font-semibold text-slate-900 font-mono">{inv.id}</span>
                <span className="text-slate-400 mx-2">&bull;</span>
                <span className="text-slate-600">{inv.plan}</span>
                <span className="text-slate-400 mx-2">&bull;</span>
                <span className="text-slate-400">{inv.date}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-slate-900">{inv.amount}</span>
                <Badge variant="success">Paid</Badge>
                <button
                  type="button"
                  onClick={() => handleDownloadInvoice(inv.id)}
                  className="p-1 text-slate-400 hover:text-slate-700 transition"
                  title="Download PDF"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
