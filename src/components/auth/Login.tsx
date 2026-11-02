import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCompanyProfile } from '../../contexts/CompanyContext';
import { Button } from '../common/Button';
import {
  Lock,
  Mail,
  ShieldAlert,
  UserPlus,
  CheckCircle2,
  Building,
  ShieldCheck,
  User,
  Phone,
  KeyRound,
  Clock,
  Sparkles,
  ArrowRight,
  Check
} from 'lucide-react';
import { submitUserRequest } from '../../services/mock/auth';
import { store } from '../../services/store';
import { checkIn } from '../../services/api';

export const Login: React.FC = () => {
  const { login, loginWithPhoneLast4 } = useAuth();
  const { company } = useCompanyProfile();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'pin' | 'signin' | 'signup'>('pin');

  // Phone PIN State (Last 4 digits of Mobile Number)
  const [phonePin, setPhonePin] = useState(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('pin');
      if (p) return p.slice(0, 4);
    }
    return '';
  });
  const [matchedPerson, setMatchedPerson] = useState<any | null>(null);
  const [autoRecordTimestamp, setAutoRecordTimestamp] = useState(true);

  // Sign In state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Sign Up / Request Access state
  const [reqFullName, setReqFullName] = useState('');
  const [reqEmail, setReqEmail] = useState('');
  const [reqPassword, setReqPassword] = useState('');
  const [reqDepartment, setReqDepartment] = useState('Engineering');
  const [reqRole, setReqRole] = useState('TEAM_MEMBER');
  const [reqReason, setReqReason] = useState('');
  const [reqSuccess, setReqSuccess] = useState('');

  // Real-time lookup of employee when 4 digits are entered
  useEffect(() => {
    const clean = phonePin.replace(/\D/g, '').trim();
    if (clean.length >= 4) {
      const last4 = clean.slice(-4);
      const people = store.getCollection('people') || {};
      const found = Object.values(people).find((p: any) => {
        if (!p.phone) return false;
        const pClean = p.phone.replace(/\D/g, '');
        return pClean.endsWith(last4);
      });
      setMatchedPerson(found || null);
    } else {
      setMatchedPerson(null);
    }
  }, [phonePin]);

  // Handle Login via Last 4 Digits of Mobile Phone
  const handlePhonePinLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    const clean = phonePin.replace(/\D/g, '').trim().slice(-4);
    if (clean.length < 4) {
      setError('Please enter the last 4 digits of your registered mobile phone number.');
      return;
    }

    setLoading(true);
    try {
      const { person } = await loginWithPhoneLast4(clean);

      // 1-Click Timestamp recording on login if selected
      if (autoRecordTimestamp && person) {
        try {
          await checkIn('Instant Check-In via Mobile Phone PIN Login', undefined, {
            uid: person.uid || person.id,
            displayName: person.fullName,
            department: person.department,
            role: person.designation || person.role
          });
        } catch {
          // Continue login even if attendance was already punched
        }
      }

      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Mobile PIN sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (userEmail: string, userPass: string) => {
    setEmail(userEmail);
    setPassword(userPass);
    setError('');
  };

  const handleQuickLogin = async (userEmail: string, userPass: string) => {
    setEmail(userEmail);
    setPassword(userPass);
    setError('');
    setLoading(true);
    try {
      await login(userEmail, userPass);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Authentication error.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setReqSuccess('');
    setLoading(true);
    try {
      const res = await submitUserRequest({
        fullName: reqFullName,
        email: reqEmail,
        password: reqPassword,
        department: reqDepartment,
        requestedRole: reqRole,
        reason: reqReason
      });
      setReqSuccess(res.message);
      setReqFullName('');
      setReqEmail('');
      setReqPassword('');
      setReqReason('');
    } catch (err: any) {
      setError(err.message || 'Failed to submit request.');
    } finally {
      setLoading(false);
    }
  };

  const fillPin = (digits: string) => {
    setPhonePin(digits);
    setError('');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 p-4 font-sans text-slate-800">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-slate-200/90 relative overflow-hidden">
        
        {/* Subtle decorative accent pill */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-emerald-500 via-sky-500 to-indigo-600" />

        {/* Header Branding */}
        <div className="flex flex-col items-center mb-6 pt-2">
          <img
            src="/favicon.svg"
            alt={company.companyName}
            className="w-12 h-12 rounded-2xl shadow-sm mb-2"
          />
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">{company.companyName}</h1>
          <p className="text-xs text-slate-500 mt-0.5">{company.tagline || 'AI Recruitment & Workforce Operating System'}</p>
        </div>

        {/* 3-Tab Navigation */}
        <div className="flex border-b border-slate-200 mb-6 bg-slate-50/80 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => { setActiveTab('pin'); setError(''); }}
            className={`flex-1 py-2 text-xs font-semibold text-center rounded-lg transition-all cursor-pointer ${
              activeTab === 'pin'
                ? 'bg-white text-emerald-700 shadow-xs border border-slate-200/80'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            📱 Phone PIN
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('signin'); setError(''); }}
            className={`flex-1 py-2 text-xs font-semibold text-center rounded-lg transition-all cursor-pointer ${
              activeTab === 'signin'
                ? 'bg-white text-sky-700 shadow-xs border border-slate-200/80'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            ✉️ Email Login
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('signup'); setError(''); }}
            className={`flex-1 py-2 text-xs font-semibold text-center rounded-lg transition-all cursor-pointer ${
              activeTab === 'signup'
                ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            📝 Join Team
          </button>
        </div>

        {/* Feedback Alerts */}
        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-700 text-xs">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        )}

        {reqSuccess && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-emerald-800 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Access Request Submitted!</p>
              <p className="mt-0.5 text-emerald-700">
                Your request has been forwarded to the Super Admin (<strong>pileandloop@gmail.com</strong>).
              </p>
            </div>
          </div>
        )}

        {/* 1. PHONE PIN LOGIN TAB (Last 4 Digits of Mobile Number) */}
        {activeTab === 'pin' && (
          <div className="space-y-4">
            <div className="bg-emerald-50/60 border border-emerald-200/70 rounded-2xl p-4 text-xs">
              <div className="flex items-center space-x-2 text-emerald-800 font-bold">
                <KeyRound className="w-4 h-4 text-emerald-600" />
                <span>Employee Quick Access</span>
              </div>
              <p className="text-slate-600 mt-1 leading-relaxed text-[11px]">
                Enter the <strong>last 4 digits</strong> of your registered mobile phone number for instant workspace authentication.
              </p>
            </div>

            <form onSubmit={handlePhonePinLogin} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Last 4 Digits of Mobile Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    value={phonePin}
                    onChange={(e) => setPhonePin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="e.g. 7890 or 6543"
                    className="w-full pl-9 pr-3 py-2.5 text-base tracking-widest font-mono font-bold border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 bg-white"
                    autoFocus
                  />
                  {matchedPerson && (
                    <div className="absolute right-3 top-3">
                      <Check className="w-4 h-4 text-emerald-600" />
                    </div>
                  )}
                </div>
              </div>

              {/* Matched Employee Identity Preview */}
              {matchedPerson ? (
                <div className="p-3.5 bg-slate-50 border border-emerald-200 rounded-xl flex items-center space-x-3 animate-fadeIn">
                  <div className="w-9 h-9 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">
                    {matchedPerson.fullName?.charAt(0) || 'U'}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {matchedPerson.fullName}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {matchedPerson.designation || matchedPerson.jobTitle || 'Staff'} &bull; {matchedPerson.department}
                    </p>
                    <p className="text-[10px] text-emerald-700 font-mono">
                      Phone verified: ••••{phonePin}
                    </p>
                  </div>
                </div>
              ) : phonePin.length === 4 ? (
                <p className="text-[11px] text-amber-600 italic">
                  No employee registered with mobile number ending in ...{phonePin}.
                </p>
              ) : null}

              {/* 1-Click Timestamp Checkbox */}
              <label className="flex items-start space-x-2 text-xs text-slate-700 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={autoRecordTimestamp}
                  onChange={(e) => setAutoRecordTimestamp(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500 mt-0.5 cursor-pointer"
                />
                <span className="leading-tight">
                  <strong className="text-slate-900">1-Click Timestamp:</strong> Record Check-In timestamp on login in PKT.
                </span>
              </label>

              <Button
                type="submit"
                disabled={loading || phonePin.length < 4}
                className="w-full justify-center bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-xl text-xs transition shadow-xs cursor-pointer"
              >
                {loading ? (
                  'Verifying PIN...'
                ) : matchedPerson ? (
                  <>
                    Sign In as {matchedPerson.fullName.split(' ')[0]}
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </>
                ) : (
                  'Authenticate Phone PIN'
                )}
              </Button>
            </form>

            {/* Quick Test PIN Chips for Demonstration */}
            <div className="pt-3 border-t border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Team Demo PIN Shortcuts
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => fillPin('7890')}
                  className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11px] text-slate-700 font-mono transition cursor-pointer"
                >
                  Hamza: <strong>7890</strong>
                </button>
                <button
                  type="button"
                  onClick={() => fillPin('6543')}
                  className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11px] text-slate-700 font-mono transition cursor-pointer"
                >
                  Ayesha: <strong>6543</strong>
                </button>
                <button
                  type="button"
                  onClick={() => fillPin('0005')}
                  className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11px] text-slate-700 font-mono transition cursor-pointer"
                >
                  Saad: <strong>0005</strong>
                </button>
                <button
                  type="button"
                  onClick={() => fillPin('0004')}
                  className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11px] text-slate-700 font-mono transition cursor-pointer"
                >
                  Zeeshan: <strong>0004</strong>
                </button>
                <button
                  type="button"
                  onClick={() => fillPin('0001')}
                  className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11px] text-slate-700 font-mono transition cursor-pointer"
                >
                  Admin: <strong>0001</strong>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. SIGN IN TAB (Email & Password) */}
        {activeTab === 'signin' && (
          <div>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="pileandloop@gmail.com"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 bg-white"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full justify-center bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2.5 rounded-xl text-xs transition shadow-xs cursor-pointer"
              >
                {loading ? 'Authenticating...' : 'Sign In to Workspace'}
              </Button>
            </form>

            {/* Quick Fill Super Admin Card */}
            <div className="mt-5 pt-4 border-t border-slate-100">
              <div className="bg-sky-50 border border-sky-200/70 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-sky-900">
                    <ShieldCheck className="w-4 h-4 text-sky-600" />
                    Super Admin Credentials
                  </div>
                  <div className="text-[11px] text-sky-700 font-mono mt-0.5">
                    pileandloop@gmail.com &bull; fourty420
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('pileandloop@gmail.com', 'fourty420')}
                  disabled={loading}
                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
                >
                  Quick Login
                </button>
              </div>

              {/* Other Roles Quick Switch */}
              <div className="mt-3">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Other Staff Accounts
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => fillCredentials('supervisor@pileandloop.com', 'fourty420')}
                    className="p-2 border border-slate-200 rounded-lg text-left hover:border-sky-300 hover:bg-slate-50 transition cursor-pointer"
                  >
                    <div className="text-xs font-semibold text-slate-800">HR Supervisor</div>
                    <div className="text-[10px] text-slate-400 truncate">supervisor@pileandloop.com</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => fillCredentials('executive@pileandloop.com', 'fourty420')}
                    className="p-2 border border-slate-200 rounded-lg text-left hover:border-sky-300 hover:bg-slate-50 transition cursor-pointer"
                  >
                    <div className="text-xs font-semibold text-slate-800">HR Executive</div>
                    <div className="text-[10px] text-slate-400 truncate">executive@pileandloop.com</div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. SIGN UP / REQUEST ACCESS TAB */}
        {activeTab === 'signup' && (
          <form onSubmit={handleRequestSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={reqFullName}
                  onChange={(e) => setReqFullName(e.target.value)}
                  placeholder="e.g. Tariq Mahmood"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Corporate or Personal Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={reqEmail}
                  onChange={(e) => setReqEmail(e.target.value)}
                  placeholder="name@pileandloop.com"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={reqPassword}
                  onChange={(e) => setReqPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <select
                    value={reqDepartment}
                    onChange={(e) => setReqDepartment(e.target.value)}
                    className="w-full pl-9 pr-2 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 bg-white"
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="Design">Design</option>
                    <option value="Human Resources">Human Resources</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Operations">Operations</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Requested Role</label>
                <select
                  value={reqRole}
                  onChange={(e) => setReqRole(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 bg-white"
                >
                  <option value="TEAM_MEMBER">Team Member</option>
                  <option value="HR_INTERN">HR Intern</option>
                  <option value="HR_EXECUTIVE">HR Executive</option>
                  <option value="HR_SUPERVISOR">HR Supervisor</option>
                </select>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl text-xs transition mt-2 shadow-xs cursor-pointer"
            >
              <UserPlus className="w-4 h-4 mr-1.5" />
              {loading ? 'Submitting Request...' : 'Send Request to Super Admin'}
            </Button>
          </form>
        )}

        {/* Link to Public Careers Portal */}
        <div className="mt-5 pt-4 border-t border-slate-100 text-center">
          <Link
            to="/careers"
            className="text-xs text-sky-600 hover:text-sky-700 font-semibold inline-flex items-center gap-1 transition"
          >
            Looking for job & internship openings? <span className="underline">View Careers Portal &rarr;</span>
          </Link>
        </div>

      </div>
    </div>
  );
};
