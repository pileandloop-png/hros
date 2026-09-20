import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { getInviteByToken, acceptInvite, TeamInvite } from '../../services/inviteService';
import { useAuth } from '../../contexts/AuthContext';
import { useCompanyProfile } from '../../contexts/CompanyContext';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../common/Button';
import {
  ShieldCheck,
  Lock,
  User,
  Mail,
  Building,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowRight,
} from 'lucide-react';

export const AcceptInvitePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { login } = useAuth();
  const { company } = useCompanyProfile();
  const toast = useToast();

  const [invite, setInvite] = useState<TeamInvite | null>(null);
  const [checking, setChecking] = useState(true);
  const [invalidReason, setInvalidReason] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!token) {
      setInvalidReason('No invitation token provided. Please use the complete link sent to your email.');
      setChecking(false);
      return;
    }

    const found = getInviteByToken(token);
    if (!found) {
      setInvalidReason('This invitation link is invalid or has expired. Please ask your administrator to send a new invite.');
      setChecking(false);
      return;
    }

    if (found.status === 'REVOKED') {
      setInvalidReason('This invitation has been revoked by a workspace administrator.');
      setChecking(false);
      return;
    }

    if (found.status === 'ACCEPTED') {
      setInvalidReason('This invitation has already been accepted. Please proceed to the login page.');
      setChecking(false);
      return;
    }

    if (new Date(found.expiresAt) < new Date()) {
      setInvalidReason('This invitation link expired on ' + new Date(found.expiresAt).toLocaleDateString() + '. Please request a new invite.');
      setChecking(false);
      return;
    }

    setInvite(found);
    setFullName(found.displayName || '');
    setChecking(false);
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!token || !invite) return;

    if (password.length < 6) {
      setFormError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match. Please re-enter your password.');
      return;
    }

    setSubmitting(true);
    try {
      const ok = acceptInvite(token, password, fullName.trim());
      if (!ok) {
        throw new Error('Failed to activate invitation. The invite may have expired or already been claimed.');
      }

      toast.success('Invitation accepted! Logging into your workspace...');

      // Auto sign-in
      try {
        await login(invite.email, password);
        navigate('/');
      } catch {
        toast.info('Account created successfully! Please sign in with your credentials.');
        navigate('/login');
      }
    } catch (err: any) {
      setFormError(err.message || 'An error occurred while accepting your invitation.');
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'Super Administrator';
      case 'HR_SUPERVISOR':
        return 'HR Supervisor';
      case 'HR_EXECUTIVE':
        return 'HR Executive';
      case 'HR_INTERN':
        return 'HR Intern / Associate';
      case 'TEAM_MEMBER':
        return 'Team Member';
      default:
        return role;
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-900 p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 border border-slate-100">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-6 text-center">
          {company.logoUrl ? (
            <img src={company.logoUrl} alt={company.companyName} className="h-12 max-w-[180px] object-contain mb-2" />
          ) : (
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-md mb-2"
              style={{ backgroundColor: company.primaryColor || '#10B981' }}
            >
              {company.companyName.slice(0, 3).toUpperCase()}
            </div>
          )}
          <h2 className="text-xl font-black text-slate-900 tracking-tight">{company.companyName}</h2>
          <p className="text-xs text-slate-500">Human Resources & Operations System</p>
        </div>

        {checking ? (
          <div className="text-center py-10 space-y-3">
            <div className="w-8 h-8 border-3 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-500">Validating your workspace invitation...</p>
          </div>
        ) : invalidReason ? (
          <div className="space-y-4 text-center py-4">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Invitation Unavailable</h3>
            <p className="text-xs text-slate-600 leading-relaxed max-w-xs mx-auto">
              {invalidReason}
            </p>
            <div className="pt-3">
              <Link to="/login">
                <Button size="sm" className="w-full bg-slate-800 hover:bg-slate-900 text-white">
                  Back to Sign In
                </Button>
              </Link>
            </div>
          </div>
        ) : invite ? (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Invitation Details Banner */}
            <div className="bg-sky-50 border border-sky-200 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center gap-2 text-sky-900 font-semibold">
                <ShieldCheck className="w-4 h-4 text-sky-600 shrink-0" />
                <span>You've been invited to join the team!</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-sky-200/60">
                <div>
                  <span className="text-slate-500 block">Assigned Role:</span>
                  <span className="font-bold text-sky-950">{getRoleLabel(invite.role)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Department:</span>
                  <span className="font-bold text-sky-950">{invite.department || 'General'}</span>
                </div>
              </div>
            </div>

            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Email (Read-only) */}
            <div>
              <label className="block text-slate-700 font-medium mb-1">Invited Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  disabled
                  value={invite.email}
                  className="w-full pl-9 pr-3 py-2 border rounded-lg bg-slate-100 text-slate-500 font-mono text-[11px] cursor-not-allowed"
                />
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-slate-700 font-medium mb-1">Your Full Name *</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Daniyal Tariq"
                  className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 text-slate-800"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-slate-700 font-medium mb-1">Create Password *</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-9 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 text-slate-800"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-slate-700 font-medium mb-1">Confirm Password *</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 text-slate-800"
                />
              </div>
            </div>

            <div className="pt-2">
              <Button
                size="md"
                type="submit"
                loading={submitting}
                className="w-full bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2.5"
              >
                Join Workspace & Activate Account <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>

            <div className="text-center pt-2">
              <span className="text-slate-500">Already have an active account? </span>
              <Link to="/login" className="text-sky-600 hover:underline font-semibold">
                Sign In
              </Link>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  );
};
