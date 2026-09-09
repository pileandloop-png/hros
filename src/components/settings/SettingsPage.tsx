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
  ShieldCheck
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { isSuperAdmin, isSupervisor } = useAuth();
  const [activeTab, setActiveTab] = useState<'COMPANY' | 'RECRUITMENT' | 'INTERNSHIP' | 'EMAIL' | 'AI' | 'USERS'>('COMPANY');

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
          className={`pb-3 px-4 flex items-center gap-1.5 border-b-2 transition ${activeTab === 'COMPANY' ? 'border-sky-600 text-sky-600 font-semibold' : 'border-transparent hover:text-slate-800'}`}
        >
          <Building className="w-3.5 h-3.5" /> Company & General
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
          className={`pb-3 px-4 flex items-center gap-1.5 border-b-2 transition ${activeTab === 'EMAIL' ? 'border-sky-600 text-sky-600 font-semibold' : 'border-transparent hover:text-slate-800'}`}
        >
          <Mail className="w-3.5 h-3.5" /> cPanel Mail Config
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
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        {/* COMPANY SETTINGS */}
        {activeTab === 'COMPANY' && (
          <form onSubmit={handleSaveSettings} className="space-y-4 max-w-xl text-xs">
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
              <label className="block text-slate-700 font-medium mb-1">Primary HR Mailbox</label>
              <input
                type="email"
                value={settings.hrEmail}
                onChange={(e) => setSettings({ ...settings, hrEmail: e.target.value })}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">Authoritative Timezone</label>
              <input
                type="text"
                disabled
                value={settings.timezone}
                className="w-full p-2 border rounded bg-slate-50 text-slate-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">Locked to Asia/Karachi (PKT) for all attendance and pipeline timelines.</p>
            </div>
            <Button size="sm" type="submit" loading={savingSettings}>Save Changes</Button>
          </form>
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

        {/* EMAIL SETTINGS */}
        {activeTab === 'EMAIL' && (
          <div className="space-y-4 max-w-xl text-xs">
            <div className="p-3 bg-sky-50 border border-sky-200 rounded-lg text-sky-900">
              <p className="font-semibold">cPanel Server Mail Synchronization</p>
              <p className="text-[11px] text-sky-700 mt-0.5">
                Target mailbox: <strong>hr@pileandloop.com</strong> on host <strong>mail.pileandloop.com</strong>.
              </p>
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">Scheduled Sync Interval</label>
              <input
                type="text"
                disabled
                value="Every 5 minutes (Automated cron)"
                className="w-full p-2 border rounded bg-slate-50 text-slate-500 font-mono"
              />
            </div>
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
