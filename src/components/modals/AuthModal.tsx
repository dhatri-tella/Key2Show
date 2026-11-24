import React, { useState } from 'react';
import {
  X,
  User,
  Lock,
  Smartphone,
  Mail,
  Users,
  CheckCircle2,
  KeyRound,
  ArrowRight,
} from 'lucide-react';
import { api } from '../../utils/api';
import { signInWithGooglePopup } from '../../lib/firebase';
import type { SafeUser } from '../../types/platform';

interface AuthModalProps {
  currentUser: SafeUser | null;
  onClose: () => void;
  onAuthSuccess: (token: string, user: SafeUser, firebaseIdToken?: string) => void;
  onLogout: () => void;
}

type TabMode = 'login' | 'signup' | 'reset';

const DEMO_FAMILY_ACCOUNTS = [
  { id: 'user-father', name: 'Ramesh Sharma', roleLabel: 'Father · Primary Booker', mobile: '+91 98480 11111' },
  { id: 'user-mother', name: 'Lakshmi Sharma', roleLabel: 'Mother · Shared Companion', mobile: '+91 98480 22222' },
  { id: 'user-daughter', name: 'Ananya Sharma', roleLabel: 'Daughter · Shared Companion', mobile: '+91 98480 33333' },
  { id: 'user-friend', name: 'Arjun Reddy', roleLabel: 'Friend · Shared Companion', mobile: '+91 98480 44444' },
];

