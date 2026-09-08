import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { createInternalUser, updateUserRole, disableInternalUser } from '../../services/api';
import { UserRole, UserProfile } from '../../types/auth';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
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
  Calendar
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { isSuperAdmin, isSupervisor } = useAuth();
  const [activeTab, setActiveTab] = useState<'COMPANY' | 'RECRUITMENT' | 'INTERNSHIP' | 'EMAIL' | 'AI' | 'USERS'>('COMPANY');

  // System Settings State
  const [settings, setSettings] = useState({
    companyName: 'Pile & Loop',
    timezone: 'Asia/Karachi',
    hrEmail: 'hr@pileandloop.com',
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
  const [loadingUsers, setLoadingUsers] = useState(false);

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
      const snap = await getDocs(collection(db, 'users'));
      setUsersList(snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
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

  const handleToggleDisabled = async (targetUid: string, currentDisabled: boolean) => {
    try {
      await disableInternalUser(targetUid, !currentDisabled);
      loadUsers();
    } catch (err: any) {
      alert(err.message || 'Toggle disabled failed');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-slate-900">System Settings & RBAC Administration</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure operational policies, Google Gemini AI parameters, and manage team accounts
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 flex space-x-6 text-xs font-medium overflow-x-auto">
        {[
          { id: 'COMPANY', label: 'Company & Timezone' },
          { id: 'RECRUITMENT', label: 'Recruitment & Booking' },
          { id: 'INTERNSHIP', label: 'Internship Policy' },
          { id: 'EMAIL', label: 'cPanel Email Sync' },
          { id: 'AI', label: 'Gemini AI Assistant' },
          ...(isSuperAdmin ? [{ id: 'USERS', label: 'User Roles & Access (Super Admin)' }] : []),
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-2.5 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-sky-600 text-sky-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
        {/* COMPANY */}
        {activeTab === 'COMPANY' && (
          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs max-w-md">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Company Name</label>
              <input
                type="text"
                value={settings.companyName}
                onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                className="w-full p-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Standard System Timezone</label>
              <input
                type="text"
                disabled
                value="Asia/Karachi (PKT UTC+5)"
                className="w-full p-2 border rounded bg-slate-100 font-mono text-slate-600"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Primary HR Mailbox</label>
              <input
                type="text"
                value={settings.hrEmail}
                onChange={(e) => setSettings({ ...settings, hrEmail: e.target.value })}
                className="w-full p-2 border rounded font-mono"
              />
            </div>

            <Button size="sm" type="submit" loading={savingSettings}>Save Company Settings</Button>
          </form>
        )}

        {/* RECRUITMENT */}
        {activeTab === 'RECRUITMENT' && (
          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs max-w-lg">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Maximum Follow-Ups per Candidate</label>
              <input
                type="number"
                min="1"
                max="3"
                value={settings.defaultFollowUpLimit}
                onChange={(e) => setSettings({ ...settings, defaultFollowUpLimit: Number(e.target.value) })}
                className="w-full p-2 border rounded"
              />
              <span className="text-[10px] text-slate-400">Strictly enforced at maximum 2 follow-ups by policy.</span>
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Google Booking Link (Interview Invitations)</label>
              <input
                type="text"
                value={settings.interviewBookingUrl}
                onChange={(e) => setSettings({ ...settings, interviewBookingUrl: e.target.value })}
                className="w-full p-2 border rounded font-mono"
              />
            </div>

            <Button size="sm" type="submit" loading={savingSettings}>Save Recruitment Settings</Button>
          </form>
        )}

        {/* INTERNSHIP */}
        {activeTab === 'INTERNSHIP' && (
          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs max-w-md">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Default Duration (Months)</label>
              <input
                type="number"
                value={settings.defaultDurationMonths}
                onChange={(e) => setSettings({ ...settings, defaultDurationMonths: Number(e.target.value) })}
                className="w-full p-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Expected Productive Hours / Day</label>
              <input
                type="number"
                value={settings.expectedHoursPerDay}
                onChange={(e) => setSettings({ ...settings, expectedHoursPerDay: Number(e.target.value) })}
                className="w-full p-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Core Operational Window</label>
              <input
                type="text"
                value={settings.coreHours}
                onChange={(e) => setSettings({ ...settings, coreHours: e.target.value })}
                className="w-full p-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Leave Allowance (Days per Month)</label>
              <input
                type="number"
                value={settings.leaveAllowanceDaysPerMonth}
                onChange={(e) => setSettings({ ...settings, leaveAllowanceDaysPerMonth: Number(e.target.value) })}
                className="w-full p-2 border rounded"
              />
            </div>

            <Button size="sm" type="submit" loading={savingSettings}>Save Internship Policy</Button>
          </form>
        )}

        {/* EMAIL */}
        {activeTab === 'EMAIL' && (
          <div className="space-y-4 text-xs max-w-lg">
            <div className="p-3 bg-slate-50 border rounded-lg space-y-1">
              <span className="font-semibold text-slate-800">cPanel IMAP / SMTP Security Architecture</span>
              <p className="text-slate-500">
                Mail credentials are stored securely in Google Cloud Secret Manager and accessed exclusively via Cloud Functions. Passwords are never committed or rendered on clients.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between p-2.5 border rounded">
                <span>IMAP Host</span>
                <span className="font-mono text-slate-700">mail.pileandloop.com:993 (SSL)</span>
              </div>
              <div className="flex justify-between p-2.5 border rounded">
                <span>SMTP Host</span>
                <span className="font-mono text-slate-700">mail.pileandloop.com:465 (SSL)</span>
              </div>
              <div className="flex justify-between p-2.5 border rounded">
                <span>Mailbox Account</span>
                <span className="font-mono text-slate-700">hr@pileandloop.com</span>
              </div>
              <div className="flex justify-between p-2.5 border rounded">
                <span>Sync Interval</span>
                <span className="font-mono text-slate-700">Every 5 Minutes (Cloud Scheduler)</span>
              </div>
            </div>
          </div>
        )}

        {/* AI */}
        {activeTab === 'AI' && (
          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs max-w-lg">
            <div className="p-3 bg-sky-50 border border-sky-200 rounded-lg space-y-1 text-sky-900">
              <span className="font-semibold flex items-center">
                <Sparkles className="w-3.5 h-3.5 mr-1" />
                Prompt Injection Defense & Human-in-the-Loop Safeguard:
              </span>
              <p className="text-[11px]">
                Applicant messages are strictly isolated as untrusted data. Gemini AI never auto-sends emails or modifies candidate stages without explicit HR review and action.
              </p>
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Model Selection</label>
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

        {/* USERS (SUPER ADMIN ONLY) */}
        {activeTab === 'USERS' && isSuperAdmin && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Internal Accounts & RBAC Roles</h3>
              <Button size="sm" onClick={() => setAddUserModalOpen(true)}>
                <UserPlus className="w-3.5 h-3.5 mr-1" />
                Create Internal Account
              </Button>
            </div>

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
        )}
      </div>

      {/* Add User Modal */}
      <Modal isOpen={addUserModalOpen} onClose={() => setAddUserModalOpen(false)} title="Create Internal Account (Firebase Auth + RBAC)" maxWidth="md">
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
            <label className="block text-slate-700 font-medium mb-1">Temporary Password *</label>
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
