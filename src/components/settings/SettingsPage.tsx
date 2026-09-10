import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { createInternalUser, updateUserRole, disableInternalUser } from '../../services/api';
import { approveUserRequest, rejectUserRequest } from '../../services/mock/auth';
import { UserRole, UserProfile } from '../../types/auth';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { getDiscordWebhookUrl, setDiscordWebhookUrl, sendDiscordWebhook } from '../../services/discord';
import { getSupabaseCredentials, saveSupabaseCredentials, testSupabaseConnection } from '../../services/supabase';
import { useCompanyProfile, COMPANY_PRESETS, CompanyProfile } from '../../contexts/CompanyContext';
import {
  Settings,
  Building,
  Mail,
  Sparkles,
  Shield,
  Users,
  UserPlus,
  Lock,
  Clock,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Check,
  X,
  ShieldCheck,
  MessageSquare,
  Database,
  Palette,
  Globe,
  DollarSign,
  MapPin,
  RefreshCw,
  Sliders,
  ExternalLink,
  Server,
  Key,
  Eye,
  EyeOff,
  Trash2,
  Edit3,
  Plus
} from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import {
  getEmailAccounts,
  saveEmailAccounts,
  addEmailAccount,
  updateEmailAccount,
  deleteEmailAccount,
  testMailConnection,
  syncMailAccount,
  EmailAccountConfig
} from '../../services/emailService';

