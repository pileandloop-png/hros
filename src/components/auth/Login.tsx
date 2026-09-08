import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { bootstrapSuperAdmin } from '../../services/api';
import { Button } from '../common/Button';
import { Lock, Mail, ShieldAlert, KeyRound } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isBootstrapMode, setIsBootstrapMode] = useState(false);
  const [bootstrapSecret, setBootstrapSecret] = useState('');
  const [bootstrapSuccess, setBootstrapSuccess] = useState('');

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

  const handleBootstrap = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBootstrapSuccess('');
    setLoading(true);
    try {
      const res: any = await bootstrapSuperAdmin(email, bootstrapSecret);
      setBootstrapSuccess(res.message || 'Super Admin bootstrapped! Now login with your credentials.');
      setIsBootstrapMode(false);
    } catch (err: any) {
      setError(err.message || 'Failed to bootstrap Super Admin account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-900 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 border border-slate-100">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-md mb-3">
            P&L
          </div>
          <h2 className="text-xl font-bold text-slate-900">Pile & Loop HR System</h2>
          <p className="text-xs text-slate-500 mt-1">Internal Human Resources Operating Platform</p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {bootstrapSuccess && (
          <div className="mb-6 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">
            {bootstrapSuccess}
          </div>
        )}

        {!isBootstrapMode ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Company Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="hr@pileandloop.com"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>
            </div>

            <Button type="submit" loading={loading} className="w-full mt-2">
              Sign In to HROS
            </Button>

            <div className="pt-4 border-t border-slate-100 flex justify-center">
              <button
                type="button"
                onClick={() => setIsBootstrapMode(true)}
                className="text-xs text-slate-500 hover:text-sky-600 flex items-center space-x-1 cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5 mr-1" />
                <span>First-time Initial Admin Bootstrap?</span>
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleBootstrap} className="space-y-4">
            <div className="p-3 bg-sky-50 rounded-lg text-xs text-sky-800 leading-relaxed">
              <strong>Super Admin Bootstrap:</strong> Designates the first Super Admin account in Firebase Auth with full system permissions.
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Admin Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@pileandloop.com"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Bootstrap Secret (Optional)</label>
              <input
                type="password"
                value={bootstrapSecret}
                onChange={(e) => setBootstrapSecret(e.target.value)}
                placeholder="Leave blank for initial setup"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            <Button type="submit" loading={loading} className="w-full mt-2">
              Bootstrap Super Admin
            </Button>

            <div className="pt-3 flex justify-center">
              <button
                type="button"
                onClick={() => setIsBootstrapMode(false)}
                className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                ← Back to Normal Sign In
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};