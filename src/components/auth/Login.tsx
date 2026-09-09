import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../common/Button';
import { Lock, Mail, ShieldAlert, UserPlus, CheckCircle2, Building, ShieldCheck, User } from 'lucide-react';
import { submitUserRequest } from '../../services/mock/auth';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  
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

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-900 p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 border border-slate-100">
        
        {/* Header Branding */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-md mb-2">
            P&L
          </div>
          <h2 className="text-xl font-bold text-slate-900">Pile & Loop HR System</h2>
          <p className="text-xs text-slate-500 mt-0.5">Internal Human Resources Operating Platform</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 mb-6">
          <button
            type="button"
            onClick={() => { setActiveTab('signin'); setError(''); }}
            className={`flex-1 py-2.5 text-xs font-semibold text-center border-b-2 transition-colors ${
              activeTab === 'signin'
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('signup'); setError(''); }}
            className={`flex-1 py-2.5 text-xs font-semibold text-center border-b-2 transition-colors ${
              activeTab === 'signup'
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Request Access (Sign Up)
          </button>
        </div>

        {/* Feedback Alerts */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-red-700 text-xs">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        )}

        {reqSuccess && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-2.5 text-emerald-800 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Access Request Submitted!</p>
              <p className="mt-0.5 text-emerald-700">
                Your request has been forwarded to the Super Admin (<strong>pileandloop@gmail.com</strong>). Once approved, your role will be activated and you can sign in.
              </p>
            </div>
          </div>
        )}

        {/* SIGN IN TAB */}
        {activeTab === 'signin' && (
          <div>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="pileandloop@gmail.com"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="????????"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-slate-800"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full justify-center bg-sky-600 hover:bg-sky-700 text-white font-medium py-2 rounded-lg text-xs transition"
              >
                {loading ? 'Authenticating...' : 'Sign In to Workspace'}
              </Button>
            </form>

            {/* Quick Fill Super Admin Card */}
            <div className="mt-6 pt-5 border-t border-slate-100">
              <div className="bg-sky-50 border border-sky-100 rounded-xl p-3.5 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-sky-900">
                    <ShieldCheck className="w-4 h-4 text-sky-600" />
                    Super Admin Credentials
                  </div>
                  <div className="text-[11px] text-sky-700 font-mono mt-1">
                    ID: <strong>pileandloop@gmail.com</strong>
                  </div>
                  <div className="text-[11px] text-sky-700 font-mono">
                    Pass: <strong>fourty420</strong>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('pileandloop@gmail.com', 'fourty420')}
                  disabled={loading}
                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                >
                  Quick Login
                </button>
              </div>

              {/* Other Roles Quick Switch */}
              <div className="mt-3">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Test Other Roles
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => fillCredentials('supervisor@pileandloop.com', 'fourty420')}
                    className="p-2 border border-slate-200 rounded-lg text-left hover:border-sky-300 hover:bg-slate-50 transition"
                  >
                    <div className="text-xs font-medium text-slate-800">HR Supervisor</div>
                    <div className="text-[10px] text-slate-500 truncate">supervisor@pileandloop.com</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => fillCredentials('executive@pileandloop.com', 'fourty420')}
                    className="p-2 border border-slate-200 rounded-lg text-left hover:border-sky-300 hover:bg-slate-50 transition"
                  >
                    <div className="text-xs font-medium text-slate-800">HR Executive</div>
                    <div className="text-[10px] text-slate-500 truncate">executive@pileandloop.com</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => fillCredentials('intern@pileandloop.com', 'fourty420')}
                    className="p-2 border border-slate-200 rounded-lg text-left hover:border-sky-300 hover:bg-slate-50 transition"
                  >
                    <div className="text-xs font-medium text-slate-800">HR Intern</div>
                    <div className="text-[10px] text-slate-500 truncate">intern@pileandloop.com</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => fillCredentials('member@pileandloop.com', 'fourty420')}
                    className="p-2 border border-slate-200 rounded-lg text-left hover:border-sky-300 hover:bg-slate-50 transition"
                  >
                    <div className="text-xs font-medium text-slate-800">Team Member</div>
                    <div className="text-[10px] text-slate-500 truncate">member@pileandloop.com</div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SIGN UP / REQUEST ACCESS TAB */}
        {activeTab === 'signup' && (
          <form onSubmit={handleRequestSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={reqFullName}
                  onChange={(e) => setReqFullName(e.target.value)}
                  placeholder="e.g. Tariq Mahmood"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={reqEmail}
                  onChange={(e) => setReqEmail(e.target.value)}
                  placeholder="name@pileandloop.com"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Create Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={reqPassword}
                  onChange={(e) => setReqPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Department</label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <select
                    value={reqDepartment}
                    onChange={(e) => setReqDepartment(e.target.value)}
                    className="w-full pl-9 pr-2 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 bg-white"
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
                <label className="block text-xs font-medium text-slate-700 mb-1">Requested Role</label>
                <select
                  value={reqRole}
                  onChange={(e) => setReqRole(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 bg-white"
                >
                  <option value="TEAM_MEMBER">Team Member</option>
                  <option value="HR_INTERN">HR Intern</option>
                  <option value="HR_EXECUTIVE">HR Executive</option>
                  <option value="HR_SUPERVISOR">HR Supervisor</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Purpose / Joining Reason (Optional)</label>
              <textarea
                rows={2}
                value={reqReason}
                onChange={(e) => setReqReason(e.target.value)}
                placeholder="e.g. Joined as Frontend Developer intern for Q3 batch."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 resize-none"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded-lg text-xs transition mt-2"
            >
              <UserPlus className="w-4 h-4 mr-1.5" />
              {loading ? 'Submitting Request...' : 'Send Request to Super Admin'}
            </Button>
            <p className="text-[11px] text-slate-400 text-center mt-1">
              Super Admin allocates and verifies all user roles before activation.
            </p>
          </form>
        )}

      </div>
    </div>
  );
};