export const SettingsPage: React.FC = () => {
  const { isSuperAdmin, isSupervisor } = useAuth();
  const toast = useToast();
  const { company, updateCompanyProfile, applyPreset, resetToDefaults } = useCompanyProfile();
  const [activeTab, setActiveTab] = useState<'COMPANY' | 'RECRUITMENT' | 'INTERNSHIP' | 'EMAIL' | 'AI' | 'USERS' | 'INTEGRATIONS'>('COMPANY');

  // Dynamic Company & Brand State
  const [companyForm, setCompanyForm] = useState<CompanyProfile>(company);

  useEffect(() => {
    setCompanyForm(company);
  }, [company]);

  // System Settings State
  const [settings, setSettings] = useState({
    companyName: 'Pile & Loop',
    timezone: 'Asia/Karachi',
    hrEmail: 'hr@pileandloop.com',
    superAdminEmail: 'pileandloop@gmail.com',
    interviewBookingUrl: 'https://calendar.google.com/calendar/u/0/appointments/schedules/pileandloop',
    defaultFollowUpLimit: 2,
    defaultDurationMonths: 4,
    expectedHoursPerDay: 5,
    coreHours: '09:00 - 16:00 PKT',
    leaveAllowanceDaysPerMonth: 3,
    aiModel: 'gemini-1.5-flash',
    mailSyncIntervalMinutes: 5,
  });

  const [savingSettings, setSavingSettings] = useState(false);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>({});
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Discord & Supabase State
  const [discordUrl, setDiscordUrl] = useState(getDiscordWebhookUrl());
  const [testingDiscord, setTestingDiscord] = useState(false);
  const [discordStatus, setDiscordStatus] = useState<string | null>(null);

  const creds = getSupabaseCredentials();
  const [supabaseUrl, setSupabaseUrl] = useState(creds.url);
  const [supabaseKey, setSupabaseKey] = useState(creds.anonKey);
  const [testingSupabase, setTestingSupabase] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState<string | null>(null);

  // Add User Modal
  const [addUserModalOpen, setAddUserModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    displayName: '',
    role: 'HR_EXECUTIVE' as UserRole,
    department: 'Human Resources',
    jobTitle: 'HR Executive',
  });
  const [creatingUser, setCreatingUser] = useState(false);

  // Email Accounts & Mail Server State
  const [emailAccounts, setEmailAccounts] = useState<EmailAccountConfig[]>(getEmailAccounts());
  const [syncIntervalSeconds, setSyncIntervalSeconds] = useState<number>(2);
  const [syncingAll, setSyncingAll] = useState(false);
  const [testingAccountId, setTestingAccountId] = useState<string | null>(null);
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});
  const [addEmailModalOpen, setAddEmailModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<EmailAccountConfig | null>(null);
  const [emailForm, setEmailForm] = useState({
    accountName: '',
    email: '',
    password: '',
    imapHost: 'mail.pileandloop.com',
    imapPort: 993,
    imapSecure: true,
    smtpHost: 'mail.pileandloop.com',
    smtpPort: 465,
    smtpSecure: true,
    syncIntervalSeconds: 2,
    isDefault: false,
    isActive: true,
    assignedDepartment: 'Recruitment & HR',
  });

  const togglePasswordVisibility = (accId: string) => {
    setShowPasswordMap(prev => ({ ...prev, [accId]: !prev[accId] }));
  };

  const handleTestEmailHandshake = async (acc: EmailAccountConfig) => {
    setTestingAccountId(acc.id);
    try {
      const res = await testMailConnection(acc);
      if (res.success) {
        toast.success('Connection Verified', res.message);
      } else {
        toast.error('Handshake Failed', res.message);
      }
    } catch (e: any) {
      toast.error('Test Error', e.message);
    } finally {
      setTestingAccountId(null);
    }
  };

  const handleSyncSingleAccount = async (acc: EmailAccountConfig) => {
    setTestingAccountId(acc.id);
    try {
      const res = await syncMailAccount(acc);
      toast.success('Mailbox Synced', res.message);
      setEmailAccounts(getEmailAccounts());
    } catch (e: any) {
      toast.error('Sync Error', e.message);
    } finally {
      setTestingAccountId(null);
    }
  };

  const handleSyncAllAccounts = async () => {
    setSyncingAll(true);
    try {
      for (const acc of emailAccounts) {
        await syncMailAccount(acc);
      }
      setEmailAccounts(getEmailAccounts());
      toast.success('All Inboxes Synced', 'Synchronized all corporate accounts with mail.pileandloop.com.');
    } catch (e: any) {
      toast.error('Sync Error', e.message);
    } finally {
      setSyncingAll(false);
    }
  };

  const handleSaveEmailAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailForm.email.trim() || !emailForm.password.trim()) {
      toast.error('Validation Error', 'Email and password are required.');
      return;
    }

    try {
      if (editingAccount) {
        updateEmailAccount(editingAccount.id, emailForm);
        toast.success('Account Updated', `Settings for "${emailForm.email}" updated successfully.`);
      } else {
        addEmailAccount(emailForm);
        toast.success('Account Added', `Mailbox "${emailForm.email}" added to team inboxes.`);
      }
      setEmailAccounts(getEmailAccounts());
      setAddEmailModalOpen(false);
      setEditingAccount(null);
    } catch (e: any) {
      toast.error('Save Failed', e.message);
    }
  };

  const handleDeleteAccount = (acc: EmailAccountConfig) => {
    if (acc.isDefault && emailAccounts.length === 1) {
      toast.warning('Cannot Delete', 'You must maintain at least one active primary HR mailbox.');
      return;
    }
    if (window.confirm(`Delete email account ${acc.email}?`)) {
      deleteEmailAccount(acc.id);
      setEmailAccounts(getEmailAccounts());
      toast.info('Account Removed', `Mailbox ${acc.email} has been removed.`);
    }
  };

  useEffect(() => {
    // Load settings from Firestore
    getDoc(doc(db, 'systemSettings', 'general')).then((snap) => {
      if (snap.exists()) {
        setSettings(prev => ({ ...prev, ...snap.data() }));
      }
    });

    if (isSuperAdmin) {
      loadUsers();
    }
  }, [isSuperAdmin]);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const peopleSnap = await getDocs(collection(db, 'people'));
      setUsersList(peopleSnap.docs.map(d => {
        const data = d.data();
        return {
          uid: d.id,
          displayName: data.fullName || data.displayName || 'Team Member',
          email: data.email,
          role: data.role || 'TEAM_MEMBER',
          department: data.department || 'General',
          disabled: data.status === 'INACTIVE'
        } as UserProfile;
      }));

      const reqSnap = await getDocs(collection(db, 'userRequests'));
      const pending = reqSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((r: any) => r.status === 'PENDING');
      setPendingRequests(pending);

      // Initialize selected roles for pending requests
      const initialRoles: Record<string, string> = {};
      pending.forEach((r: any) => {
        initialRoles[r.id] = r.requestedRole || 'TEAM_MEMBER';
      });
      setSelectedRoles(initialRoles);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await setDoc(doc(db, 'systemSettings', 'general'), {
        ...settings,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      alert('Settings saved successfully.');
    } catch (err: any) {
      alert(err.message || 'Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveCompanyProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateCompanyProfile(companyForm);
    alert('Company & Brand Profile updated! Logo, colors, currency, and documents updated across the platform.');
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingUser(true);
    try {
      await createInternalUser(newUser);
      setAddUserModalOpen(false);
      setNewUser({ email: '', password: '', displayName: '', role: 'HR_EXECUTIVE', department: 'Human Resources', jobTitle: 'HR Executive' });
      loadUsers();
      alert('Internal user account successfully created.');
    } catch (err: any) {
      alert(err.message || 'Failed to create user');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleRoleChange = async (targetUid: string, newRole: UserRole) => {
    if (!window.confirm(`Change user role to ${newRole}?`)) return;
    try {
      await updateUserRole(targetUid, newRole);
      loadUsers();
    } catch (err: any) {
      alert(err.message || 'Role change failed');
    }
  };

  const handleToggleDisabled = async (targetUid: string, currentlyDisabled: boolean) => {
    try {
      await disableInternalUser(targetUid, !currentlyDisabled);
      loadUsers();
    } catch (err: any) {
      alert(err.message || 'Action failed');
    }
  };

  const handleApproveRequest = async (reqId: string) => {
    const roleToAllocate = selectedRoles[reqId] || 'TEAM_MEMBER';
    try {
      await approveUserRequest(reqId, roleToAllocate);
      alert(`User approved and allocated the role: ${roleToAllocate}`);
      loadUsers();
    } catch (err: any) {
      alert(err.message || 'Approval failed');
    }
  };

  const handleRejectRequest = async (reqId: string) => {
    if (!window.confirm('Are you sure you want to reject this access request?')) return;
    try {
      await rejectUserRequest(reqId);
      loadUsers();
    } catch (err: any) {
      alert(err.message || 'Rejection failed');
    }
  };

  const handleSaveDiscord = () => {
    setDiscordWebhookUrl(discordUrl);
    alert('Discord Webhook URL saved successfully!');
  };

  const handleTestDiscord = async () => {
    setTestingDiscord(true);
    setDiscordStatus(null);
    try {
      setDiscordWebhookUrl(discordUrl);
      const res = await sendDiscordWebhook({
        title: '🚀 Pile & Loop HROS Test Alert',
        description: 'Your Discord Webhook integration is active and operating normally!',
        color: 0x0284c7,
        fields: [
          { name: 'System', value: 'Pile & Loop HR System (Vercel)', inline: true },
          { name: 'Status', value: 'Connected & Verified', inline: true },
          { name: 'Timestamp', value: new Date().toLocaleString(), inline: false }
        ]
      });
      if (res.success) {
        setDiscordStatus('Success! Discord test alert dispatched to your channel.');
      } else {
        setDiscordStatus(`Error: ${res.error}`);
      }
    } finally {
      setTestingDiscord(false);
    }
  };

  const handleSaveSupabase = async () => {
    saveSupabaseCredentials(supabaseUrl, supabaseKey);
    setTestingSupabase(true);
    setSupabaseStatus(null);
    try {
      const res = await testSupabaseConnection(supabaseUrl, supabaseKey);
      if (res.success) {
        setSupabaseStatus('Success! Supabase connection established.');
      } else {
        setSupabaseStatus(`Error: ${res.error}`);
      }
    } finally {
      setTestingSupabase(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">System Settings & Governance</h1>
        <p className="text-xs text-slate-500">Configure business logic, working schedules, email integrations, and user access roles.</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 text-xs font-medium text-slate-500 overflow-x-auto">
        <button
          onClick={() => setActiveTab('COMPANY')}
          className={`pb-3 px-4 flex items-center gap-1.5 border-b-2 transition ${activeTab === 'COMPANY' ? 'border-emerald-600 text-emerald-600 font-semibold' : 'border-transparent hover:text-slate-800'}`}
        >
          <Building className="w-3.5 h-3.5" /> Company &amp; Brand Profile
        </button>
        <button
          onClick={() => setActiveTab('RECRUITMENT')}
          className={`pb-3 px-4 flex items-center gap-1.5 border-b-2 transition ${activeTab === 'RECRUITMENT' ? 'border-sky-600 text-sky-600 font-semibold' : 'border-transparent hover:text-slate-800'}`}
        >
          <Clock className="w-3.5 h-3.5" /> Recruitment & Scheduling
        </button>
        <button
          onClick={() => setActiveTab('INTERNSHIP')}
          className={`pb-3 px-4 flex items-center gap-1.5 border-b-2 transition ${activeTab === 'INTERNSHIP' ? 'border-sky-600 text-sky-600 font-semibold' : 'border-transparent hover:text-slate-800'}`}
        >
          <Calendar className="w-3.5 h-3.5" /> Internship Standards
        </button>
        <button
          onClick={() => setActiveTab('EMAIL')}
          className={`pb-3 px-4 flex items-center gap-1.5 border-b-2 transition ${activeTab === 'EMAIL' ? 'border-emerald-600 text-emerald-600 font-semibold' : 'border-transparent hover:text-slate-800'}`}
        >
          <Mail className="w-3.5 h-3.5" /> Mail Servers &amp; Team Inboxes
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-1" />
        </button>
        <button
          onClick={() => setActiveTab('AI')}
          className={`pb-3 px-4 flex items-center gap-1.5 border-b-2 transition ${activeTab === 'AI' ? 'border-sky-600 text-sky-600 font-semibold' : 'border-transparent hover:text-slate-800'}`}
        >
          <Sparkles className="w-3.5 h-3.5" /> AI Copilot & Prompts
        </button>
        {isSuperAdmin && (
          <button
            onClick={() => setActiveTab('USERS')}
            className={`pb-3 px-4 flex items-center gap-1.5 border-b-2 transition ${activeTab === 'USERS' ? 'border-sky-600 text-sky-600 font-semibold' : 'border-transparent hover:text-slate-800'}`}
          >
            <Shield className="w-3.5 h-3.5" /> User Access & Roles
            {pendingRequests.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold animate-pulse">
                {pendingRequests.length}
              </span>
            )}
          </button>
        )}
        <button
          onClick={() => setActiveTab('INTEGRATIONS')}
          className={`pb-3 px-4 flex items-center gap-1.5 border-b-2 transition ${activeTab === 'INTEGRATIONS' ? 'border-sky-600 text-sky-600 font-semibold' : 'border-transparent hover:text-slate-800'}`}
        >
          <MessageSquare className="w-3.5 h-3.5" /> Discord & Supabase
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        {/* COMPANY & BRAND PROFILE STUDIO */}
        {activeTab === 'COMPANY' && (
          <div className="space-y-6">
            
            {/* Quick Presets Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div>
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  White-Label &amp; Brand Customization Engine
                </h4>
                <p className="text-[11px] text-slate-500">
                  Switch presets instantly or configure your custom brand. All changes dynamically apply to documents, navbar, and portals.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  onClick={() => applyPreset('PILE_AND_LOOP')}
                  className="text-xs bg-white hover:bg-emerald-50 border-emerald-300 text-emerald-700"
                >
                  🟢 Pile &amp; Loop (Official)
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  onClick={() => applyPreset('NOVA_TECH')}
                  className="text-xs bg-white hover:bg-blue-50 border-blue-300 text-blue-700"
                >
                  🔵 Nova Dynamics (Tech)
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  onClick={() => applyPreset('APEX_STUDIO')}
                  className="text-xs bg-white hover:bg-purple-50 border-purple-300 text-purple-700"
                >
                  🟣 Apex Studios (Agency)
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  onClick={resetToDefaults}
                  className="text-xs text-slate-500"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Reset
                </Button>
              </div>
            </div>

            {/* Live Interactive Brand Card Preview */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <div
                className="p-4 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors"
                style={{ backgroundColor: companyForm.primaryColor || '#10B981' }}
              >
                <div className="flex items-center space-x-3.5">
                  {companyForm.logoUrl ? (
                    <img
                      src={companyForm.logoUrl}
                      alt="Logo Preview"
                      className="h-10 max-w-[140px] object-contain rounded bg-white/10 p-1 backdrop-blur-xs"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center font-extrabold text-sm shadow-xs">
                      {companyForm.companyName ? companyForm.companyName.slice(0, 3).toUpperCase() : 'APP'}
                    </div>
                  )}
                  <div>
                    <h3 className="font-extrabold text-base tracking-tight leading-tight">{companyForm.companyName}</h3>
                    <p className="text-xs text-white/80 font-medium">{companyForm.tagline || 'HR Management & Operations System'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md font-mono text-[11px] font-semibold">
                    Currency: {companyForm.currencySymbol} ({companyForm.currencyCode})
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-black/20 backdrop-blur-md text-[11px]">
                    {companyForm.timezone}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-900 text-slate-300 text-[11px] flex flex-wrap items-center justify-between gap-3">
                <span className="flex items-center gap-1 text-slate-400">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  {companyForm.address || 'Address not configured'}
                </span>
                <span className="flex items-center gap-1 text-slate-400">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  {companyForm.hrEmail || companyForm.supportEmail}
                </span>
                <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Live Reactive Branding Active
                </span>
              </div>
            </div>

            {/* Comprehensive Brand Profile Form */}
            <form onSubmit={handleSaveCompanyProfile} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Column 1: Identity */}
                <div className="space-y-3 bg-white p-4 border border-slate-200 rounded-xl">
                  <h5 className="font-bold text-slate-900 text-xs flex items-center gap-1.5 pb-1 border-b border-slate-100">
                    <Building className="w-3.5 h-3.5 text-slate-600" />
                    Company Identity &amp; URLs
                  </h5>

                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Company Display Name *</label>
                    <input
                      type="text"
                      required
                      value={companyForm.companyName}
                      onChange={(e) => setCompanyForm({ ...companyForm, companyName: e.target.value })}
                      placeholder="e.g. Pile and Loop"
                      className="w-full p-2 border border-slate-300 rounded font-semibold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Legal Registered Entity Name</label>
                    <input
                      type="text"
                      value={companyForm.legalName}
                      onChange={(e) => setCompanyForm({ ...companyForm, legalName: e.target.value })}
                      placeholder="e.g. Pile & Loop (Pvt.) Ltd."
                      className="w-full p-2 border border-slate-300 rounded"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Brand Tagline</label>
                    <input
                      type="text"
                      value={companyForm.tagline}
                      onChange={(e) => setCompanyForm({ ...companyForm, tagline: e.target.value })}
                      placeholder="e.g. Premium Keyboard Rugs, Desk Mats & Digital Craft"
                      className="w-full p-2 border border-slate-300 rounded"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Official Website URL</label>
                    <input
                      type="url"
                      value={companyForm.websiteUrl}
                      onChange={(e) => setCompanyForm({ ...companyForm, websiteUrl: e.target.value })}
                      placeholder="https://pileandloop.com"
                      className="w-full p-2 border border-slate-300 rounded font-mono text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Logo Image URL</label>
                    <input
                      type="url"
                      value={companyForm.logoUrl}
                      onChange={(e) => setCompanyForm({ ...companyForm, logoUrl: e.target.value })}
                      placeholder="https://pileandloop.com/wp-content/uploads/.../logo.png"
                      className="w-full p-2 border border-slate-300 rounded font-mono text-[11px]"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Direct PNG/SVG/WebP URL. Leave empty to use stylized brand monogram.
                    </p>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Favicon URL</label>
                    <input
                      type="text"
                      value={companyForm.faviconUrl}
                      onChange={(e) => setCompanyForm({ ...companyForm, faviconUrl: e.target.value })}
                      placeholder="/favicon.svg"
                      className="w-full p-2 border border-slate-300 rounded font-mono text-[11px]"
                    />
                  </div>
                </div>

                {/* Column 2: Theming, Finance & Operations */}
                <div className="space-y-3 bg-white p-4 border border-slate-200 rounded-xl">
                  <h5 className="font-bold text-slate-900 text-xs flex items-center gap-1.5 pb-1 border-b border-slate-100">
                    <Palette className="w-3.5 h-3.5 text-slate-600" />
                    Color, Currency &amp; Legal Signatory
                  </h5>

                  {/* Brand Color Picker */}
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Primary Brand Accent Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={companyForm.primaryColor || '#10B981'}
                        onChange={(e) => setCompanyForm({ ...companyForm, primaryColor: e.target.value })}
                        className="w-9 h-9 rounded cursor-pointer border border-slate-300 p-0.5"
                      />
                      <input
                        type="text"
                        value={companyForm.primaryColor}
                        onChange={(e) => setCompanyForm({ ...companyForm, primaryColor: e.target.value })}
                        className="w-28 p-2 border border-slate-300 rounded font-mono uppercase text-xs"
                      />
                      {/* Preset color swatches */}
                      <div className="flex items-center gap-1.5 ml-auto">
                        {[
                          { color: '#10B981', name: 'Emerald' },
                          { color: '#0284c7', name: 'Sky' },
                          { color: '#6366f1', name: 'Indigo' },
                          { color: '#8b5cf6', name: 'Purple' },
                          { color: '#f59e0b', name: 'Amber' },
                          { color: '#0f172a', name: 'Slate' }
                        ].map((sw) => (
                          <button
                            key={sw.color}
                            type="button"
                            title={sw.name}
                            onClick={() => setCompanyForm({ ...companyForm, primaryColor: sw.color })}
                            className="w-6 h-6 rounded-full border border-slate-300 hover:scale-110 transition-transform shadow-2xs"
                            style={{ backgroundColor: sw.color }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Currency Selector */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Official Currency Code</label>
                      <select
                        value={companyForm.currencyCode}
                        onChange={(e) => {
                          const code = e.target.value;
                          const symbols: Record<string, string> = {
                            PKR: 'Rs.',
                            USD: '$',
                            EUR: '€',
                            GBP: '£',
                            AED: 'AED',
                            SAR: 'SAR',
                            CAD: '$',
                            INR: '₹'
                          };
                          setCompanyForm({
                            ...companyForm,
                            currencyCode: code,
                            currencySymbol: symbols[code] || code
                          });
                        }}
                        className="w-full p-2 border border-slate-300 rounded bg-white font-semibold"
                      >
                        <option value="PKR">PKR (Pakistani Rupee)</option>
                        <option value="USD">USD (US Dollar)</option>
                        <option value="EUR">EUR (Euro)</option>
                        <option value="GBP">GBP (British Pound)</option>
                        <option value="AED">AED (UAE Dirham)</option>
                        <option value="SAR">SAR (Saudi Riyal)</option>
                        <option value="CAD">CAD (Canadian Dollar)</option>
                        <option value="INR">INR (Indian Rupee)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Currency Symbol</label>
                      <input
                        type="text"
                        value={companyForm.currencySymbol}
                        onChange={(e) => setCompanyForm({ ...companyForm, currencySymbol: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded font-mono font-bold"
                      />
                    </div>
                  </div>

                  {/* Timezone */}
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Company Operating Timezone</label>
                    <select
                      value={companyForm.timezone}
                      onChange={(e) => setCompanyForm({ ...companyForm, timezone: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded bg-white font-mono text-xs"
                    >
                      <option value="Asia/Karachi">Asia/Karachi (PKT • UTC+5)</option>
                      <option value="America/New_York">America/New_York (EST • UTC-5)</option>
                      <option value="Europe/London">Europe/London (GMT • UTC+0)</option>
                      <option value="Asia/Dubai">Asia/Dubai (GST • UTC+4)</option>
                      <option value="UTC">UTC (Universal Coordinated Time)</option>
                    </select>
                  </div>

                  {/* HR Mail & Support Mail */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Primary HR Mailbox</label>
                      <input
                        type="email"
                        value={companyForm.hrEmail}
                        onChange={(e) => setCompanyForm({ ...companyForm, hrEmail: e.target.value })}
                        placeholder="hr@pileandloop.com"
                        className="w-full p-2 border border-slate-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Support / Admin Email</label>
                      <input
                        type="email"
                        value={companyForm.supportEmail}
                        onChange={(e) => setCompanyForm({ ...companyForm, supportEmail: e.target.value })}
                        placeholder="pileandloop@gmail.com"
                        className="w-full p-2 border border-slate-300 rounded"
                      />
                    </div>
                  </div>

                  {/* Office Address */}
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Headquarters / Office Address</label>
                    <input
                      type="text"
                      value={companyForm.address}
                      onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                      placeholder="Gulberg III, Lahore, Punjab, Pakistan"
                      className="w-full p-2 border border-slate-300 rounded"
                    />
                  </div>

                  {/* Signatories */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Signatory Name</label>
                      <input
                        type="text"
                        value={companyForm.signatoryName}
                        onChange={(e) => setCompanyForm({ ...companyForm, signatoryName: e.target.value })}
                        placeholder="e.g. Managing Director"
                        className="w-full p-2 border border-slate-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Signatory Designation</label>
                      <input
                        type="text"
                        value={companyForm.signatoryTitle}
                        onChange={(e) => setCompanyForm({ ...companyForm, signatoryTitle: e.target.value })}
                        placeholder="e.g. Head of Human Resources"
                        className="w-full p-2 border border-slate-300 rounded"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Terms Clause */}
              <div className="bg-white p-4 border border-slate-200 rounded-xl space-y-2">
                <label className="block text-slate-700 font-medium">Standard Offer &amp; Agreement Terms Clause</label>
                <textarea
                  rows={2}
                  value={companyForm.termsSummary}
                  onChange={(e) => setCompanyForm({ ...companyForm, termsSummary: e.target.value })}
                  placeholder="Terms appearing on electronic offer letters and internship agreements..."
                  className="w-full p-2 border border-slate-300 rounded text-xs"
                />
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-between pt-2">
                <p className="text-[11px] text-slate-500">
                  Updates apply instantly to all active browsers, documents, certificates, and payroll vouchers.
                </p>
                <Button size="sm" type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm px-5">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  Save Company Profile &amp; Apply Universally
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* RECRUITMENT SETTINGS */}
        {activeTab === 'RECRUITMENT' && (
          <form onSubmit={handleSaveSettings} className="space-y-4 max-w-xl text-xs">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Google Calendar Interview Scheduling Link</label>
              <input
                type="url"
                value={settings.interviewBookingUrl}
                onChange={(e) => setSettings({ ...settings, interviewBookingUrl: e.target.value })}
                placeholder="https://calendar.google.com/calendar/appointments/..."
                className="w-full p-2 border rounded font-mono text-[11px]"
              />
              <p className="text-[11px] text-slate-400 mt-1">Sent automatically to candidates in the Interviewing stage.</p>
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">Maximum Candidate Follow-Up Limit</label>
              <input
                type="number"
                min={1}
                max={5}
                value={settings.defaultFollowUpLimit}
                onChange={(e) => setSettings({ ...settings, defaultFollowUpLimit: Number(e.target.value) })}
                className="w-full p-2 border rounded"
              />
            </div>
            <Button size="sm" type="submit" loading={savingSettings}>Save Recruitment Settings</Button>
          </form>
        )}

        {/* INTERNSHIP SETTINGS */}
        {activeTab === 'INTERNSHIP' && (
          <form onSubmit={handleSaveSettings} className="space-y-4 max-w-xl text-xs">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Standard Internship Duration (Months)</label>
              <input
                type="number"
                min={1}
                max={12}
                value={settings.defaultDurationMonths}
                onChange={(e) => setSettings({ ...settings, defaultDurationMonths: Number(e.target.value) })}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">Daily Minimum Working Hours</label>
              <input
                type="number"
                step="0.5"
                value={settings.expectedHoursPerDay}
                onChange={(e) => setSettings({ ...settings, expectedHoursPerDay: Number(e.target.value) })}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">Core Working Hours (PKT)</label>
              <input
                type="text"
                value={settings.coreHours}
                onChange={(e) => setSettings({ ...settings, coreHours: e.target.value })}
                className="w-full p-2 border rounded font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">Monthly Leave Allowance (Days)</label>
              <input
                type="number"
                value={settings.leaveAllowanceDaysPerMonth}
                onChange={(e) => setSettings({ ...settings, leaveAllowanceDaysPerMonth: Number(e.target.value) })}
                className="w-full p-2 border rounded"
              />
            </div>
            <Button size="sm" type="submit" loading={savingSettings}>Save Internship Standards</Button>
          </form>
        )}

        {/* EMAIL & MAIL SERVERS STUDIO */}
        {activeTab === 'EMAIL' && (
          <div className="space-y-6 text-xs">
            {/* Live cPanel Status Banner */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start space-x-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shrink-0 shadow-xs">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                      Corporate Mail Server &amp; Multi-Inbox Hub
                    </h4>
                    <span className="flex items-center px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-mono text-[10px] font-semibold border border-emerald-200 dark:border-emerald-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mr-1" />
                      Live 2s Sync Active
                    </span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 mt-1">
                    Connected to <strong>mail.pileandloop.com</strong> on IMAP Port 993 (SSL) &amp; SMTP Port 465 (SSL). Real-time pulse synchronizes candidate replies, email notifications, and dispatch logs.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSyncAllAccounts}
                  loading={syncingAll}
                  className="bg-white hover:bg-slate-50"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                  Sync All Inboxes
                </Button>
                {isSupervisor && (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => {
                      setEditingAccount(null);
                      setEmailForm({
                        accountName: '',
                        email: '',
                        password: '',
                        imapHost: 'mail.pileandloop.com',
                        imapPort: 993,
                        imapSecure: true,
                        smtpHost: 'mail.pileandloop.com',
                        smtpPort: 465,
                        smtpSecure: true,
                        syncIntervalSeconds: 2,
                        isDefault: false,
                        isActive: true,
                        assignedDepartment: 'Recruitment & HR',
                      });
                      setAddEmailModalOpen(true);
                    }}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Add Team Email Account
                  </Button>
                )}
              </div>
            </div>

            {/* Email Accounts List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider">
                  Configured Corporate Inboxes ({emailAccounts.length})
                </h4>
                <span className="text-[11px] text-slate-400">
                  Background sync interval: <strong>{syncIntervalSeconds}s (Instant cPanel Sync)</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {emailAccounts.map((acc) => {
                  const isPwVisible = !!showPasswordMap[acc.id];
                  const isTesting = testingAccountId === acc.id;

                  return (
                    <div
                      key={acc.id}
                      className={`p-5 rounded-xl border transition-all flex flex-col justify-between ${
                        acc.isDefault
                          ? 'bg-emerald-50/20 border-emerald-300 dark:border-emerald-800/80 shadow-xs'
                          : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="space-y-3">
                        {/* Card Header */}
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center space-x-2">
                              <h5 className="font-bold text-slate-900 dark:text-white text-sm">{acc.accountName}</h5>
                              {acc.isDefault && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300">
                                  Default HR Mailbox
                                </span>
                              )}
                            </div>
                            <p className="font-mono text-xs text-emerald-700 dark:text-emerald-400 mt-0.5 font-semibold">
                              {acc.email}
                            </p>
                          </div>

                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {acc.assignedDepartment}
                          </span>
                        </div>

                        {/* Credentials Details */}
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-500">Password:</span>
                            <div className="flex items-center space-x-1.5 font-mono">
                              <span>{isPwVisible ? acc.password : '••••••••••••••••'}</span>
                              <button
                                type="button"
                                onClick={() => togglePasswordVisibility(acc.id)}
                                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                                title={isPwVisible ? 'Hide Password' : 'Show Password'}
                              >
                                {isPwVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-200 dark:border-slate-700">
                            <div>
                              <span className="text-slate-400 block text-[10px]">Incoming Server (IMAP):</span>
                              <span className="font-mono text-slate-700 dark:text-slate-300">
                                {acc.imapHost}:{acc.imapPort} (SSL)
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">Outgoing Server (SMTP):</span>
                              <span className="font-mono text-slate-700 dark:text-slate-300">
                                {acc.smtpHost}:{acc.smtpPort} (SSL)
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Sync Status Info */}
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span className="flex items-center">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5" />
                            Pulse: Every <strong>{acc.syncIntervalSeconds || 2}s</strong>
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">
                            Last synced: {acc.lastSyncedAt ? new Date(acc.lastSyncedAt).toLocaleTimeString() : 'Active'}
                          </span>
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleTestEmailHandshake(acc)}
                            loading={isTesting}
                            className="text-xs"
                          >
                            <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                            Test Connection
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleSyncSingleAccount(acc)}
                            loading={isTesting}
                            className="text-xs"
                          >
                            <RefreshCw className="w-3.5 h-3.5 mr-1" />
                            Sync Now
                          </Button>
                        </div>

                        {isSupervisor && (
                          <div className="flex items-center space-x-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingAccount(acc);
                                setEmailForm({
                                  accountName: acc.accountName,
                                  email: acc.email,
                                  password: acc.password,
                                  imapHost: acc.imapHost,
                                  imapPort: acc.imapPort,
                                  imapSecure: acc.imapSecure,
                                  smtpHost: acc.smtpHost,
                                  smtpPort: acc.smtpPort,
                                  smtpSecure: acc.smtpSecure,
                                  syncIntervalSeconds: acc.syncIntervalSeconds,
                                  isDefault: acc.isDefault,
                                  isActive: acc.isActive,
                                  assignedDepartment: acc.assignedDepartment,
                                });
                                setAddEmailModalOpen(true);
                              }}
                              title="Edit Mailbox Settings"
                              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            {!acc.isDefault && (
                              <button
                                type="button"
                                onClick={() => handleDeleteAccount(acc)}
                                title="Delete Mailbox"
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ADD / EDIT EMAIL ACCOUNT MODAL */}
            <Modal
              isOpen={addEmailModalOpen}
              onClose={() => {
                setAddEmailModalOpen(false);
                setEditingAccount(null);
              }}
              title={editingAccount ? `Edit Mailbox: ${editingAccount.email}` : 'Add Corporate Team Mailbox'}
              maxWidth="lg"
            >
              <form onSubmit={handleSaveEmailAccount} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Account Display Name *</label>
                    <input
                      type="text"
                      required
                      value={emailForm.accountName}
                      onChange={(e) => setEmailForm({ ...emailForm, accountName: e.target.value })}
                      placeholder="e.g. Careers &amp; Inquiries"
                      className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Assigned Department</label>
                    <input
                      type="text"
                      value={emailForm.assignedDepartment}
                      onChange={(e) => setEmailForm({ ...emailForm, assignedDepartment: e.target.value })}
                      placeholder="e.g. Talent Acquisition, Leadership"
                      className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={emailForm.email}
                      onChange={(e) => setEmailForm({ ...emailForm, email: e.target.value })}
                      placeholder="careers@pileandloop.com"
                      className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Email Password *</label>
                    <input
                      type="password"
                      required
                      value={emailForm.password}
                      onChange={(e) => setEmailForm({ ...emailForm, password: e.target.value })}
                      placeholder="••••••••••••"
                      className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Incoming Server (IMAP)</label>
                    <input
                      type="text"
                      value={emailForm.imapHost}
                      onChange={(e) => setEmailForm({ ...emailForm, imapHost: e.target.value })}
                      className="w-full p-1.5 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 font-mono text-[11px]"
                    />
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-[10px] text-slate-400">Port:</span>
                      <input
                        type="number"
                        value={emailForm.imapPort}
                        onChange={(e) => setEmailForm({ ...emailForm, imapPort: Number(e.target.value) })}
                        className="w-16 p-1 border rounded text-[11px] font-mono"
                      />
                      <span className="text-[10px] text-emerald-600 font-semibold">SSL/TLS</span>
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Outgoing Server (SMTP)</label>
                    <input
                      type="text"
                      value={emailForm.smtpHost}
                      onChange={(e) => setEmailForm({ ...emailForm, smtpHost: e.target.value })}
                      className="w-full p-1.5 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 font-mono text-[11px]"
                    />
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-[10px] text-slate-400">Port:</span>
                      <input
                        type="number"
                        value={emailForm.smtpPort}
                        onChange={(e) => setEmailForm({ ...emailForm, smtpPort: Number(e.target.value) })}
                        className="w-16 p-1 border rounded text-[11px] font-mono"
                      />
                      <span className="text-[10px] text-emerald-600 font-semibold">SSL/TLS</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emailForm.isDefault}
                      onChange={(e) => setEmailForm({ ...emailForm, isDefault: e.target.checked })}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-slate-700 dark:text-slate-300">Set as Primary Default Mailbox</span>
                  </label>

                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      type="button"
                      onClick={() => {
                        setAddEmailModalOpen(false);
                        setEditingAccount(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button size="sm" variant="primary" type="submit">
                      {editingAccount ? 'Save Account' : 'Connect Mailbox'}
                    </Button>
                  </div>
                </div>
              </form>
            </Modal>
          </div>
        )}

        {/* AI SETTINGS */}
        {activeTab === 'AI' && (
          <form onSubmit={handleSaveSettings} className="space-y-4 max-w-xl text-xs">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Gemini Model Selection</label>
              <select
                value={settings.aiModel}
                onChange={(e) => setSettings({ ...settings, aiModel: e.target.value })}
                className="w-full p-2 border rounded bg-white"
              >
                <option value="gemini-1.5-flash">Gemini 1.5 Flash (Recommended for speed & accuracy)</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
              </select>
            </div>
            <Button size="sm" type="submit" loading={savingSettings}>Save AI Configuration</Button>
          </form>
        )}

        {/* USERS & ACCESS REQUESTS (SUPER ADMIN ONLY) */}
        {activeTab === 'USERS' && isSuperAdmin && (
          <div className="space-y-6 text-xs">
            
            {/* Super Admin Status Card */}
            <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-sky-600 flex items-center justify-center text-white">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sky-950">Super Admin / System Owner</h4>
                  <p className="text-[11px] text-sky-800">
                    Logged in as <strong>pileandloop@gmail.com</strong>. You hold root authority to approve access requests and allocate RBAC roles.
                  </p>
                </div>
              </div>
              <Button size="sm" onClick={() => setAddUserModalOpen(true)}>
                <UserPlus className="w-3.5 h-3.5 mr-1" />
                Create Account Manually
              </Button>
            </div>

            {/* PENDING ACCESS REQUESTS QUEUE */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">Pending Sign-Up Requests</h3>
                  {pendingRequests.length > 0 ? (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-semibold border border-amber-200">
                      {pendingRequests.length} Pending Review
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-semibold border border-emerald-200">
                      All Caught Up
                    </span>
                  )}
                </div>
              </div>

              {pendingRequests.length === 0 ? (
                <div className="p-6 border border-dashed border-slate-200 rounded-xl text-center text-slate-400">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <p className="font-medium text-slate-600">No pending sign-up requests</p>
                  <p className="text-[11px] mt-0.5">When new team members submit registration requests from the login page, they will appear here for role allocation.</p>
                </div>
              ) : (
                <div className="border border-amber-200 bg-amber-50/40 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left">
                    <thead className="bg-amber-100/70 border-b border-amber-200 text-amber-900 font-semibold">
                      <tr>
                        <th className="p-3">Applicant</th>
                        <th className="p-3">Department & Reason</th>
                        <th className="p-3">Allocate RBAC Role</th>
                        <th className="p-3 text-right">Approval Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-100 bg-white">
                      {pendingRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-amber-50/50">
                          <td className="p-3">
                            <span className="font-bold text-slate-900 block">{req.fullName}</span>
                            <span className="text-[11px] font-mono text-slate-500">{req.email}</span>
                          </td>
                          <td className="p-3">
                            <span className="font-semibold text-slate-700 block">{req.department}</span>
                            <span className="text-[11px] text-slate-500 italic">{req.reason || 'No description provided'}</span>
                          </td>
                          <td className="p-3">
                            <select
                              value={selectedRoles[req.id] || req.requestedRole || 'TEAM_MEMBER'}
                              onChange={(e) => setSelectedRoles({ ...selectedRoles, [req.id]: e.target.value })}
                              className="p-1.5 border border-slate-300 rounded bg-white font-semibold text-xs text-slate-800 shadow-sm focus:ring-2 focus:ring-sky-500"
                            >
                              <option value="TEAM_MEMBER">TEAM_MEMBER (Self-service & Attendance)</option>
                              <option value="HR_INTERN">HR_INTERN (Recruitment & Sourcing)</option>
                              <option value="HR_EXECUTIVE">HR_EXECUTIVE (Interviews & Drafting)</option>
                              <option value="HR_SUPERVISOR">HR_SUPERVISOR (Approvals & Offboarding)</option>
                              <option value="SUPER_ADMIN">SUPER_ADMIN (Full Governance)</option>
                            </select>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleApproveRequest(req.id)}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium text-xs flex items-center gap-1 shadow-sm transition"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Approve & Allocate
                              </button>
                              <button
                                onClick={() => handleRejectRequest(req.id)}
                                className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded font-medium text-xs flex items-center gap-1 border border-red-200 transition"
                              >
                                <X className="w-3.5 h-3.5" />
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ACTIVE INTERNAL ACCOUNTS TABLE */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Active Internal Accounts ({usersList.length})</h3>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="p-3">User</th>
                      <th className="p-3">Role</th>
                      <th className="p-3">Department</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {usersList.map((u) => (
                      <tr key={u.uid} className="hover:bg-slate-50">
                        <td className="p-3">
                          <span className="font-semibold text-slate-900 block">{u.displayName}</span>
                          <span className="text-[11px] font-mono text-slate-400">{u.email}</span>
                        </td>
                        <td className="p-3">
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.uid, e.target.value as UserRole)}
                            className="p-1 border rounded bg-white font-mono text-[11px]"
                          >
                            <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                            <option value="HR_SUPERVISOR">HR_SUPERVISOR</option>
                            <option value="HR_EXECUTIVE">HR_EXECUTIVE</option>
                            <option value="HR_INTERN">HR_INTERN</option>
                            <option value="TEAM_MEMBER">TEAM_MEMBER</option>
                          </select>
                        </td>
                        <td className="p-3 text-slate-600">{u.department || 'HR'}</td>
                        <td className="p-3">
                          <Badge variant={u.disabled ? 'danger' : 'success'}>
                            {u.disabled ? 'Disabled' : 'Active'}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleToggleDisabled(u.uid, !!u.disabled)}
                          >
                            {u.disabled ? 'Enable' : 'Disable'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* INTEGRATIONS (DISCORD & SUPABASE) */}
        {activeTab === 'INTEGRATIONS' && (
          <div className="space-y-6 text-xs max-w-2xl">
            {/* Discord Webhook Card */}
            <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-4 shadow-sm">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <div className="w-8 h-8 rounded-lg bg-[#5865F2] flex items-center justify-center text-white font-bold">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Discord Real-Time Webhook Alerts</h3>
                  <p className="text-[11px] text-slate-500">Automatically broadcast candidate applications, sign-up requests, and attendance punches to your Discord server.</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Discord Webhook URL</label>
                  <input
                    type="url"
                    value={discordUrl}
                    onChange={(e) => setDiscordUrl(e.target.value)}
                    placeholder="https://discord.com/api/webhooks/123456789/abcdefgh..."
                    className="w-full p-2 border border-slate-300 rounded font-mono text-[11px] focus:ring-2 focus:ring-sky-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    How to get: In Discord, go to Channel Settings → Integrations → Webhooks → Copy Webhook URL.
                  </p>
                </div>

                {discordStatus && (
                  <div className={`p-2.5 rounded text-xs font-semibold ${discordStatus.startsWith('Success') ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {discordStatus}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <Button size="sm" onClick={handleSaveDiscord} className="bg-sky-600 hover:bg-sky-700 text-white">
                    Save Webhook URL
                  </Button>
                  <Button size="sm" variant="outline" loading={testingDiscord} onClick={handleTestDiscord}>
                    Send Live Test Alert to Discord
                  </Button>
                </div>
              </div>
            </div>

            {/* Supabase Cloud Database Card */}
            <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-4 shadow-sm">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <div className="w-8 h-8 rounded-lg bg-[#3ECF8E] flex items-center justify-center text-slate-900 font-bold">
                  <Database className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Supabase Cloud Database Synchronization</h3>
                  <p className="text-[11px] text-slate-500">Connect a free PostgreSQL database from supabase.com for real-time sync across multiple laptops and devices.</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Supabase Project URL</label>
                  <input
                    type="url"
                    value={supabaseUrl}
                    onChange={(e) => setSupabaseUrl(e.target.value)}
                    placeholder="https://xyzcompany.supabase.co"
                    className="w-full p-2 border border-slate-300 rounded font-mono text-[11px] focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Supabase Anon Public API Key</label>
                  <input
                    type="password"
                    value={supabaseKey}
                    onChange={(e) => setSupabaseKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full p-2 border border-slate-300 rounded font-mono text-[11px] focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Found in Supabase Console → Project Settings → API → anon public key.
                  </p>
                </div>

                {supabaseStatus && (
                  <div className={`p-2.5 rounded text-xs font-semibold ${supabaseStatus.startsWith('Success') ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {supabaseStatus}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <Button size="sm" loading={testingSupabase} onClick={handleSaveSupabase} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    Save & Test Supabase Handshake
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      <Modal isOpen={addUserModalOpen} onClose={() => setAddUserModalOpen(false)} title="Create Internal Account (RBAC)" maxWidth="md">
        <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-700 font-medium mb-1">Full Name *</label>
            <input type="text" required value={newUser.displayName} onChange={(e) => setNewUser({ ...newUser, displayName: e.target.value })} placeholder="e.g. Noreen Akhtar" className="w-full p-2 border rounded" />
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1">Account Email *</label>
            <input type="email" required value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} placeholder="noreen@pileandloop.com" className="w-full p-2 border rounded" />
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1">Password *</label>
            <input type="password" required minLength={6} value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} placeholder="????????" className="w-full p-2 border rounded" />
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1">Assigned Role *</label>
            <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value as any })} className="w-full p-2 border rounded bg-white">
              <option value="HR_SUPERVISOR">HR Supervisor</option>
              <option value="HR_EXECUTIVE">HR Executive</option>
              <option value="HR_INTERN">HR Intern</option>
              <option value="TEAM_MEMBER">Team Member / Intern</option>
              <option value="SUPER_ADMIN">Super Admin</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1">Department</label>
            <input type="text" value={newUser.department} onChange={(e) => setNewUser({ ...newUser, department: e.target.value })} className="w-full p-2 border rounded" />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <Button size="sm" variant="outline" type="button" onClick={() => setAddUserModalOpen(false)}>Cancel</Button>
            <Button size="sm" type="submit" loading={creatingUser}>Create Account</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