export const AuthModal: React.FC<AuthModalProps> = ({
  currentUser,
  onClose,
  onAuthSuccess,
  onLogout,
}) => {
  const [tab, setTab] = useState<TabMode>('login');
  const [loginMethod, setLoginMethod] = useState<'password' | 'otp'>('password');

  // Login fields
  const [email, setEmail] = useState('ramesh@key2show.demo');
  const [password, setPassword] = useState('Key2ShowDemo#2026');
  const [mobile, setMobile] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [sandboxOtpHint, setSandboxOtpHint] = useState('');

  // Signup fields
  const [fullName, setFullName] = useState('');
  const [signupMobile, setSignupMobile] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [signupOtp, setSignupOtp] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(true);

  // Reset fields
  const [resetTarget, setResetTarget] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [resetNewPass, setResetNewPass] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  const handleSendOtp = async (target: string, purpose: 'LOGIN' | 'SIGNUP' | 'RESET') => {
    setError('');
    setStatusMsg('');
    if (!target.trim()) {
      setError('Enter a valid 10-digit mobile number or email.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.sendOtp(target, purpose);
      if (res.sandboxOtp) {
        setSandboxOtpHint(res.sandboxOtp);
        if (purpose === 'LOGIN') setOtpCode(res.sandboxOtp);
        if (purpose === 'SIGNUP') setSignupOtp(res.sandboxOtp);
        if (purpose === 'RESET') setResetOtp(res.sandboxOtp);
        setStatusMsg(`Verification OTP sent to ${res.target} (Preview OTP: ${res.sandboxOtp})`);
      } else {
        setStatusMsg(`OTP sent to ${res.target}`);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.login(
        loginMethod === 'password'
          ? { mode: 'password', email, password }
          : { mode: 'otp', mobile, otpCode }
      );
      onAuthSuccess(res.token, res.user);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.signup({
        name: fullName,
        mobile: signupMobile,
        email: signupEmail,
        password: signupPassword,
        confirmPassword,
        otpCode: signupOtp,
        acceptedTerms,
      });
      onAuthSuccess(res.token, res.user);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.resetPassword({
        target: resetTarget,
        otpCode: resetOtp,
        newPassword: resetNewPass,
      });
      setStatusMsg('Password updated! You can now sign in with your new password.');
      setTab('login');
      setLoginMethod('password');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSwitch = async (userId: string) => {
    setError('');
    setLoading(true);
    try {
      const res = await api.demoSwitch(userId);
      onAuthSuccess(res.token, res.user);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const fbUser = await signInWithGooglePopup();
      const exchanged = await api.firebaseExchange(fbUser.idToken);
      onAuthSuccess(exchanged.token, exchanged.user, fbUser.idToken);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Key2Show Account Authentication"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto"
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-[#0e0e12] border border-white/15 shadow-2xl p-6 my-8">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close authentication modal"
          className="absolute right-4 top-4 p-2 rounded-full bg-black/60 border border-white/15 text-white/80 hover:text-white hover:border-[#FF1822] cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 pr-8">
          <div className="w-10 h-10 rounded-xl bg-[#E50914]/15 border border-[#FF1822]/40 flex items-center justify-center text-[#FF252E]">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-white">
              {currentUser ? `Account: ${currentUser.name}` : 'Key2Show Account'}
            </h2>
            <p className="text-xs text-white/60">
              Instant QR passes, family ticket sharing & food pre-orders
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="mt-4 w-full py-2.5 rounded-xl bg-white text-[#0d0d10] hover:bg-neutral-100 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer min-h-[44px]"
        >
          <span>Continue with Google (Sync AI Chats & Saved Venues)</span>
        </button>

        {/* Mode Switcher */}
        <div className="mt-3 grid grid-cols-3 gap-1.5 bg-[#16161c] p-1 rounded-xl border border-white/10">
          {([
            ['login', 'Sign In'],
            ['signup', 'Create Account'],
            ['reset', 'Reset Password'],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setTab(id);
                setError('');
                setStatusMsg('');
              }}
              className={`py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                tab === id ? 'bg-[#E50914] text-white' : 'text-white/70 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mt-3 rounded-xl bg-[#2a1014] border border-[#FF242C]/50 px-3.5 py-2.5 text-xs text-[#FF8A8F]">
            {error}
          </div>
        )}
        {statusMsg && (
          <div className="mt-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 px-3.5 py-2.5 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}

        {/* TAB 1: LOGIN */}
        {tab === 'login' && (
          <form onSubmit={handleLoginSubmit} className="mt-4 space-y-3.5">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setLoginMethod('password')}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold border cursor-pointer ${
                  loginMethod === 'password'
                    ? 'bg-white/10 border-[#FF1822] text-white'
                    : 'bg-[#15151a] border-white/10 text-white/65'
                }`}
              >
                Email + Password
              </button>
              <button
                type="button"
                onClick={() => setLoginMethod('otp')}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold border cursor-pointer ${
                  loginMethod === 'otp'
                    ? 'bg-white/10 border-[#FF1822] text-white'
                    : 'bg-[#15151a] border-white/10 text-white/65'
                }`}
              >
                Mobile + OTP
              </button>
            </div>

            {loginMethod === 'password' ? (
              <>
                <div>
                  <label className="text-[11px] font-semibold text-white/65 block mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-white/40 absolute left-3 top-3" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="you@example.com"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#15151a] border border-white/15 text-sm text-white focus:border-[#FF1822] focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-white/65 block mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-white/40 absolute left-3 top-3" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="Enter your password"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#15151a] border border-white/15 text-sm text-white focus:border-[#FF1822] focus:outline-none"
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="text-[11px] font-semibold text-white/65 block mb-1">
                    10-Digit Mobile Number
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Smartphone className="w-4 h-4 text-white/40 absolute left-3 top-3" />
                      <input
                        type="tel"
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                        required
                        placeholder="98480 22222"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#15151a] border border-white/15 text-sm text-white focus:border-[#FF1822] focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleSendOtp(mobile, 'LOGIN')}
                      className="px-4 py-2 rounded-xl bg-[#1f1f27] border border-white/15 hover:border-[#FF1822] text-xs font-bold text-white whitespace-nowrap cursor-pointer"
                    >
                      Send OTP
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-white/65 block mb-1">
                    6-Digit OTP {sandboxOtpHint ? `(Preview: ${sandboxOtpHint})` : ''}
                  </label>
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    required
                    placeholder="Enter 6-digit OTP"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#15151a] border border-white/15 text-sm text-white focus:border-[#FF1822] focus:outline-none"
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-full bg-gradient-to-r from-[#D90913] to-[#FF1F28] text-white text-sm font-bold shadow-[0_4px_16px_rgba(229,9,20,0.4)] hover:brightness-110 cursor-pointer flex items-center justify-center gap-2"
            >
              <span>{loading ? 'Signing In...' : 'Sign In to Key2Show'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* TAB 2: SIGNUP */}
        {tab === 'signup' && (
          <form onSubmit={handleSignupSubmit} className="mt-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-white/65 block mb-1">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="Priya Nair"
                  className="w-full px-3 py-2 rounded-xl bg-[#15151a] border border-white/15 text-sm text-white focus:border-[#FF1822] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-white/65 block mb-1">Email</label>
                <input
                  type="email"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  required
                  placeholder="priya@example.com"
                  className="w-full px-3 py-2 rounded-xl bg-[#15151a] border border-white/15 text-sm text-white focus:border-[#FF1822] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-white/65 block mb-1">Mobile Number</label>
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={signupMobile}
                  onChange={(e) => setSignupMobile(e.target.value)}
                  required
                  placeholder="9876543210"
                  className="flex-1 px-3 py-2 rounded-xl bg-[#15151a] border border-white/15 text-sm text-white focus:border-[#FF1822] focus:outline-none"
                />
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleSendOtp(signupMobile, 'SIGNUP')}
                  className="px-4 py-2 rounded-xl bg-[#1f1f27] border border-white/15 hover:border-[#FF1822] text-xs font-bold text-white cursor-pointer"
                >
                  Send OTP
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="text-[11px] font-semibold text-white/65 block mb-1">OTP Code</label>
                <input
                  type="text"
                  value={signupOtp}
                  onChange={(e) => setSignupOtp(e.target.value)}
                  required
                  placeholder="6-digit OTP"
                  className="w-full px-3 py-2 rounded-xl bg-[#15151a] border border-white/15 text-sm text-white focus:border-[#FF1822] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-white/65 block mb-1">Password</label>
                <input
                  type="password"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Min 6 chars"
                  className="w-full px-3 py-2 rounded-xl bg-[#15151a] border border-white/15 text-sm text-white focus:border-[#FF1822] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-white/65 block mb-1">Confirm</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Repeat password"
                  className="w-full px-3 py-2 rounded-xl bg-[#15151a] border border-white/15 text-sm text-white focus:border-[#FF1822] focus:outline-none"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-white/75 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="accent-[#E50914]"
              />
              <span>I accept the Key2Show Terms & Conditions and Privacy Policy.</span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-full bg-gradient-to-r from-[#D90913] to-[#FF1F28] text-white text-sm font-bold cursor-pointer hover:brightness-110"
            >
              {loading ? 'Creating Account...' : 'Verify OTP & Create Account'}
            </button>
          </form>
        )}

        {/* TAB 3: FORGOT PASSWORD */}
        {tab === 'reset' && (
          <form onSubmit={handleResetSubmit} className="mt-4 space-y-3">
            <div>
              <label className="text-[11px] font-semibold text-white/65 block mb-1">
                Registered Email or Mobile
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={resetTarget}
                  onChange={(e) => setResetTarget(e.target.value)}
                  required
                  placeholder="ramesh@key2show.demo or 9848011111"
                  className="flex-1 px-3 py-2 rounded-xl bg-[#15151a] border border-white/15 text-sm text-white focus:border-[#FF1822] focus:outline-none"
                />
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleSendOtp(resetTarget, 'RESET')}
                  className="px-4 py-2 rounded-xl bg-[#1f1f27] border border-white/15 hover:border-[#FF1822] text-xs font-bold text-white cursor-pointer"
                >
                  Send Reset OTP
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-white/65 block mb-1">Reset OTP</label>
                <input
                  type="text"
                  value={resetOtp}
                  onChange={(e) => setResetOtp(e.target.value)}
                  required
                  placeholder="6-digit OTP"
                  className="w-full px-3 py-2 rounded-xl bg-[#15151a] border border-white/15 text-sm text-white focus:border-[#FF1822] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-white/65 block mb-1">New Password</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-white/40 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    value={resetNewPass}
                    onChange={(e) => setResetNewPass(e.target.value)}
                    required
                    minLength={6}
                    placeholder="New password"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#15151a] border border-white/15 text-sm text-white focus:border-[#FF1822] focus:outline-none"
                  />
                </div>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-full bg-gradient-to-r from-[#D90913] to-[#FF1F28] text-white text-sm font-bold cursor-pointer hover:brightness-110"
            >
              Update Password
            </button>
          </form>
        )}

        {/* Quick Demo Family Account Switcher */}
        <div className="mt-5 pt-4 border-t border-white/10">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/60 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[#FF252E]" />
              <span>Demo Family Switcher (Companion Testing)</span>
            </p>
            {currentUser && (
              <button
                type="button"
                onClick={() => {
                  onLogout();
                  onClose();
                }}
                className="text-[11px] text-[#FF4952] hover:underline cursor-pointer"
              >
                Sign Out
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {DEMO_FAMILY_ACCOUNTS.map((acc) => {
              const isCurrent = currentUser?.id === acc.id;
              return (
                <button
                  key={acc.id}
                  type="button"
                  disabled={loading}
                  onClick={() => handleDemoSwitch(acc.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-[#251013] border-[#FF1822] text-white'
                      : 'bg-[#15151a] border-white/10 hover:border-white/30 text-white/85'
                  }`}
                >
                  <p className="text-xs font-bold">{acc.name}</p>
                  <p className="text-[10.5px] text-white/55">{acc.roleLabel}</p>
                  <p className="text-[10.5px] text-white/45 font-mono mt-0.5">{acc.mobile}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
