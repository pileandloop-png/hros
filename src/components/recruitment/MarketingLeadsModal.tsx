import React, { useState, useMemo } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import {
  Users,
  Mail,
  Phone,
  Copy,
  Download,
  Search,
  Filter,
  Check,
  MapPin,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import Papa from 'papaparse';

interface MarketingLeadsModalProps {
  isOpen: boolean;
  onClose: () => void;
  applications: any[];
}

export const MarketingLeadsModal: React.FC<MarketingLeadsModalProps> = ({
  isOpen,
  onClose,
  applications = []
}) => {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  // Extract clean candidate leads list
  const leads = useMemo(() => {
    const map = new Map<string, any>();

    applications.forEach((app) => {
      const c = app.candidate || {};
      const email = c.personalEmail || app.applicantEmail || '';
      if (!email) return;

      if (!map.has(email)) {
        map.set(email, {
          candidateId: c.candidateId || app.candidateId,
          name: c.fullName || app.applicantName || 'Candidate',
          email: email.trim(),
          phone: (c.phone || app.applicantPhone || '').trim(),
          city: c.city || app.city || 'Remote',
          role: app.positionAppliedFor || 'Internship / Role',
          source: app.source || 'Indeed / Direct',
          appliedAt: app.appliedAt || app.createdAt || new Date().toISOString()
        });
      }
    });

    return Array.from(map.values());
  }, [applications]);

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const matchesSearch =
        search === '' ||
        lead.name.toLowerCase().includes(search.toLowerCase()) ||
        lead.email.toLowerCase().includes(search.toLowerCase()) ||
        lead.phone.includes(search) ||
        lead.city.toLowerCase().includes(search.toLowerCase()) ||
        lead.role.toLowerCase().includes(search.toLowerCase());

      const matchesSource =
        sourceFilter === 'ALL' ||
        lead.source.toLowerCase().includes(sourceFilter.toLowerCase());

      return matchesSearch && matchesSource;
    });
  }, [leads, search, sourceFilter]);

  // Stats
  const emailsWithPhoneCount = leads.filter((l) => Boolean(l.phone)).length;

  // 1-Click Copy All Emails
  const handleCopyAllEmails = () => {
    const emailsList = filteredLeads.map((l) => l.email).filter(Boolean).join(', ');
    if (!emailsList) {
      toast.warning('No emails found to copy');
      return;
    }
    navigator.clipboard.writeText(emailsList);
    toast.success(`Copied ${filteredLeads.length} emails to clipboard for marketing!`);
  };

  // 1-Click Copy All Phone Numbers
  const handleCopyAllPhones = () => {
    const phonesList = filteredLeads
      .map((l) => l.phone)
      .filter((p) => p && p.length > 5)
      .join('\n');
    if (!phonesList) {
      toast.warning('No valid phone numbers found to copy');
      return;
    }
    navigator.clipboard.writeText(phonesList);
    toast.success(`Copied phone numbers to clipboard for SMS / WhatsApp broadcast!`);
  };

  // 1-Click Export Marketing CSV
  const handleExportMarketingCsv = () => {
    if (filteredLeads.length === 0) {
      toast.warning('No leads available to export');
      return;
    }

    const dataToExport = filteredLeads.map((l) => ({
      'Full Name': l.name,
      'Email Address': l.email,
      'Phone Number': l.phone,
      'City / Location': l.city,
      'Role Applied': l.role,
      'Lead Source': l.source,
      'Date Captured': new Date(l.appliedAt).toLocaleDateString()
    }));

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute(
      'download',
      `pile_and_loop_marketing_leads_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${dataToExport.length} marketing leads to CSV!`);
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Marketing & Talent Leads Scanner"
      size="xl"
    >
      <div className="space-y-4">
        {/* Metric Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Total Candidates Scanned
            </span>
            <p className="text-xl font-bold text-slate-900 mt-0.5">{leads.length}</p>
          </div>
          <div className="p-3 bg-sky-50 rounded-xl border border-sky-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600">
              Unique Email Addresses
            </span>
            <p className="text-xl font-bold text-sky-900 mt-0.5">{leads.length}</p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
              Direct Phone / WhatsApp Numbers
            </span>
            <p className="text-xl font-bold text-emerald-900 mt-0.5">{emailsWithPhoneCount}</p>
          </div>
        </div>

        {/* Action Controls & Batch Export Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50/80 rounded-xl border border-slate-200">
          <div className="flex items-center space-x-2">
            <Button size="sm" variant="outline" onClick={handleCopyAllEmails}>
              <Mail className="w-3.5 h-3.5 mr-1.5 text-sky-600" />
              Copy All Emails ({filteredLeads.length})
            </Button>
            <Button size="sm" variant="outline" onClick={handleCopyAllPhones}>
              <Phone className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
              Copy All Phone Numbers
            </Button>
          </div>

          <Button
            size="sm"
            onClick={handleExportMarketingCsv}
            className="bg-sky-600 hover:bg-sky-700 text-white font-semibold cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export Marketing CSV
          </Button>
        </div>

        {/* Search & Source Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, email, phone, city, or role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="text-xs p-1.5 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            <option value="ALL">All Sources</option>
            <option value="Indeed">Indeed</option>
            <option value="Website">Website / Careers</option>
            <option value="Direct">Direct Application</option>
            <option value="Email">Email</option>
            <option value="Referral">Referral</option>
          </select>
        </div>

        {/* Leads Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[420px] overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold sticky top-0">
              <tr>
                <th className="p-2.5">Candidate Name</th>
                <th className="p-2.5">Email Address</th>
                <th className="p-2.5">Phone Number</th>
                <th className="p-2.5">Role / City</th>
                <th className="p-2.5">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    No leads found matching your search.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-2.5 font-semibold text-slate-900 truncate max-w-[160px]">
                      {lead.name}
                    </td>
                    <td className="p-2.5">
                      <div className="flex items-center space-x-1.5 group">
                        <span className="font-mono text-slate-700 truncate max-w-[200px]">
                          {lead.email}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(lead.email);
                            setCopiedEmail(lead.email);
                            setTimeout(() => setCopiedEmail(null), 2000);
                            toast.info(`Copied ${lead.email}`);
                          }}
                          className="text-slate-400 hover:text-sky-600 p-0.5"
                          title="Copy email"
                        >
                          {copiedEmail === lead.email ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="p-2.5">
                      {lead.phone ? (
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono text-slate-700">{lead.phone}</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(lead.phone);
                              setCopiedPhone(lead.phone);
                              setTimeout(() => setCopiedPhone(null), 2000);
                              toast.info(`Copied ${lead.phone}`);
                            }}
                            className="text-slate-400 hover:text-emerald-600 p-0.5"
                            title="Copy phone number"
                          >
                            {copiedPhone === lead.phone ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-300 italic text-[11px]">No phone</span>
                      )}
                    </td>
                    <td className="p-2.5 truncate max-w-[160px]">
                      <div className="truncate font-medium text-slate-800">{lead.role}</div>
                      <div className="text-[10px] text-slate-400 flex items-center">
                        <MapPin className="w-2.5 h-2.5 mr-0.5" />
                        {lead.city}
                      </div>
                    </td>
                    <td className="p-2.5">
                      <Badge variant={lead.source.includes('Indeed') ? 'info' : 'default'}>
                        {lead.source}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
          <span>
            Displaying {filteredLeads.length} of {leads.length} total captured candidates
          </span>
          <Button size="sm" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
