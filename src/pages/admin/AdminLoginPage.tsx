import React, { useEffect, useState } from 'react';
import { ShieldCheck, Lock, Mail, User, ArrowLeft, KeyRound } from 'lucide-react';
import { api } from '../../utils/api';
import type { AdminUser } from '../../types/platform';

interface AdminLoginPageProps {
  onLoginSuccess: (token: string, admin: AdminUser) => void;
  onBackToSite: () => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({
  onLoginSuccess,
  onBackToSite,
}) => {
  const [statusLoading, setStatusLoading] = useState(true);
  const [envPasscodeActive, setEnvPasscodeActive] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);

  const [name, setName] = useState('Key2Show Administrator');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passcode, setPasscode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .getAdminBootstrapStatus()
      .then((res) => {
        setEnvPasscodeActive(res.envPasscodeActive);
        setNeedsSetup(res.needsFirstRunSetup);
      })
      .catch((err) => setError((err as Error).message))
      .finally(() => setStatusLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (needsSetup) {
        const res = await api.bootstrapAdmin({ name, email, password });
        onLoginSuccess(res.token, res.admin);
      } else if (envPasscodeActive) {
        const res = await api.loginAdmin({ passcode });
        onLoginSuccess(res.token, res.admin);
      } else {
        const res = await api.loginAdmin({ email, password });
        onLoginSuccess(res.token, res.admin);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050507] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl bg-[#0e0e13] border border-white/15 shadow-2xl p-6 sm:p-8 space-y-6">
        <button
          type="button"
          onClick={onBackToSite}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/65 hover:text-white cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Key2Show Storefront</span>
        </button>

        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#E50914]/15 border border-[#FF1822]/40 flex items-center justify-center text-[#FF252E]">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-extrabold text-white">
              {needsSetup ? 'Claim Admin Access' : 'Admin Operations Portal'}
            </h1>
            <p className="text-xs text-white/60">
              {needsSetup
                ? 'One-time initial setup for your Key2Show administrator account'
                : envPasscodeActive
                  ? 'Protected by environment ADMIN_PASSCODE'
                  : 'Sign in with your administrator credentials'}
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-[#2a1014] border border-[#FF242C]/60 px-4 py-3 text-xs text-[#FF8A8F]">
            {error}
          </div>
        )}

        {statusLoading ? (
          <p className="text-xs text-white/60 text-center py-6">Checking admin security status...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {needsSetup && (
              <div>
                <label className="text-[11px] font-semibold text-white/65 block mb-1">
                  Administrator Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-white/40 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#16161d] border border-white/15 text-xs text-white focus:border-[#FF1822] focus:outline-none"
                  />
                </div>
              </div>
            )}

            {envPasscodeActive && !needsSetup ? (
              <div>
                <label className="text-[11px] font-semibold text-white/65 block mb-1">
                  Administrator Passcode
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-white/40 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="Enter ADMIN_PASSCODE"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#16161d] border border-white/15 text-xs text-white focus:border-[#FF1822] focus:outline-none"
                  />
                </div>
              </div>
            ) : (
              <>
                <div>
                  <label className="text-[11px] font-semibold text-white/65 block mb-1">
                    Administrator Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-white/40 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@key2show.com"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#16161d] border border-white/15 text-xs text-white focus:border-[#FF1822] focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-white/65 block mb-1">
                    Password (min 6 chars)
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-white/40 absolute left-3 top-2.5" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter admin password"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#16161d] border border-white/15 text-xs text-white focus:border-[#FF1822] focus:outline-none"
                    />
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-full bg-gradient-to-r from-[#D90913] to-[#FF1F28] text-white text-xs font-bold shadow-[0_4px_18px_rgba(229,9,20,0.45)] hover:brightness-110 cursor-pointer"
            >
              {submitting
                ? 'Authenticating...'
                : needsSetup
                  ? 'Initialize & Open Admin Console'
                  : 'Sign In to Admin Console'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
